import type {PixelRoom,RoomUse,Vec2} from '../domain/model';
export const roomUses:Record<RoomUse,string>={public:'公共经营区',entrance:'入口',cashier:'收银',corridor:'通道',kitchen:'厨房',storage:'库房',equipment:'设备间',office:'办公室（默认不监控）',meeting:'会议室（默认不监控）',guest:'客房（隐私）',toilet:'卫生间（隐私）',changing:'更衣室（隐私）',shower:'淋浴（隐私）'};
export function PolygonEditor({value,onChange}:{value:Vec2[];onChange:(p:Vec2[])=>void}){
  return <details><summary>编辑顶点坐标（原图像素）</summary>{value.map((p,i)=><div className="vertex-row" key={i}><span>{i+1}</span>{(['x','y'] as const).map(axis=><label key={axis}>{axis.toUpperCase()}<input aria-label={`顶点${i+1}${axis.toUpperCase()}`} type="number" step="1" value={Math.round(p[axis]*100)/100} onChange={e=>onChange(value.map((v,j)=>i===j?{...v,[axis]:Number(e.target.value)}:v))}/></label>)}<button disabled={value.length<=3} onClick={()=>onChange(value.filter((_,j)=>i!==j))}>移除</button><button onClick={()=>{const next=value[(i+1)%value.length];onChange([...value.slice(0,i+1),{x:(p.x+next.x)/2,y:(p.y+next.y)/2},...value.slice(i+1)]);}}>插点</button></div>)}</details>;
}
export function RoomEditor({ordinal,room,onChange,onDelete,onRedraw}:{ordinal:number;room:PixelRoom;onChange:(r:PixelRoom)=>void;onDelete:()=>void;onRedraw:()=>void}){
  const change=(patch:Partial<PixelRoom>)=>onChange({...room,...patch,provenance:'manual'});
  return <details className="correction-card" open><summary>{ordinal} · {room.name} · {room.confirmed?'已确认':'待确认'}</summary><div className="control-row">
    <label>房间名称<input aria-label="房间名称" value={room.name} maxLength={160} onChange={e=>change({name:e.target.value,confirmed:false})}/></label>
    <label>房间用途<select aria-label="房间用途" value={room.use} onChange={e=>change({use:e.target.value as RoomUse,confirmed:false})}>{Object.entries(roomUses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label><input type="checkbox" checked={room.needsWifi!==false} onChange={e=>change({needsWifi:e.target.checked})}/>需要Wi-Fi</label>
    <label><input aria-label="确认此房间" type="checkbox" checked={room.confirmed} onChange={e=>change({confirmed:e.target.checked})}/>确认此房间</label></div>
    <PolygonEditor value={room.polygon} onChange={polygon=>change({polygon,confirmed:false})}/><div className="control-row"><button onClick={onRedraw}>在图上重画范围</button><button onClick={onDelete}>删除此候选</button></div>
  </details>;
}
