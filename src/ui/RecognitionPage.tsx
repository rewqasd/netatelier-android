import {useEffect,useRef,useState} from 'react';
import type {Calibration,DraftEdits,Floor,RecognitionDraft,Vec2} from '../domain/model';
import {containsPoint,interiorLabelPoint} from '../domain/geometry';
import type {ImportedPage} from './ImportPage';
import {localImageUrl} from '../recognition/native';
import {readRaster,recognizeDocument} from '../recognition/recognize-document';
import {createDraftEdits,LatestJob} from '../recognition/draft';
import {calibrateDraft,assertPolygon,snapOpening} from '../recognition/calibration';
import {CalibrationPanel} from './CalibrationPanel';
import {PolygonEditor,RoomEditor} from './RoomEditor';
type Tool='inspect'|'boundary'|'room'|'wall'|'cabinet'|'wan'|'door'|'target'|'scale';
const path=(points:Vec2[])=>points.map(p=>`${p.x},${p.y}`).join(' ');
export function RecognitionPage({imported,onConfirm,onCancel}:{imported:ImportedPage;onConfirm:(floor:Floor)=>void;onCancel:()=>void}){
  const [draft,setDraft]=useState<RecognitionDraft>(),[edits,setEdits]=useState<DraftEdits>();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [tool,setTool]=useState<Tool>('inspect'),[points,setPoints]=useState<Vec2[]>([]),[roomId,setRoomId]=useState<string>();
  const [marks,setMarks]=useState<Vec2[]>([]),[zoom,setZoom]=useState(1),[canvasWidth,setCanvasWidth]=useState(320);
  const viewport=useRef<HTMLDivElement>(null);
  const [calibration,setCalibration]=useState<Calibration>({kind:'unset',metersPerPixel:null,originPx:{x:0,y:0},angleRad:0});
  const jobs=useRef(new LatestJob());const doc=imported.raster.document,url=localImageUrl(imported.raster.uri);
  async function run(){
    setBusy(true);setError('');
    try{const result=await jobs.current.run(async signal=>recognizeDocument({document:doc,text:imported.text,pixels:await readRaster(url,signal)},signal));if(result){setDraft(result);setEdits(createDraftEdits(result));setTool('inspect');setPoints([]);}}
    catch(e){setError(e instanceof Error?e.message:'图形识别失败，可返回重试');}
    finally{setBusy(jobs.current.isRunning);}
  }
  useEffect(()=>{void run();return()=>jobs.current.cancel();},[imported]);
  useEffect(()=>{if(!viewport.current)return;const observer=new ResizeObserver(entries=>setCanvasWidth(entries[0].contentRect.width));observer.observe(viewport.current);return()=>observer.disconnect();},[!!edits]);
  const symbolScale=doc.widthPx/Math.max(1,canvasWidth*zoom);
  const choose=(next:Tool)=>{setTool(next);setPoints([]);setRoomId(undefined);setError('');};
  function mark(p:Vec2){
    if(!edits||busy||tool==='inspect')return;
    if(tool==='cabinet'||tool==='wan'){setEdits({...edits,[tool==='cabinet'?'cabinetPx':'wanPx']:p});setTool('inspect');return;}
    if(tool==='scale'){const selected=[...points,p];setPoints(selected);if(selected.length===2){setMarks(selected);setTool('inspect');}return;}
    if(tool==='door'){
      if(!edits.roomsPx.length){setError('请先建立房间，再指定门连接的房间');return;}
      const at=snapOpening(p,[edits.boundaryPx,...edits.roomsPx.map(r=>r.polygon)]);
      setEdits({...edits,openingsPx:[...edits.openingsPx,{id:`door-${crypto.randomUUID()}`,at,roomIds:[edits.roomsPx[0].id],widthPx:20,entrance:false,confirmed:false,provenance:'manual'}]});setTool('inspect');return;
    }
    if(tool==='target'){
      const room=edits.roomsPx.find(r=>containsPoint(p,r.polygon));if(!room){setError('监控目标必须在某个房间内');return;}
      if(['guest','toilet','changing','shower'].includes(room.use)){setError('隐私区不能添加监控目标');return;}
      setEdits({...edits,targetsPx:[...edits.targetsPx,{id:`target-${crypto.randomUUID()}`,roomId:room.id,at:p,kind:'public',weight:1,confirmed:true}]});setTool('inspect');return;
    }
    const selected=[...points,p];setPoints(selected);
    if(tool==='wall'&&selected.length===2){setEdits({...edits,wallsPx:[...edits.wallsPx,{id:`wall-${crypto.randomUUID()}`,from:selected[0],to:selected[1],material:'unknown',confirmed:true,provenance:'manual'}]});setPoints([]);setTool('inspect');}
  }
  function finishPolygon(){
    if(!edits)return;try{assertPolygon(points);}catch(e){setError((e as Error).message);return;}
    if(tool==='boundary')setEdits({...edits,boundaryPx:points});
    else if(roomId)setEdits({...edits,roomsPx:edits.roomsPx.map(r=>r.id===roomId?{...r,polygon:points,confirmed:false,provenance:'manual'}:r)});
    else setEdits({...edits,roomsPx:[...edits.roomsPx,{id:`room-${crypto.randomUUID()}`,name:'新建房间',use:'public',polygon:points,confirmed:false,provenance:'manual'}]});
    setPoints([]);setTool('inspect');
  }
  function apply(){if(!draft||!edits)return;setError('');try{onConfirm(calibrateDraft(draft,calibration,edits));}catch(e){setError(e instanceof Error?e.message:'校正尚不完整');}}
  return <section className="recognition-editor"><div className="control-row"><h2>图纸校正</h2><button onClick={()=>{jobs.current.cancel();onCancel();}}>返回导入</button></div>
    <p className="muted">自动结果只是候选。先核对边界、房间用途和门，再标机柜、宽带入口及监控目标；最后设置比例。普通点击不会添加任何设备。</p>
    {busy&&<p role="status">正在本地提取墙线与封闭区域… <button onClick={()=>{jobs.current.cancel();setBusy(false);}}>取消识图</button></p>}
    {error&&<p role="alert" className="notice">{error}</p>}
    {draft?.issues.map(i=><p className="notice" key={i.code}>{i.message}</p>)}
    {edits&&<>
      <div className="control-row editor-tools">{([['inspect','查看'],['boundary','重画建筑边界'],['room','绘制房间'],['wall','补墙线'],['cabinet','标记机柜'],['wan','标记宽带入口'],['door','添加门/通道'],['target','添加监控目标']] as [Tool,string][]).map(([value,label])=><button aria-pressed={tool===value} key={value} onClick={()=>choose(value)}>{label}</button>)}<button onClick={()=>setZoom(Math.min(4,zoom+.5))}>放大原图</button><button onClick={()=>setZoom(1)}>适应宽度</button></div>
      <p className="muted">{tool==='inspect'?'查看模式；可滚动放大后的原图。':tool==='boundary'||tool==='room'?'依次点选多边形顶点，然后完成绘制。':tool==='scale'||tool==='wall'?'在图上依次点两个端点。':tool==='door'?'点击门洞；距房间或建筑边界8个原图像素内会吸附到最近边界，仍需确认连接房间。':'在原图上点击标记位置。'}</p>
      <div className="correction-viewport" ref={viewport}><svg role="img" aria-label="原图与待确认几何" style={{width:`${zoom*100}%`,touchAction:tool==='inspect'?'auto':'none'}} viewBox={`0 0 ${doc.widthPx} ${doc.heightPx}`} onClick={event=>{const matrix=event.currentTarget.getScreenCTM();if(!matrix)return;const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());mark({x:p.x,y:p.y});}}>
        <image href={url} width={doc.widthPx} height={doc.heightPx}/>
        {edits.roomsPx.map((r,i)=>{const anchor=interiorLabelPoint(r.polygon);return <g key={r.id}><title>{i+1} · {r.name}</title><polygon points={path(r.polygon)} fill={r.confirmed?'#14875f22':'#d9922022'} stroke={r.confirmed?'#14875f':'#c68315'} strokeWidth={1.5} vectorEffect="non-scaling-stroke"/><circle cx={anchor.x} cy={anchor.y} r={10*symbolScale} fill="white" stroke="#436859" vectorEffect="non-scaling-stroke"/><text x={anchor.x} y={anchor.y+4*symbolScale} textAnchor="middle" fontSize={12*symbolScale}>{i+1}</text></g>;})}
        <polygon points={path(edits.boundaryPx)} fill="none" stroke="#186abd" strokeDasharray="5 3" vectorEffect="non-scaling-stroke"/>
        {edits.wallsPx.map(w=><line key={w.id} x1={w.from.x} y1={w.from.y} x2={w.to.x} y2={w.to.y} stroke="#4c6e87" strokeWidth={1} vectorEffect="non-scaling-stroke"/>)}
        {edits.openingsPx.map(o=><circle key={o.id} cx={o.at.x} cy={o.at.y} r={5} fill="#fff" stroke="#925fc7"/>)}
        {edits.targetsPx.map(t=><circle key={t.id} cx={t.at.x} cy={t.at.y} r={4} fill="#d75e37"/>)}
        {([['机柜',edits.cabinetPx],['入户',edits.wanPx]] as [string,Vec2|undefined][]).map(([label,p])=>p&&<g key={label}><circle cx={p.x} cy={p.y} r={5} fill="#174a7d"/><text x={p.x+7} y={p.y} fontSize={12} fill="#174a7d" stroke="white" strokeWidth={3} paintOrder="stroke">{label}</text></g>)}
        <polyline points={path(points)} fill="none" stroke="#e94494" strokeWidth={2}/>{points.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3} fill="#e94494"/>)}
      </svg></div>
      {(tool==='boundary'||tool==='room')&&<div className="control-row"><button disabled={points.length<3} onClick={finishPolygon}>完成范围绘制</button><button onClick={()=>setPoints(points.slice(0,-1))}>撤回末点</button><button onClick={()=>choose('inspect')}>取消绘制</button></div>}
      <CalibrationPanel boundary={edits.boundaryPx} value={calibration} marks={marks} onMark={()=>{choose('scale');setMarks([]);}} onApply={setCalibration}/>
      <details className="correction-card"><summary>建筑边界顶点</summary><PolygonEditor value={edits.boundaryPx} onChange={boundaryPx=>setEdits({...edits,boundaryPx})}/></details>
      <h3>房间 · {edits.roomsPx.length} 个</h3>{edits.roomsPx.map((r,index)=><RoomEditor key={r.id} ordinal={index+1} room={r} onChange={room=>setEdits({...edits,roomsPx:edits.roomsPx.map(v=>v.id===room.id?room:v)})} onRedraw={()=>{choose('room');setRoomId(r.id);}} onDelete={()=>setEdits({...edits,roomsPx:edits.roomsPx.filter(v=>v.id!==r.id),openingsPx:edits.openingsPx.filter(o=>!o.roomIds.includes(r.id)),targetsPx:edits.targetsPx.filter(t=>t.roomId!==r.id)})}/>)}
      <details className="correction-card"><summary>墙线 · {edits.wallsPx.length} 段，{edits.wallsPx.filter(w=>!w.confirmed).length} 段待确认</summary><p className="muted">墙线内侧轮廓可能成对出现；请按原图确认或删除。改变房间边界不会偷偷改变已有墙线。</p><button onClick={()=>setEdits({...edits,wallsPx:edits.wallsPx.map(w=>({...w,confirmed:true}))})}>确认当前墙线</button>{edits.wallsPx.map(w=><div key={w.id} className="control-row"><span>({w.from.x.toFixed(0)},{w.from.y.toFixed(0)}) → ({w.to.x.toFixed(0)},{w.to.y.toFixed(0)})</span><button onClick={()=>setEdits({...edits,wallsPx:edits.wallsPx.filter(v=>v.id!==w.id)})}>删除墙线</button></div>)}</details>
      <details open className="correction-card"><summary>门与通道 · {edits.openingsPx.length} 处</summary><p className="muted">未自动猜测门洞。用上方工具添加后，明确连接房间和宽度。</p>{edits.openingsPx.map(o=><div key={o.id} className="control-row">{[0,1].map(index=><label key={index}>连接房间{index+1}<select value={o.roomIds[index]??''} onChange={e=>setEdits({...edits,openingsPx:edits.openingsPx.map(v=>v.id===o.id?{...v,roomIds:index===0?[e.target.value,...v.roomIds.slice(1)]:[v.roomIds[0],e.target.value].filter(Boolean),confirmed:false}:v)})}><option value="">{index===1?'室外/单侧':'请选择'}</option>{edits.roomsPx.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>)}<label>宽度（像素）<input type="number" value={o.widthPx} onChange={e=>setEdits({...edits,openingsPx:edits.openingsPx.map(v=>v.id===o.id?{...v,widthPx:Number(e.target.value),confirmed:false}:v)})}/></label><label><input type="checkbox" checked={o.entrance} onChange={e=>setEdits({...edits,openingsPx:edits.openingsPx.map(v=>v.id===o.id?{...v,entrance:e.target.checked}:v)})}/>建筑入口</label><label><input type="checkbox" checked={o.confirmed} onChange={e=>setEdits({...edits,openingsPx:edits.openingsPx.map(v=>v.id===o.id?{...v,confirmed:e.target.checked}:v)})}/>确认门洞</label><button onClick={()=>setEdits({...edits,openingsPx:edits.openingsPx.filter(v=>v.id!==o.id)})}>删除门洞</button></div>)}</details>
      <details className="correction-card"><summary>监控目标 · {edits.targetsPx.length} 处</summary>{edits.targetsPx.map(t=><div className="control-row" key={t.id}><label>目标类型<select value={t.kind} onChange={e=>setEdits({...edits,targetsPx:edits.targetsPx.map(v=>v.id===t.id?{...v,kind:e.target.value as typeof t.kind}:v)})}><option value="public">公共经营区</option><option value="entrance">入口</option><option value="cashier">收银</option><option value="circulation">通道</option></select></label><button onClick={()=>setEdits({...edits,targetsPx:edits.targetsPx.filter(v=>v.id!==t.id)})}>删除目标</button></div>)}</details>
      <div className="control-row"><button className="primary" disabled={busy} onClick={apply}>确认并生成楼层</button><button disabled={busy} onClick={()=>{if(window.confirm('重新识别将替换本页未应用的候选校正，已保存方案不受影响。继续？'))void run();}}>重新识别为新草稿</button></div>
    </>}
  </section>;
}
