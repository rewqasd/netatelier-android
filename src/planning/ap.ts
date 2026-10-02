import type {Floor,Settings,Issue,Device,Vec2} from '../domain/model';
import {containsPoint,distance,segmentsIntersect} from '../domain/geometry';
import {calibrationIssues} from '../recognition/calibration';
import {roomCentre,roomGrid,protectedPoint} from './candidates';
import {planCameras} from './cameras';
/** Effective distance is a conservative planning heuristic, never RF measurement. */
export function effectiveDistance(floor:Floor,a:Vec2,b:Vec2):number{
  const losses=new Map<number,number>();
  for(const wall of floor.walls){
    if(!segmentsIntersect(a,b,wall.from,wall.to))continue;
    const dx=b.x-a.x,dy=b.y-a.y,wx=wall.to.x-wall.from.x,wy=wall.to.y-wall.from.y,denominator=dx*wy-dy*wx;
    if(Math.abs(denominator)<1e-8)continue;
    const t=((wall.from.x-a.x)*wy-(wall.from.y-a.y)*wx)/denominator,key=Math.round(t*1e6);
    const loss=({partition:2.5,glass:2,brick:5,concrete:9,unknown:6})[wall.material];losses.set(key,Math.max(losses.get(key)??0,loss));
  }
  return distance(a,b)+[...losses.values()].reduce((a,b)=>a+b,0);
}
export function planFloor(source:Floor,settings:Settings):{floor:Floor;issues:Issue[]}{
  const floor=structuredClone(source),issues=calibrationIssues(floor.calibration);
  if(issues.some(i=>i.severity==='blocking'))return {floor,issues};
  if(!floor.rooms.length||floor.rooms.some(r=>!r.confirmed)){issues.push({code:'UNCONFIRMED_ROOMS',severity:'blocking',message:'请先确认房间几何和用途',entityIds:[floor.id]});return {floor,issues};}
  const complexity=()=>{issues.push({code:'PLANNING_COMPLEXITY',severity:'blocking',message:'本层几何超出移动端规划计算上限，请按区域拆分或简化墙线；未生成假点位。',entityIds:[floor.id]});return {floor,issues};};
  const vertices=floor.rooms.reduce((n,r)=>n+r.polygon.length,0);
  if(floor.rooms.length>100||vertices>4096||vertices*3*floor.targets.length*Math.max(1,floor.walls.length)*Math.max(1,Math.min(128,floor.targets.length))>10_000_000)return complexity();
  const wifi=floor.wifi??settings.wifi,capacity=wifi===6?40:25;
  const servedRooms=floor.rooms.filter(r=>r.needsWifi!==false&&!['equipment','toilet','shower','storage'].includes(r.use));
  const samples=servedRooms.flatMap(room=>roomGrid(room,4).map(at=>({at,roomId:room.id}))),candidates=servedRooms.flatMap(room=>[roomCentre(room),...roomGrid(room,4)].map(at=>({at,roomId:room.id})));
  if(samples.length*candidates.length*Math.max(1,floor.walls.length)>5_000_000)return complexity();
  const aps=floor.devices.filter(d=>d.kind==='ap'),requested=floor.deviceCounts?.ap;
  if(requested!==undefined&&requested<aps.filter(protectedPoint).length)throw new Error('AP数量不能低于锁定或手工点位数');
  while(requested!==undefined&&aps.length>requested){const index=aps.findIndex(d=>!protectedPoint(d));aps.splice(index,1);}
  const coverage=(point:Vec2)=>samples.map((s,i)=>effectiveDistance(floor,point,s.at)<=8.5+1e-7?i:-1).filter(i=>i>=0);
  const cache=candidates.map(c=>coverage(c.at));
  const demand=Math.max(floor.demand.concurrentUsers,Math.ceil(floor.demand.terminals*.6)),capacityCount=Math.ceil(demand/capacity),max=requested??128;
  const done=new Set(aps.flatMap(d=>coverage(d.positionM)));
  while(aps.length<max){
    if(requested===undefined&&done.size===samples.length&&aps.length>=capacityCount)break;
    let best=-1,score=-Infinity;
    for(let i=0;i<candidates.length;i++){
      const c=candidates[i],nearest=aps.length?Math.min(...aps.map(a=>distance(a.positionM,c.at))):10;
      if(nearest<2.5)continue;
      const gain=cache[i].filter(s=>!done.has(s)).length;
      const next=Math.round((gain*100+Math.min(nearest,12)-effectiveDistance(floor,c.at,roomCentre(floor.rooms.find(r=>r.id===c.roomId)!))*.05)*1e6)/1e6;
      if(next>score+1e-6){best=i;score=next;}
    }
    if(best<0)break;
    if(requested===undefined&&cache[best].every(s=>done.has(s))&&aps.length>=capacityCount)break;
    const c=candidates[best];let n=1;while(aps.some(d=>d.id===`${floor.id}-ap-${n}`))n++;
    aps.push({id:`${floor.id}-ap-${n}`,floorId:floor.id,kind:'ap',label:`AP ${n}`,positionM:c.at,roomId:c.roomId,locked:false,source:'automatic',wifi,mount:floor.rooms.find(r=>r.id===c.roomId)?.use==='guest'?'panel':'ceiling',modelId:floor.apModelId});
    cache[best].forEach(i=>done.add(i));
  }
  for(const ap of aps){ap.wifi=wifi;ap.modelId=floor.apModelId;ap.serviceRoomIds=[...new Set(coverage(ap.positionM).map(i=>samples[i].roomId))];ap.reason=`按房间采样、墙体折减及间距规划，服务${ap.serviceRoomIds.length}个区域；${capacity}活跃终端/AP为可复核规划假设，非厂商最大带机量。`;}
  if(aps.length)issues.push({code:'RF_PLANNING_ASSUMPTION',severity:'warning',message:'无线服务范围使用简化距离/墙体折减，非实测热力图；信道、功率和同频干扰须现场调试。',entityIds:[floor.id]});
  if(done.size<samples.length)issues.push({code:'AP_COVERAGE',severity:'warning',message:`${samples.length-done.size}个服务采样点未达简化规划阈值，请增加点位或现场确认。`,entityIds:[...new Set(samples.filter((_,i)=>!done.has(i)).map(s=>s.roomId))]});
  if(aps.length*capacity<demand)issues.push({code:'AP_CAPACITY',severity:'warning',message:'用户指定AP数量低于并发规划假设，保留数量但不能宣称容量满足。',entityIds:[floor.id]});
  if(requested!==undefined&&aps.length<requested)issues.push({code:'AP_SPACING',severity:'warning',message:'没有足够满足最小间距的AP候选，未强行堆叠设备。',entityIds:[floor.id]});
  if(floor.walls.some(w=>w.material==='unknown'))issues.push({code:'UNKNOWN_WALLS',severity:'warning',message:'墙体材质未知，无线折减仅为假设；存在覆盖/干扰不确定性。',entityIds:[floor.id]});
  const cameraResult=settings.monitoring?planCameras(floor,floor.deviceCounts?.camera):{devices:floor.devices.filter(d=>d.kind==='camera'&&protectedPoint(d)),issues:[]};if(settings.monitoring)issues.push(...cameraResult.issues);
  if(settings.monitoring&&cameraResult.devices.length)issues.push({code:'CAMERA_VIEW_ASSUMPTION',severity:'warning',message:'视线仅按14m、90°及已确认门洞规划；开关门状态、镜头、高度与家具遮挡待现场核实。',entityIds:[floor.id]});
  const businessInfo=floor.devices.filter(d=>d.kind==='information'&&d.businessId),info=floor.devices.filter(d=>d.kind==='information'&&!d.businessId),infoCount=floor.deviceCounts?.information??floor.demand.wiredPoints;
  if(infoCount<info.filter(protectedPoint).length)throw new Error('信息点数量不能低于锁定或手工点位数');
  while(info.length>infoCount){const index=info.findIndex(d=>!protectedPoint(d));info.splice(index,1);}
  const wired=floor.rooms.filter(r=>['public','office','cashier','entrance'].includes(r.use)).flatMap(r=>roomGrid(r,3).map(at=>({at,roomId:r.id})));
  for(let i=info.length;i<infoCount&&wired.length;i++){const c=wired[i%wired.length];let n=i+1;while(info.some(d=>d.id===`${floor.id}-info-${n}`))n++;info.push({id:`${floor.id}-info-${n}`,floorId:floor.id,kind:'information',label:`网口 ${n}`,positionM:c.at,roomId:c.roomId,locked:false,source:'automatic',reason:'固定终端有线网口；可按工位和收银位置调整。'});}
  const anchors=floor.devices.filter(d=>d.kind==='cabinet'||d.kind==='wan');
  if(!anchors.some(d=>d.kind==='cabinet')){const room=floor.rooms.find(r=>r.use==='equipment')??floor.rooms.find(r=>!['toilet','shower','changing','guest'].includes(r.use))!;if(room)anchors.push({id:`floor-${floor.id}-cabinet`,floorId:floor.id,kind:'cabinet',label:'机柜',positionM:roomCentre(room),roomId:room.id,locked:false,source:'automatic'});}
  if(!anchors.some(d=>d.kind==='wan')){const positionM=floor.openings.find(o=>o.entrance)?.at??anchors[0]?.positionM;if(positionM)anchors.push({id:`floor-${floor.id}-wan`,floorId:floor.id,kind:'wan',label:'宽带入口',positionM,locked:false,source:'automatic'});}
  floor.devices=[...anchors,...aps,...cameraResult.devices,...info,...businessInfo];
  for(const d of floor.devices)if(!containsPoint(d.positionM,floor.boundary))issues.push({code:'OUTSIDE_DEVICE',severity:'blocking',message:'设备位于建筑边界之外',entityIds:[d.id]});
  return {floor,issues};
}
