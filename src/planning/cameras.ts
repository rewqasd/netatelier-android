import type {Floor,Device,Target,Issue} from '../domain/model';
import {distance,segmentBlocked} from '../domain/geometry';
import {cameraAllowed,cameraCandidates,cameraExcluded,protectedPoint} from './candidates';
const sightRangeM=14,halfAngle=Math.PI/4;
export function cameraSees(floor:Floor,camera:Device,target:Target):boolean{
  if(!target.confirmed||floor.rooms.some(r=>r.id===target.roomId&&cameraExcluded.has(r.use))||!cameraAllowed(floor,camera.positionM))return false;
  const d=distance(camera.positionM,target.at);if(d<.3||d>sightRangeM+1e-7||segmentBlocked(camera.positionM,target.at,floor.walls,floor.openings))return false;
  const angle=Math.atan2(target.at.y-camera.positionM.y,target.at.x-camera.positionM.x),direction=camera.directionRad;
  return direction!==undefined&&Math.cos(angle-direction)>=Math.cos(halfAngle)-1e-7;
}
export function planCameras(floor:Floor,count?:number):{devices:Device[];issues:Issue[]}{
  const issues:Issue[]=[],devices=floor.devices.filter(d=>d.kind==='camera').map(d=>structuredClone(d));
  const protectedCount=devices.filter(protectedPoint).length;
  if(count!==undefined&&count<protectedCount)throw new Error('摄像头数量不能低于锁定或手工点位数');
  while(count!==undefined&&devices.length>count){const index=devices.findIndex(d=>!protectedPoint(d));devices.splice(index,1);}
  const legalTargets=floor.targets.filter(t=>t.confirmed&&!floor.rooms.some(r=>r.id===t.roomId&&cameraExcluded.has(r.use)));
  const covered=()=>new Set(devices.flatMap(c=>legalTargets.filter(t=>cameraSees(floor,c,t)).map(t=>t.id)));
  const candidates=cameraCandidates(floor),limit=count??Math.min(128,Math.max(legalTargets.length,devices.length));
  while(devices.length<limit){
    const done=covered();let best:Device|undefined,score=-Infinity;
    for(const candidate of candidates){
      if(devices.some(d=>distance(d.positionM,candidate.at)<.7))continue;
      for(const aim of legalTargets){
        const directionRad=Math.atan2(aim.at.y-candidate.at.y,aim.at.x-candidate.at.x);
        const c:Device={id:'candidate',floorId:floor.id,kind:'camera',label:'摄像头',positionM:candidate.at,roomId:candidate.roomId,source:'automatic',locked:false,directionRad};
        const visible=legalTargets.filter(t=>cameraSees(floor,c,t)),fresh=visible.filter(t=>!done.has(t.id));
        const gain=Math.round((fresh.reduce((n,t)=>n+t.weight,0)*1000-visible.reduce((n,t)=>n+distance(c.positionM,t.at),0))*1e6)/1e6;
        if((fresh.length||count!==undefined)&&visible.length&&gain>score+1e-6){best={...c,targetIds:visible.map(t=>t.id)};score=gain;}
      }
    }
    if(!best)break;
    let n=1;while(devices.some(d=>d.id===`${floor.id}-camera-${n}`))n++;
    devices.push({...best,id:`${floor.id}-camera-${n}`,label:`摄像头 ${n}`,reason:`面向${best.targetIds?.length??0}个明确公共监控目标；14m/90°仅作遮挡规划假设，镜头及安装高度待勘察。`});
    if(count===undefined&&covered().size===legalTargets.length)break;
  }
  for(const c of devices){
    c.targetIds=legalTargets.filter(t=>cameraSees(floor,c,t)).map(t=>t.id);
    if(!cameraAllowed(floor,c.positionM))issues.push({code:'ILLEGAL_CAMERA',severity:'blocking',message:'保留的摄像头位于隐私/默认排除区域或建筑外，请手动移除或移动。',entityIds:[c.id]});
  }
  const done=covered();for(const target of floor.targets)if(!done.has(target.id))issues.push({code:'UNCOVERED_TARGET',severity:'warning',message:`监控目标未覆盖：${target.kind}。可能受数量、隐私区域或墙体遮挡限制。`,entityIds:[target.id]});
  if(count!==undefined&&devices.length<count)issues.push({code:'CAMERA_CANDIDATES',severity:'warning',message:'没有足够合法且有监控目的的安装点；不为凑数量放入隐私区域。',entityIds:[floor.id]});
  return {devices,issues};
}
