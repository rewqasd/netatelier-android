import type {Project,Quantities,Issue} from '../domain/model';
import {distance} from '../domain/geometry';
import {assertEngineeringBounded} from '../domain/workload';
import {calibrationIssues} from '../recognition/calibration';
import {unionSegments,pathLength3,type PhysicalSegment} from '../planning/line-union';
const mm=(metres:number)=>Math.round(metres*1000)/1000;
export function measureProject(project:Project):Quantities{
  assertEngineeringBounded(project);
  const issues:Issue[]=[],trays:PhysicalSegment[]=[];let net=0,withAllowances=0,backboneM=0,independentLinks=0;
  const issue=(code:string,message:string,ids:string[])=>issues.push({code,severity:'blocking',message,entityIds:ids});
  for(const floor of project.floors){
    const scaleIssues=calibrationIssues(floor.calibration);issues.push(...scaleIssues);
    const active=floor.devices.filter(d=>d.kind!=='cabinet'&&(d.kind!=='camera'||project.settings.monitoring)),activeIds=new Set(active.map(d=>d.id));
    const cables=floor.cables.filter(c=>activeIds.has(c.toId));independentLinks+=active.length;
    for(const endpoint of active){const count=cables.filter(c=>c.toId===endpoint.id).length;if(!count)issue('MISSING_LINK','设备缺少物理连线',[endpoint.id]);else if(count>1)issue('DUPLICATE_LINK','设备存在重复物理连线，请确认',[endpoint.id]);}
    if(scaleIssues.some(i=>i.severity==='blocking'))continue;
    for(const cable of cables){
      if(cable.status==='disconnected'||cable.pointsM.length<2){issue('DISCONNECTED_CABLE','线路未连通，米数未计入已知部分',[cable.id]);continue;}
      if(cable.status==='provisional')issue('PROVISIONAL_ROUTE','线路包含待确认敷设段，报价仅含暂估部分',[cable.id]);
      const from=floor.devices.find(d=>d.id===cable.fromId),to=floor.devices.find(d=>d.id===cable.toId);
      if(!from||from.kind!=='cabinet'||!to||distance(cable.pointsM[0],from.positionM)>1e-6||distance(cable.pointsM[cable.pointsM.length-1],to.positionM)>1e-6)issue('STALE_ROUTE','线路端点与当前设备不一致',[cable.id]);
      const length=cable.pointsM.slice(1).reduce((n,p,i)=>n+distance(p,cable.pointsM[i]),0),allowance=2*project.settings.endpointAllowanceM+project.settings.dropM;
      net+=length;withAllowances+=length+allowance;
      if(length+allowance>90)issue('COPPER_OVER_90M','铜缆固定链路含两端预留和引下超过90m，请增设接入点或采用光纤',[cable.id]);
      cable.pointsM.slice(1).forEach((p,i)=>trays.push({scope:`floor:${floor.id}`,from:{...cable.pointsM[i],z:floor.elevationM},to:{...p,z:floor.elevationM},ids:[cable.id]}));
    }
  }
  for(const link of project.backbones??[]){
    if(link.status==='disconnected'||link.pointsM.length<2){issue('DISCONNECTED_BACKBONE','楼层主干未连通',[link.id]);continue;}
    if(link.status==='provisional')issue('BACKBONE_CONFIRMATION','楼层竖井位置、楼高和主干路径需确认',[link.id]);
    const from=project.floors.find(f=>f.id===link.fromFloorId),to=project.floors.find(f=>f.id===link.toFloorId),a=from?.devices.find(d=>d.id===link.fromId),b=to?.devices.find(d=>d.id===link.toId),first=link.pointsM[0],last=link.pointsM[link.pointsM.length-1];
    if(!from||!to||!a||!b||distance(first,a.positionM)>1e-6||distance(last,b.positionM)>1e-6||Math.abs(first.z-from.elevationM)>1e-6||Math.abs(last.z-to.elevationM)>1e-6)issue('STALE_BACKBONE','主干端点或楼高与当前机柜不一致',[link.id]);
    const length=pathLength3(link.pointsM);backboneM+=length;
    if(link.medium==='copper'&&length+2*project.settings.endpointAllowanceM>90)issue('COPPER_OVER_90M','跨层铜缆链路超过90m',[link.id]);
    link.pointsM.slice(1).forEach((point,i)=>{
      const previous=link.pointsM[i],horizontal=Math.abs(point.z-previous.z)<1e-6;
      const level=horizontal?[from,to].find(f=>f&&Math.abs(f.elevationM-point.z)<1e-6):undefined;
      trays.push({scope:level?`floor:${level.id}`:'building',from:previous,to:point,ids:[link.id]});
    });
  }
  if(project.floors.length>1){const root=project.floors[0];for(const floor of project.floors.slice(1))if(!project.backbones?.some(b=>b.fromFloorId===root.id&&b.toFloorId===floor.id))issue('MISSING_BACKBONE','楼层缺少到核心机柜的主干关系',[floor.id]);}
  const trayM=unionSegments(trays).reduce((n,s)=>n+pathLength3([s.from,s.to]),0);
  return {netCableM:mm(net),cableWithReserveM:mm(withAllowances*(1+project.settings.cableReserve)),trayM:mm(trayM),backboneM:mm(backboneM),independentLinks,issues};
}
