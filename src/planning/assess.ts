import type {Floor,Issue,Settings} from '../domain/model';
import {containsPoint,distance} from '../domain/geometry';
import {effectiveDistance} from './ap';
import {cameraAllowed,roomGrid} from './candidates';
import {cameraSees} from './cameras';
/** Evaluate the applied inventory, never generate better replacement points behind the UI. */
export function assessFloor(floor:Floor,settings:Settings):Issue[]{
 const issues:Issue[]=[],add=(code:string,message:string,entityIds:string[]=[],severity:Issue['severity']='warning')=>issues.push({code,message,entityIds,severity});
 const aps=floor.devices.filter(d=>d.kind==='ap'),cameras=floor.devices.filter(d=>d.kind==='camera'),capacity=aps.reduce((n,d)=>n+((d.wifi??floor.wifi??settings.wifi)===6?40:25),0);
 if(capacity<Math.max(floor.demand.concurrentUsers,Math.ceil(floor.demand.terminals*.6)))add('AP_CAPACITY',`${floor.name}的现有AP低于规划并发容量，请调整数量或需求。`,[floor.id]);
 if(floor.rooms.length>100||floor.rooms.reduce((n,r)=>n+r.polygon.length,0)>4096) {add('ASSESSMENT_COMPLEXITY','本层房间几何过多，未执行完整覆盖评估，请拆分或简化。',[floor.id],'blocking');return issues;}
 const samples=floor.rooms.filter(r=>r.needsWifi!==false&&!['equipment','toilet','shower','storage'].includes(r.use)).flatMap(r=>roomGrid(r,3).map(at=>({at,roomId:r.id})));
 if(samples.length*Math.max(1,aps.length)*Math.max(1,floor.walls.length)>5_000_000)add('ASSESSMENT_COMPLEXITY','本层覆盖评估超出计算上限，未宣称覆盖完成。',[floor.id],'blocking');
 else{const missed=samples.filter(s=>!aps.some(d=>effectiveDistance(floor,d.positionM,s.at)<=8.5));if(missed.length)add('AP_COVERAGE',`${floor.name}仍有${missed.length}个采样位置未达到简化覆盖阈值。`,[...new Set(missed.map(s=>s.roomId))]);}
 for(let i=0;i<aps.length;i++)for(let j=i+1;j<aps.length;j++)if(distance(aps[i].positionM,aps[j].positionM)<2.5)add('AP_NEIGHBOURS','两个AP安装点距离小于2.5米，请核查隔墙、功率和同频干扰；未自动移动手工点位。',[aps[i].id,aps[j].id]);
 if(floor.walls.some(w=>w.material==='unknown'))add('UNKNOWN_WALLS','存在未知墙体材质，覆盖折减仅为预算假设。',[floor.id]);
 if(floor.rooms.some(r=>!r.confirmed))add('UNCONFIRMED_ROOMS','仍有房间未确认，规划需人工校正。',[floor.id],'blocking');
 if(settings.monitoring){
  for(const camera of cameras)if(!cameraAllowed(floor,camera.positionM))add('ILLEGAL_CAMERA','摄像头位于隐私区、默认排除区或建筑外，请人工修正。',[camera.id],'blocking');
  if(floor.targets.length*Math.max(1,cameras.length)*Math.max(1,floor.walls.length)>2_000_000)add('CAMERA_ASSESSMENT_COMPLEXITY','监控遮挡关系过多，未执行完整目标评估。',[floor.id],'blocking');
  else for(const target of floor.targets)if(!cameras.some(camera=>cameraSees(floor,camera,target)))add('UNCOVERED_TARGET',`${floor.rooms.find(r=>r.id===target.roomId)?.name??floor.name}的监控目标未覆盖，需校正位置、方向或目标。`,[target.id]);
 }
 for(const d of floor.devices)if((settings.monitoring||d.kind!=='camera')&&!containsPoint(d.positionM,floor.boundary))add('OUTSIDE_DEVICE','点位位于建筑边界之外。',[d.id],'blocking');
 add('PLACEMENT_ASSUMPTIONS','AP按Wi-Fi6每台40/ Wi-Fi5每台25活跃终端、8.5m折减距离规划；监控按14m/90°简化视线。均非现场覆盖保证。',[floor.id]);
 return issues;
}
