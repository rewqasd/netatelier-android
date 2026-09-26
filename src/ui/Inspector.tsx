import {useEffect,useState} from 'react';
import type {Device,Floor,ProjectEdit} from '../domain/model';
import {cameraExcluded} from '../planning/candidates';
export function Inspector({device,floor,onApply,onClose,onMove,onDirty}:{device:Device;floor:Floor;onApply:(edits:ProjectEdit[],route?:boolean)=>boolean;onClose:()=>void;onMove:()=>void;onDirty:()=>void}){
 const [x,setX]=useState(String(device.positionM.x)),[y,setY]=useState(String(device.positionM.y)),[aim,setAim]=useState('');
 useEffect(()=>{setX(String(device.positionM.x));setY(String(device.positionM.y));},[device.id,device.positionM.x,device.positionM.y]);
 const changed=Number(x)!==device.positionM.x||Number(y)!==device.positionM.y;
 return <aside className="editor-panel inspector" aria-label="选中点位属性"><header><h2>点位属性</h2><button onClick={onClose}>关闭属性</button></header><h3>{device.label}</h3><p>{device.reason??'已确认的工程点位'}</p>
  <div className="fields"><label>点位X（米）<input type="number" step=".1" disabled={device.locked} value={x} onChange={e=>{setX(e.target.value);onDirty();}}/></label><label>点位Y（米）<input type="number" step=".1" disabled={device.locked} value={y} onChange={e=>{setY(e.target.value);onDirty();}}/></label></div>
  <div className="control-row"><button disabled={device.locked||!!aim} onClick={()=>onApply([{type:'move-device',floorId:floor.id,id:device.id,positionM:{x:Number(x),y:Number(y)}}],true)}>应用位置</button><button disabled={device.locked||changed||!!aim} onClick={onMove}>拖动此点位</button><button disabled={changed||!!aim} onClick={()=>onApply([{type:'lock-device',floorId:floor.id,id:device.id,locked:!device.locked}])}>{device.locked?'解锁点位':'锁定点位'}</button></div>
  {(device.kind==='cabinet'||floor.cables.some(c=>c.fromId===device.id||c.toId===device.id))&&<div><p>锁定线路会阻止移动。重算保留当前已应用坐标，取消未应用的坐标修改；关联主干须重新核查。</p><button disabled={!!aim} onClick={()=>{if(onApply([{type:'unlock-device-routes',floorId:floor.id,id:device.id}],true)){setX(String(device.positionM.x));setY(String(device.positionM.y));}}}>解锁关联线路并重算</button></div>}
  {device.kind==='ap'&&<p>服务区域：{device.serviceRoomIds?.map(id=>floor.rooms.find(r=>r.id===id)?.name).filter(Boolean).join('、')||'手工点位，需核对覆盖'}。此处为规划示意，不是实测热力图。</p>}
  {device.kind==='camera'&&<p>监控目标：{device.targetIds?.map(id=>{const target=floor.targets.find(t=>t.id===id);return floor.rooms.find(r=>r.id===target?.roomId)?.name;}).filter(Boolean).join('、')||'手工移动后需复核目标'}。采用半球符号；现场镜头与遮挡仍需勘察。</p>}
  {device.kind==='camera'&&<div><label>主要监控目标<select disabled={changed} value={aim} onChange={e=>{setAim(e.target.value);onDirty();}}><option value="">请选择已确认公共目标</option>{floor.targets.filter(t=>t.confirmed&&!floor.rooms.some(r=>r.id===t.roomId&&cameraExcluded.has(r.use))).map(t=><option key={t.id} value={t.id}>{floor.rooms.find(r=>r.id===t.roomId)?.name} · {t.kind==='entrance'?'入口':t.kind==='cashier'?'收银':t.kind==='circulation'?'通道':'公共区域'}</option>)}</select></label><button disabled={!aim||changed} onClick={()=>{if(onApply([{type:'aim-camera',floorId:floor.id,id:device.id,targetId:aim}]))setAim('');}}>应用监控目标</button><p>只调整规划视向，不移动或解锁安装点；有遮挡、超距和隐私目标不会被标记为已覆盖。</p></div>}
  {device.kind==='wan'&&<p>宽带入户是运营商线路进入本层的位置。X、Y是以米为单位的图纸坐标，不是端口、带宽或价格。</p>}
  <button className="danger" disabled={device.locked||changed||!!aim||!!device.businessId} onClick={()=>onApply([{type:'delete-device',floorId:floor.id,id:device.id}],true)}>删除点位</button>
 </aside>;
}
