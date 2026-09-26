import {useEffect,useMemo,useRef,useState} from 'react';
import type {Device,Floor,SharedSegment,Vec2} from '../domain/model';
import {bundleCables} from '../planning/shared-routes';
import {displayMarkers,roomLabel} from './display-layout';
import {LocalDocuments,localImageUrl,nativeRecognitionAvailable} from '../recognition/native';

export type CanvasMode='pan'|'move'|'add-ap'|'add-camera'|'add-information';
export function FloorplanCanvas({floor,monitoring,selected,mode,onSelect,onPoint,onSegment}:{floor:Floor;monitoring:boolean;selected?:string;mode:CanvasMode;onSelect:(id:string)=>void;onPoint:(p:Vec2)=>void;onSegment:(s:SharedSegment)=>void}){
 const host=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),pointers=useRef(new Map<number,Vec2>()),gesture=useRef<{start:Vec2;pan:Vec2;distance?:number;zoom:number;moving:boolean;travel:number;deviceId?:string;segmentId?:string}|undefined>(undefined);
 const [size,setSize]=useState({w:390,h:500}),[pan,setPan]=useState({x:0,y:0}),[zoom,setZoom]=useState(1),[image,setImage]=useState(''),[showImage,setShowImage]=useState(true),[showInformation,setShowInformation]=useState(false),[showRooms,setShowRooms]=useState(false);
 useEffect(()=>{const el=host.current!;const observer=new ResizeObserver(([e])=>setSize({w:e.contentRect.width,h:e.contentRect.height}));observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{setPan({x:0,y:0});setZoom(1);setImage('');let active=true;if(floor.document&&nativeRecognitionAvailable())void LocalDocuments.assetUri({assetId:floor.document.assetId}).then(r=>{if(active)setImage(localImageUrl(r.uri));}).catch(()=>{});return()=>{active=false;};},[floor.id,floor.document?.assetId]);
 const bounds=useMemo(()=>{const xs=floor.boundary.map(p=>p.x),ys=floor.boundary.map(p=>p.y);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};},[floor.boundary]);
 const scale=Math.max(.01,Math.min((size.w-80)/Math.max(1,bounds.w),(size.h-(size.h<300?28:100))/Math.max(1,bounds.h)))*zoom;
 const offset={x:size.w/2-(bounds.x+bounds.w/2)*scale+pan.x,y:size.h/2-(bounds.y+bounds.h/2)*scale+pan.y};
 const screen=(p:Vec2)=>({x:p.x*scale+offset.x,y:p.y*scale+offset.y}),metric=(p:Vec2)=>({x:(p.x-offset.x)/scale,y:(p.y-offset.y)/scale});
 const points=(p:Vec2[])=>p.map(v=>{const s=screen(v);return `${s.x},${s.y}`;}).join(' ');
 const devices=floor.devices.filter(d=>(monitoring||d.kind!=='camera')&&(showInformation||d.kind!=='information'||d.id===selected)),visible=devices.filter(d=>{const p=screen(d.positionM);return p.x>=0&&p.x<=size.w&&p.y>=0&&p.y<=size.h;});
 const markers=displayMarkers(visible.map(d=>({id:d.id,at:screen(d.positionM)})),size.w,size.h);
 const segments=useMemo(()=>bundleCables(floor.cables.filter(c=>floor.devices.some(d=>d.id===c.toId&&(monitoring||d.kind!=='camera')&&(showInformation||d.kind!=='information'||d.id===selected))),floor.devices),[floor,monitoring,showInformation,selected]);
 const local=(e:{clientX:number;clientY:number})=>{const rect=svg.current!.getBoundingClientRect();return {x:e.clientX-rect.left,y:e.clientY-rect.top};};
 const setMagnification=(value:number)=>setZoom(Math.min(8,Math.max(.5,value)));
 function down(e:React.PointerEvent<SVGSVGElement>){
  e.currentTarget.setPointerCapture(e.pointerId);const p=local(e);pointers.current.set(e.pointerId,p);const list=[...pointers.current.values()];
  const device=(e.target as Element).closest('[data-id]')?.getAttribute('data-id');
  gesture.current={start:p,pan:{...pan},zoom,moving:mode==='move'&&device===selected,travel:0,deviceId:device??undefined,segmentId:(e.target as Element).closest('[data-segment]')?.getAttribute('data-segment')??undefined};
  if(list.length===2){gesture.current.distance=Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y);gesture.current.start={x:(list[0].x+list[1].x)/2,y:(list[0].y+list[1].y)/2};}
 }
 function move(e:React.PointerEvent<SVGSVGElement>){
  const g=gesture.current;if(!g||!pointers.current.has(e.pointerId))return;const p=local(e);pointers.current.set(e.pointerId,p);const list=[...pointers.current.values()];
  g.travel=Math.max(g.travel,Math.hypot(p.x-g.start.x,p.y-g.start.y));
  if(list.length===2&&g.distance){const ratio=Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y)/Math.max(1,g.distance);setMagnification(g.zoom*ratio);setPan({x:g.pan.x+(list[0].x+list[1].x)/2-g.start.x,y:g.pan.y+(list[0].y+list[1].y)/2-g.start.y});}
  else if(!g.moving&&mode==='pan')setPan({x:g.pan.x+p.x-g.start.x,y:g.pan.y+p.y-g.start.y});
 }
 function up(e:React.PointerEvent<SVGSVGElement>){
  const g=gesture.current,wasSingle=pointers.current.size===1;const p=local(e);pointers.current.delete(e.pointerId);gesture.current=undefined;
  if(!g||!wasSingle)return;if(g.moving&&g.travel>4){const d=devices.find(v=>v.id===g.deviceId);if(d)onPoint({x:d.positionM.x+(p.x-g.start.x)/scale,y:d.positionM.y+(p.y-g.start.y)/scale});}else if(g.travel<4&&mode.startsWith('add-'))onPoint(metric(p));else if(g.travel<4&&g.deviceId)onSelect(g.deviceId);else if(g.travel<4&&g.segmentId){const s=segments.find(v=>v.id===g.segmentId);if(s)onSegment(s);}
 }
 const selectedDevice=devices.find(d=>d.id===selected);
 return <div className="canvas-stage" ref={host}>
  <div className="canvas-controls"><button aria-label="缩小画布" onClick={()=>setMagnification(zoom/1.25)}>−</button><button onClick={()=>{setPan({x:0,y:0});setZoom(1);}}>适应画布</button><button aria-label="放大画布" onClick={()=>setMagnification(zoom*1.25)}>＋</button><button aria-pressed={showInformation} onClick={()=>setShowInformation(!showInformation)}>网口图层</button><button aria-expanded={showRooms} onClick={()=>setShowRooms(!showRooms)}>房间图例</button>{image&&<button aria-pressed={showImage} onClick={()=>setShowImage(!showImage)}>原图</button>}</div>
  {showRooms&&<div className="room-key" aria-label="房间编号图例">{floor.rooms.map((r,i)=><p key={r.id}>R{i+1} · {r.name}</p>)}</div>}
  <svg ref={svg} role="img" aria-label="点位与布线平面图" viewBox={`0 0 ${size.w} ${size.h}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{pointers.current.clear();gesture.current=undefined;}} onWheel={e=>setMagnification(zoom*(e.deltaY>0?.9:1.1))}>
   <defs><pattern id="plan-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#dce3df"/></pattern></defs>
   <rect width={size.w} height={size.h} fill="url(#plan-grid)"/>
   {image&&showImage&&floor.document&&<image href={image} width={floor.document.widthPx} height={floor.document.heightPx} opacity=".45" transform={`translate(${offset.x} ${offset.y}) scale(${scale}) rotate(${floor.calibration.angleRad*180/Math.PI}) scale(${floor.calibration.metersPerPixel}) translate(${-floor.calibration.originPx.x} ${-floor.calibration.originPx.y})`}/>}
   {floor.rooms.map((room,index)=><g key={room.id}><polygon points={points(room.polygon)} fill={['guest','toilet','changing','shower'].includes(room.use)?'#e8e9e7':image&&showImage?'#ffffff55':'#ffffff'} stroke="#bbc7c0" strokeWidth="1"><title>{room.name}</title></polygon>{(()=>{const label=roomLabel(room.polygon.map(screen),room.name,markers.map(m=>m.at),index);return <text x={label.at.x} y={label.at.y-(label.lines.length-1)*6.5+4} textAnchor="middle" className="room-label"><title>{room.name}</title>{label.lines.map((line,i)=><tspan key={i} x={label.at.x} dy={i?13:0}>{line}</tspan>)}</text>;})()}</g>)}
   {floor.walls.map(w=>{const a=screen(w.from),b=screen(w.to);return <line key={w.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#53675c" strokeWidth="2.3"/>;})}
   {floor.openings.map(o=>{const p=screen(o.at);return <circle key={o.id} cx={p.x} cy={p.y} r="3" fill="#fff" stroke={o.confirmed?'#95b49f':'#be8b39'}/>;})}
   {segments.map(s=>{const a=screen(s.from),b=screen(s.to),mixed=s.kinds.includes('ap')&&s.kinds.includes('camera'),color=s.kinds.includes('camera')?'#cf7545':s.kinds.includes('ap')?'#3284ad':'#83938a';return <g key={s.id} data-segment={s.id} className="route-hit" role="button" tabIndex={0} aria-label={`${s.cableIds.length}根电缆路段`} onKeyDown={e=>{if(e.key==='Enter')onSegment(s);}}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="12"/><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={s.cableIds.length>1?3:1.6} pointerEvents="none"/>{mixed&&<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3284ad" strokeWidth="3" strokeDasharray="7 7" pointerEvents="none"/>}</g>;})}
   {selectedDevice?.kind==='camera'&&selectedDevice.targetIds?.map(id=>{const target=floor.targets.find(t=>t.id===id);if(!target)return null;const a=screen(selectedDevice.positionM),b=screen(target.at);return <line key={id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#bd714b" strokeDasharray="4 5"/>;})}
   {markers.map(marker=>{const d=devices.find(v=>v.id===marker.id)!;return <g key={d.id} role="button" tabIndex={0} aria-label={d.label} aria-pressed={selected===d.id} data-id={d.id} data-kind={d.kind} data-x={d.positionM.x} data-y={d.positionM.y} onClick={e=>{e.stopPropagation();if(mode==='pan'||mode==='move')onSelect(d.id);}} onKeyDown={e=>{if(e.key==='Enter')onSelect(d.id);}} className={selected===d.id?'device-marker selected':'device-marker'}>
    <line x1={marker.anchor.x} y1={marker.anchor.y} x2={marker.at.x} y2={marker.at.y} stroke="#90a298" strokeWidth="1" pointerEvents="none"/><circle cx={marker.anchor.x} cy={marker.anchor.y} r="2" fill="#365447"/>
    <g transform={`translate(${marker.at.x} ${marker.at.y})`}><circle r="20" fill="transparent"/><circle r="14" fill="#fff" stroke={selected===d.id?'#194e38':d.kind==='camera'?'#be7148':d.kind==='ap'?'#3284ad':'#6a8073'} strokeWidth={selected===d.id?3:1.7}/><DeviceGlyph kind={d.kind}/><text y="28" textAnchor="middle" className="point-label">{d.kind==='ap'?'AP':d.kind==='camera'?'监控':d.kind==='cabinet'?'机柜':d.kind==='wan'?'入户':'网口'}{['ap','camera','information'].includes(d.kind)?devices.filter(v=>v.kind===d.kind).indexOf(d)+1:''}{d.locked?'·锁':''}</text></g>
   </g>;})}
  </svg>
  <div className="canvas-legend"><span className="wifi-dot"/>Wi-Fi <span className="camera-dot"/>监控 <span className="shared-dot"/>共用线槽<span>引线仅避让图标</span></div>
 </div>;
}
function DeviceGlyph({kind}:{kind:Device['kind']}){return <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">{kind==='ap'?<><path d="M-8 -3 Q0 -10 8 -3 M-5 1 Q0 -4 5 1 M-2 5 Q0 2 2 5"/><circle cy="8" r="1"/></>:kind==='camera'?<><path d="M-8 0 A8 8 0 0 1 8 0 Z M-6 2 Q0 10 6 2"/><circle cy="3" r="2"/></>:kind==='cabinet'?<><rect x="-6" y="-9" width="12" height="18" rx="2"/><path d="M-3 -4 H3 M-3 1 H3 M-3 5 H3"/></>:kind==='wan'?<><circle r="8"/><path d="M-8 0 H8 M0 -8 V8"/></>:<><rect x="-6" y="-6" width="12" height="12" rx="1"/><path d="M-3 -1 H3 V3 H-3Z"/></>}</g>;}
