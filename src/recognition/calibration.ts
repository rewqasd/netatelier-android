import type {Calibration,DraftEdits,Floor,Issue,RecognitionDraft,Vec2} from '../domain/model';
import {containsPoint,distance,distanceToSegment,polygonArea,segmentsIntersect} from '../domain/geometry';
const unset=():Calibration=>({kind:'unset',metersPerPixel:null,originPx:{x:0,y:0},angleRad:0});
/** Match the correction validator's eight-original-pixel edge tolerance. */
export function snapOpening(point:Vec2,polygons:Vec2[][]):Vec2{
 let best=point,nearest=8;
 for(const polygon of polygons)for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dy=b.y-a.y,squared=dx*dx+dy*dy;if(!squared)continue;
  const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/squared)),candidate={x:a.x+t*dx,y:a.y+t*dy},gap=distance(point,candidate);
  if(gap<=nearest){nearest=gap;best=candidate;}
 }
 return best;
}
export function knownLength(a:Vec2,b:Vec2,metres:number):Calibration {
  const length=distance(a,b),scale=metres/length;
  return length>1&&Number.isFinite(scale)&&scale>0&&scale<=1000?{kind:'known-length',metersPerPixel:scale,originPx:{x:0,y:0},angleRad:0}:unset();
}
export function areaCalibration(boundary:Vec2[],areaM2:number):Calibration {
  const scale=Math.sqrt(areaM2/polygonArea(boundary));
  return areaM2>0&&Number.isFinite(scale)&&scale>0&&scale<=1000?{kind:'approximate-area',metersPerPixel:scale,originPx:{x:0,y:0},angleRad:0}:unset();
}
export function calibrationIssues(c:Calibration):Issue[]{
  if(c.kind==='unset'||!c.metersPerPixel||!Number.isFinite(c.metersPerPixel)||c.metersPerPixel<0)return [{code:'MISSING_SCALE',severity:'blocking',message:'缺少有效标尺，不提供精确线路米数或完整施工报价。',entityIds:[]}];
  return c.kind==='approximate-area'?[{code:'APPROXIMATE_SCALE',severity:'warning',message:'仅按面积近似缩放，尺寸与工程米数须现场核实。',entityIds:[]}]:[];
}
export function assertPolygon(poly:Vec2[]):void{
  if(poly.length<3||poly.length>1024||poly.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||polygonArea(poly)<1)throw new Error('多边形至少需要3个有效顶点且面积不为零');
  for(let i=0;i<poly.length;i++)for(let j=i+1;j<poly.length;j++){
    if(j===i+1||(i===0&&j===poly.length-1))continue;
    if(segmentsIntersect(poly[i],poly[(i+1)%poly.length],poly[j],poly[(j+1)%poly.length]))throw new Error('多边形边线交叉，请校正顶点顺序');
  }
}
const edgeDistance=(p:Vec2,poly:Vec2[])=>Math.min(...poly.map((v,i)=>distanceToSegment(p,v,poly[(i+1)%poly.length])));
const interior=(p:Vec2,poly:Vec2[])=>containsPoint(p,poly)&&edgeDistance(p,poly)>1e-6;
function overlapping(a:Vec2[],b:Vec2[]):boolean{
  if(a.some(p=>interior(p,b))||b.some(p=>interior(p,a)))return true;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
    const a1=a[i],a2=a[(i+1)%a.length],b1=b[j],b2=b[(j+1)%b.length];
    if(segmentsIntersect(a1,a2,b1,b2)&&[distanceToSegment(a1,b1,b2),distanceToSegment(a2,b1,b2),distanceToSegment(b1,a1,a2),distanceToSegment(b2,a1,a2)].every(d=>d>1e-6))return true;
  }
  // Coincident polygon edges need an interior probe, not a vertex-only check.
  for(const poly of [a,b])for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length],len=distance(p,q);if(len<1e-6)continue;
    for(const sign of [-1,1]){const sample={x:(p.x+q.x)/2+sign*(q.y-p.y)/len*.01,y:(p.y+q.y)/2-sign*(q.x-p.x)/len*.01};if(interior(sample,a)&&interior(sample,b))return true;}
  }
  return false;
}
export function calibrateDraft(draft:RecognitionDraft,calibration:Calibration,edits:DraftEdits):Floor {
  const blocking=calibrationIssues(calibration).find(i=>i.severity==='blocking');if(blocking)throw new Error(blocking.message);
  assertPolygon(edits.boundaryPx);
  if(!edits.roomsPx.length)throw new Error('至少需要确认一个房间');
  const inBoundary=(p:Vec2)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&containsPoint(p,edits.boundaryPx);
  for(const r of edits.roomsPx){assertPolygon(r.polygon);if(!r.polygon.every(inBoundary))throw new Error('房间超出建筑边界');if(!r.confirmed)throw new Error('请逐一确认房间范围和用途');if(!r.name.trim())throw new Error('房间需要名称');}
  for(let i=0;i<edits.roomsPx.length;i++)for(let j=i+1;j<edits.roomsPx.length;j++)if(overlapping(edits.roomsPx[i].polygon,edits.roomsPx[j].polygon))throw new Error('房间范围重叠，请先调整边界');
  for(const w of edits.wallsPx)if(!w.confirmed)throw new Error('请确认或删除待定墙线');
  for(const o of edits.openingsPx){
    if(!o.confirmed||!Number.isFinite(o.widthPx)||o.widthPx<=0)throw new Error('请确认门洞及其有效宽度');
    if(!inBoundary(o.at)||o.roomIds.length<1||o.roomIds.length>2||o.roomIds.some(id=>!edits.roomsPx.some(r=>r.id===id)))throw new Error('门洞必须引用有效房间且位于边界内');
    if(o.roomIds.some(id=>edgeDistance(o.at,edits.roomsPx.find(r=>r.id===id)!.polygon)>8))throw new Error('门洞位置必须贴近所连接房间的边界（8像素内）');
  }
  for(const t of edits.targetsPx){
    if(!t.confirmed||!edits.roomsPx.some(r=>r.id===t.roomId&&containsPoint(t.at,r.polygon)))throw new Error('监控目标须确认且位于对应房间内');
    if(edits.roomsPx.some(r=>r.id===t.roomId&&['guest','toilet','changing','shower'].includes(r.use)))throw new Error('隐私区不允许监控目标，请移除该目标');
  }
  if(!edits.cabinetPx||!edits.wanPx)throw new Error('请标记机柜与宽带入口位置');
  if(!inBoundary(edits.cabinetPx)||!inBoundary(edits.wanPx))throw new Error('机柜或宽带入口超出建筑边界');
  const s=calibration.metersPerPixel!,cos=Math.cos(calibration.angleRad),sin=Math.sin(calibration.angleRad);
  const metric=(p:Vec2)=>{const x=(p.x-calibration.originPx.x)*s,y=(p.y-calibration.originPx.y)*s;return {x:x*cos-y*sin,y:x*sin+y*cos};};
  const id=`floor-${crypto.randomUUID()}`,ref=(value:string)=>`${id}:${value}`;
  return {id,name:`导入第${draft.document.page+1}页`,elevationM:0,document:structuredClone(draft.document),calibration:structuredClone(calibration),boundary:edits.boundaryPx.map(metric),
    rooms:edits.roomsPx.map(({provenance,...r})=>({...r,id:ref(r.id),polygon:r.polygon.map(metric)})),
    walls:edits.wallsPx.map(({provenance,...w})=>({...w,id:ref(w.id),from:metric(w.from),to:metric(w.to)})),
    openings:edits.openingsPx.map(({provenance,widthPx,...o})=>({...o,id:ref(o.id),roomIds:o.roomIds.map(ref),widthM:widthPx*s,at:metric(o.at)})),
    targets:edits.targetsPx.map(t=>({...t,id:ref(t.id),roomId:ref(t.roomId),at:metric(t.at)})),
    devices:[{id:ref('cabinet'),floorId:id,kind:'cabinet',label:'机柜',positionM:metric(edits.cabinetPx),locked:true,source:'manual'},{id:ref('wan'),floorId:id,kind:'wan',label:'宽带入口',positionM:metric(edits.wanPx),locked:true,source:'manual'}],
    demand:{employees:0,visitors:0,concurrentUsers:0,terminals:0,wiredPoints:0},cables:[],notes:calibration.kind==='approximate-area'?'按面积近似缩放；尺寸须现场复核':'人工校正的导入图纸；需填写业务需求'};
}
