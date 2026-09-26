import type {DocumentPage,OcrText,RecognitionDraft,Vec2,RoomUse} from '../domain/model';
import {containsPoint,distanceToSegment,polygonArea} from '../domain/geometry';
export interface PixelInput {document:DocumentPage;pixels:Uint8ClampedArray;text:OcrText[]}
function simplify(points:Vec2[],epsilon:number):Vec2[]{
  if(points.length<3)return points;
  let max=0,index=0;
  for(let i=1;i<points.length-1;i++){const d=distanceToSegment(points[i],points[0],points[points.length-1]);if(d>max){max=d;index=i;}}
  if(max<=epsilon)return [points[0],points[points.length-1]];
  return [...simplify(points.slice(0,index+1),epsilon).slice(0,-1),...simplify(points.slice(index),epsilon)];
}
function simplifyRing(points:Vec2[]):Vec2[]{
  let far=1;
  for(let i=2;i<points.length;i++)if(Math.hypot(points[i].x-points[0].x,points[i].y-points[0].y)>Math.hypot(points[far].x-points[0].x,points[far].y-points[0].y))far=i;
  return [...simplify(points.slice(0,far+1),1.6).slice(0,-1),...simplify([...points.slice(far),points[0]],1.6).slice(0,-1)];
}
function hull(points:Vec2[]):Vec2[]{
  const sorted=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y),lower:Vec2[]=[],upper:Vec2[]=[];
  const turn=(a:Vec2,b:Vec2,c:Vec2)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  for(const p of sorted){while(lower.length>1&&turn(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);}
  for(const p of sorted.reverse()){while(upper.length>1&&turn(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);}
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
function useFromText(text:string):RoomUse{
  const pairs:[RegExp,RoomUse][]=[[/卫生|厕所|洗手|toilet/i,'toilet'],[/更衣|changing/i,'changing'],[/淋浴|shower/i,'shower'],[/客房|guest/i,'guest'],[/会议|meeting/i,'meeting'],[/厨房|后厨|kitchen/i,'kitchen'],[/收银|cashier/i,'cashier'],[/机房|弱电|equipment/i,'equipment'],[/走廊|通道|corridor/i,'corridor'],[/入口|门厅|entrance/i,'entrance'],[/办公|office/i,'office'],[/仓|库|storage/i,'storage']];
  return pairs.find(([pattern])=>pattern.test(text))?.[1]??'public';
}
export function extractGeometry(input:PixelInput):RecognitionDraft{
  const {document,pixels,text}=input,sw=document.widthPx,sh=document.heightPx;
  if(!Number.isInteger(sw)||!Number.isInteger(sh)||sw<=0||sh<=0||sw>2400||sh>2400||pixels.length!==sw*sh*4)throw new Error('页面像素数据无效或超过2400px处理上限');
  // Bound worker memory independently of the native import limit.
  const scale=Math.max(1,Math.max(sw,sh)/1200),w=Math.round(sw/scale),h=Math.round(sh/scale),n=w*h;
  const ink=new Uint8Array(n);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(Math.min(sh-1,Math.round(y*scale))*sw+Math.min(sw-1,Math.round(x*scale)))*4;
    const alpha=pixels[i+3]/255,lum=(.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2])*alpha+255*(1-alpha);
    ink[y*w+x]=lum<170?1:0;
  }
  // Real OCR boxes mask glyphs only. Text never creates wall/room geometry.
  for(const word of text){
    const b=word.boxPx;
    if(![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<0||b.height<0)continue;
    for(let y=Math.max(0,Math.floor(b.y/scale)-1);y<Math.min(h,Math.ceil((b.y+b.height)/scale)+1);y++)
      for(let x=Math.max(0,Math.floor(b.x/scale)-1);x<Math.min(w,Math.ceil((b.x+b.width)/scale)+1);x++)ink[y*w+x]=0;
  }
  // A one-pixel closing repairs scan pinholes, not normal-sized doorway gaps.
  const dilated=new Uint8Array(n),closed=new Uint8Array(n);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(ink[(y+dy)*w+x+dx])dilated[y*w+x]=1;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    let all=1;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)all&=dilated[(y+dy)*w+x+dx];closed[y*w+x]=all;
  }
  const labels=new Int32Array(n),queue=new Int32Array(n),draft:RecognitionDraft={document:structuredClone(document),text:structuredClone(text),boundaryPx:[],wallsPx:[],roomsPx:[],openingsPx:[],issues:[]};
  let component=0;
  for(let seed=0;seed<n;seed++){
    if(closed[seed]||labels[seed])continue;
    component++;let head=0,tail=1,border=false;queue[0]=seed;labels[seed]=component;
    while(head<tail){
      const at=queue[head++],x=at%w,y=Math.floor(at/w);if(x===0||y===0||x===w-1||y===h-1)border=true;
      const visit=(next:number)=>{if(!closed[next]&&!labels[next]){labels[next]=component;queue[tail++]=next;}};
      if(x>0)visit(at-1);if(x<w-1)visit(at+1);if(y>0)visit(at-w);if(y<h-1)visit(at+w);
    }
    if(border||tail<Math.max(50,n*.001))continue;
    if(draft.roomsPx.length>=100){draft.issues.push({code:'REGION_LIMIT',severity:'blocking',message:'候选区域超过100个，请裁切图纸或人工校正。',entityIds:[]});break;}
    // Trace directed pixel edges; choose the exterior loop, ignoring tiny ink holes.
    const edges=new Map<number,number[]>(),stride=w+1;
    const edge=(a:number,b:number)=>{const next=edges.get(a)??[];next.push(b);edges.set(a,next);};
    for(let i=0;i<tail;i++){
      const at=queue[i],x=at%w,y=Math.floor(at/w),v=y*stride+x;
      if(labels[at-w]!==component)edge(v,v+1);
      if(labels[at+1]!==component)edge(v+1,v+1+stride);
      if(labels[at+w]!==component)edge(v+1+stride,v+stride);
      if(labels[at-1]!==component)edge(v+stride,v);
    }
    let outline:Vec2[]=[],largest=0;
    while(edges.size){
      const first=edges.keys().next().value!,ring:Vec2[]=[];let current=first;
      for(let guard=0;guard<n*4;guard++){
        ring.push({x:current%stride,y:Math.floor(current/stride)});
        const next=edges.get(current);if(!next?.length)break;
        const to=next.pop()!;if(next.length===0)edges.delete(current);current=to;if(current===first)break;
      }
      const area=polygonArea(ring);if(area>largest){largest=area;outline=ring;}
    }
    const polygon=simplifyRing(outline).map(p=>({x:p.x*scale,y:p.y*scale}));
    if(polygon.length<3)continue;
    const words=text.filter(t=>containsPoint({x:t.boxPx.x+t.boxPx.width/2,y:t.boxPx.y+t.boxPx.height/2},polygon));
    const name=words.map(t=>t.text).join(' ').trim()||`待确认区域${draft.roomsPx.length+1}`,use=useFromText(name);
    draft.roomsPx.push({id:`region-${draft.roomsPx.length+1}`,name:name.slice(0,160),use,polygon,confirmed:false,provenance:'geometry',needsWifi:!['toilet','shower','equipment','storage'].includes(use)});
    polygon.forEach((from,i)=>draft.wallsPx.push({id:`wall-${draft.wallsPx.length+1}`,from,to:polygon[(i+1)%polygon.length],material:'unknown',confirmed:false,provenance:'geometry'}));
  }
  draft.boundaryPx=draft.roomsPx.length===1?structuredClone(draft.roomsPx[0].polygon):hull(draft.roomsPx.flatMap(r=>r.polygon));
  if(!draft.roomsPx.length)draft.issues.push({code:'NO_ENCLOSED_REGIONS',severity:'blocking',message:'没有恢复出封闭房间，请在原图上绘制边界与房间。未替换为演示户型。',entityIds:[]});
  else draft.issues.push({code:'GEOMETRY_CANDIDATES',severity:'warning',message:'墙线是像素内侧轮廓候选；外边界为候选包络。门洞、隐私用途和所有边界须人工确认。',entityIds:draft.roomsPx.map(r=>r.id)});
  return draft;
}
