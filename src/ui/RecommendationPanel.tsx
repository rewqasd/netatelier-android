import {useState} from 'react';
import type {CatalogItem,Floor,Project,ProjectEdit} from '../domain/model';
import {catalog} from '../catalog/models';
import {recommendations} from '../catalog/recommendations';
import {yuan} from '../catalog/prices';
const title=(item:CatalogItem)=>item.id==='sunmi-t2s'?'商米 T2s 收银机':`${item.brand} ${item.name}`;
export function RecommendationPanel({project,floor,onApply}:{project:Project;floor:Floor;onApply:(edits:ProjectEdit[],route?:boolean)=>boolean}){
 return <details className="recommendations"><summary>可选经营设备</summary><p>仅供备选，展开不计费。加入后才增加购买费用和必要联网工程。</p>
  {recommendations(project.scene??'office',catalog).map(item=><Recommendation key={item.id} item={item} floor={floor} onApply={onApply}/>)}
  {project.business.map(b=>{const item=catalog.find(c=>c.id===b.modelId)!;return <div key={b.id} className="joined-item"><span>{item?title(item):b.modelId} ×{b.quantity} · {b.purchase?'购买':'已有仅联网'}</span><button onClick={()=>onApply([{type:'remove-business',id:b.id}],true)}>移除 {item?title(item):b.modelId}</button></div>;})}
 </details>;
}
function Recommendation({item,floor,onApply}:{item:CatalogItem;floor:Floor;onApply:(edits:ProjectEdit[],route?:boolean)=>boolean}){
 const [quantity,setQuantity]=useState(1),[purchase,setPurchase]=useState(true),[room,setRoom]=useState(floor.rooms.find(r=>r.use===(item.id==='sunmi-kitchen'?'kitchen':'cashier'))?.id??floor.rooms[0]?.id);
 return <article aria-label={title(item)}><h3>{title(item)}</h3><p>{item.model} · {yuan(item.unitCents)}/{item.unit} · 暂估</p><p className="muted">{item.conditions}</p><div className="fields"><label>数量<input type="number" min="1" max="128" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label><label>加入方式<select value={purchase?'purchase':'existing'} onChange={e=>setPurchase(e.target.value==='purchase')}><option value="purchase">购买设备</option><option value="existing">已有设备仅联网</option></select></label><label>所在房间<select value={room} onChange={e=>setRoom(e.target.value)}>{floor.rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label></div><button onClick={()=>onApply([{type:'join-business',selection:{id:`b-${crypto.randomUUID()}`,modelId:item.id,quantity,purchase,network:item.specs.network as 'wired'|'wifi'|'none',floorId:floor.id,roomId:room}}],true)}>加入方案</button></article>;
}
