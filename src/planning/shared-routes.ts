import type {Cable,Device,Floor,SharedSegment,Vec2} from '../domain/model';
import {distance,distanceToSegment,containsPoint,segmentBlocked} from '../domain/geometry';
import {unionSegments} from './line-union';
import {segmentInside} from './routing';
import {assertPathsBounded} from '../domain/workload';
export function bundleCables(cables:Cable[],devices:Device[]=[]):SharedSegment[]{
  assertPathsBounded(cables.map(c=>c.pointsM));
  const active=cables.filter(c=>c.status!=='disconnected');
  const lines=active.flatMap(c=>c.pointsM.slice(1).map((to,i)=>({scope:c.floorId,from:{...c.pointsM[i],z:0},to:{...to,z:0},ids:[c.id]})));
  return unionSegments(lines).map((s,i)=>({id:`shared-${s.scope}-${i}`,floorId:s.scope,from:{x:s.from.x,y:s.from.y},to:{x:s.to.x,y:s.to.y},cableIds:s.ids,kinds:[...new Set(s.ids.flatMap(id=>{const cable=active.find(c=>c.id===id),device=devices.find(d=>d.id===cable?.toId);return device?[device.kind]:[];}))]}));
}
export function moveSharedSegment(source:Floor,segment:SharedSegment,delta:Vec2):Floor{
  if(!Number.isFinite(delta.x)||!Number.isFinite(delta.y)||segment.floorId!==source.id)throw new Error('共享线段移动参数无效');
  const members=source.cables.filter(c=>segment.cableIds.includes(c.id));if(members.length!==segment.cableIds.length)throw new Error('共享线段已变化，请重新选择');
  if(members.some(c=>c.locked))throw new Error('共享路段包含已锁定线路，未移动任何线缆');
  const current=bundleCables(source.cables).some(s=>s.cableIds.slice().sort().join()===segment.cableIds.slice().sort().join()&&((distance(s.from,segment.from)<1e-6&&distance(s.to,segment.to)<1e-6)||(distance(s.to,segment.from)<1e-6&&distance(s.from,segment.to)<1e-6)));
  if(!current)throw new Error('共享线段已变化，请重新选择');
  const floor=structuredClone(source);
  for(const cable of floor.cables.filter(c=>segment.cableIds.includes(c.id))){
    const split:Vec2[]=[];
    for(let i=0;i<cable.pointsM.length-1;i++){
      const a=cable.pointsM[i],b=cable.pointsM[i+1],inside=[segment.from,segment.to].filter(p=>distanceToSegment(p,a,b)<1e-6&&distance(p,a)>1e-6&&distance(p,b)>1e-6).sort((p,q)=>distance(a,p)-distance(a,q));
      split.push(a,...inside);
    }
    split.push(cable.pointsM[cable.pointsM.length-1]);
    const moved:Vec2[]=[];
    split.forEach((p,i)=>{
      const shared=distanceToSegment(p,segment.from,segment.to)<1e-6,translated={x:p.x+delta.x,y:p.y+delta.y};
      if(i===0)moved.push({...p});
      if(shared)moved.push(translated);else if(i!==0)moved.push({...p});
      if(i===split.length-1&&shared)moved.push({...p});
    });
    cable.pointsM=moved.filter((p,i)=>!i||distance(p,moved[i-1])>1e-7);
    if(cable.pointsM.some(p=>!containsPoint(p,floor.boundary))||cable.pointsM.slice(1).some((p,i)=>!segmentInside(cable.pointsM[i],p,floor.boundary)))throw new Error('移动后的线路超出建筑边界');
    if(cable.pointsM.slice(1).some((p,i)=>segmentBlocked(cable.pointsM[i],p,floor.walls,floor.openings)))cable.status='provisional';
  }
  return floor;
}
