import type {Floor,Issue,Project,Vec2,Cable,Room} from '../domain/model';
import {containsPoint,distance,segmentBlocked} from '../domain/geometry';
import {calibrationIssues} from '../recognition/calibration';
import {roomCentre} from './candidates';
const compact=(points:Vec2[])=>points.filter((p,i)=>!i||distance(p,points[i-1])>1e-7);
/** Subdivide at boundary intersections so a narrow concavity cannot be skipped. */
export function segmentInside(a:Vec2,b:Vec2,polygon:Vec2[]):boolean{
  if(!containsPoint(a,polygon)||!containsPoint(b,polygon))return false;
  const cuts=[0,1],dx=b.x-a.x,dy=b.y-a.y;
  for(let i=0;i<polygon.length;i++){
    const c=polygon[i],d=polygon[(i+1)%polygon.length],wx=d.x-c.x,wy=d.y-c.y,den=dx*wy-dy*wx;if(Math.abs(den)<1e-9)continue;
    const t=((c.x-a.x)*wy-(c.y-a.y)*wx)/den,u=((c.x-a.x)*dy-(c.y-a.y)*dx)/den;if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
  }
  cuts.sort((a,b)=>a-b);return cuts.slice(1).every((t,i)=>{const mid=(t+cuts[i])/2;return containsPoint({x:a.x+dx*mid,y:a.y+dy*mid},polygon);});
}
function roomPaths(a:Vec2,b:Vec2,room:Room,floor:Floor):Vec2[][]{
  const project=(p:Vec2)=>{
    if(containsPoint(p,room.polygon))return p;
    if(!floor.openings.some(o=>o.confirmed&&o.roomIds.includes(room.id)&&distance(o.at,p)<1e-6))return undefined;
    const projected=room.polygon.map((a,i)=>{const b=room.polygon[(i+1)%room.polygon.length],dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;return {x:a.x+t*dx,y:a.y+t*dy};}).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    return projected&&distance(projected,p)<=.25+1e-7?projected:undefined;
  };
  const start=project(a),end=project(b);if(!start||!end)return [];
  const origin=room.polygon[0],next=room.polygon[1],len=distance(origin,next);if(len<1e-7)return [];
  const u={x:(next.x-origin.x)/len,y:(next.y-origin.y)/len},dot=(end.x-start.x)*u.x+(end.y-start.y)*u.y;
  const first={x:start.x+dot*u.x,y:start.y+dot*u.y},second={x:end.x-dot*u.x,y:end.y-dot*u.y};
  return [[start,first,end],[start,second,end]].map(compact).filter(path=>path.slice(1).every((p,i)=>segmentInside(path[i],p,room.polygon))).map(path=>compact([a,...path,b]));
}
export function routeFloor(source:Floor,enabledMonitoring=true):{floor:Floor;issues:Issue[]}{
  const floor=structuredClone(source),issues=calibrationIssues(floor.calibration),cabinet=floor.devices.find(d=>d.kind==='cabinet'),endpoints=floor.devices.filter(d=>d.kind!=='cabinet'&&(enabledMonitoring||d.kind!=='camera'));
  const inactiveCameraIds=new Set(!enabledMonitoring?floor.devices.filter(d=>d.kind==='camera').map(d=>d.id):[]),inactiveCameraCables=source.cables.filter(c=>inactiveCameraIds.has(c.toId)||inactiveCameraIds.has(c.fromId)).map(c=>structuredClone(c));
  const problem=(code:string,message:string,entityIds:string[])=>issues.push({code,severity:'blocking',message,entityIds});
  if(!cabinet){problem('MISSING_CABINET','本层缺少机柜，无法确定线路起点',[floor.id]);return {floor,issues};}
  const nodes:{at:Vec2;rooms:string[]}[]=[];
  const append=(at:Vec2,rooms?:string[])=>{nodes.push({at,rooms:rooms??floor.rooms.filter(r=>r.confirmed&&containsPoint(at,r.polygon)).map(r=>r.id)});return nodes.length-1;};
  append(cabinet.positionM);const ends=new Map(endpoints.map(d=>[d.id,append(d.positionM)]));
  for(const opening of floor.openings.filter(o=>o.confirmed))append(opening.at,opening.roomIds);
  for(const room of floor.rooms.filter(r=>r.confirmed))append(roomCentre(room),[room.id]);
  const trayNodes=(floor.trayPaths??[]).map(path=>path.map(p=>append(p)));
  const pairs=floor.rooms.reduce((n,r)=>{const count=nodes.filter(node=>node.rooms.includes(r.id)).length;return n+count*(count-1)/2;},0);
  const unscaled=issues.some(i=>i.severity==='blocking'),tooLarge=nodes.length>700||pairs>30_000;
  if(tooLarge)problem('ROUTING_COMPLEXITY','路由候选过多，请拆分楼层或简化门洞和线槽',[floor.id]);
  type Edge={to:number;points:Vec2[];cost:number;status:Cable['status']};
  const graph:Edge[][]=nodes.map(()=>[]);
  const connect=(a:number,b:number,points:Vec2[],status:Cable['status'],weight=1)=>{
    const cost=points.slice(1).reduce((n,p,i)=>n+distance(p,points[i]),0)*weight;
    if(cost<1e-8&&a!==b){graph[a].push({to:b,points,cost:0,status});graph[b].push({to:a,points:points.slice().reverse(),cost:0,status});return;}
    graph[a].push({to:b,points,cost,status});graph[b].push({to:a,points:points.slice().reverse(),cost,status});
  };
  if(!unscaled&&!tooLarge){
    for(const room of floor.rooms.filter(r=>r.confirmed)){
      const members=nodes.map((n,i)=>n.rooms.includes(room.id)?i:-1).filter(i=>i>=0);
      for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++){
        const a=members[i],b=members[j];
        const path=roomPaths(nodes[a].at,nodes[b].at,room,floor).find(path=>path.slice(1).every((p,i)=>!segmentBlocked(path[i],p,floor.walls,floor.openings)));
        if(path)connect(a,b,path,'confirmed');
      }
    }
    trayNodes.forEach(indices=>indices.slice(1).forEach((b,i)=>{
      const a=indices[i],from=nodes[a].at,to=nodes[b].at;if(!segmentInside(from,to,floor.boundary))return;
      const blocked=segmentBlocked(from,to,floor.walls,floor.openings);connect(a,b,[from,to],blocked?'provisional':'confirmed',blocked?3:.85);
    }));
  }
  const costs=nodes.map(()=>Infinity),previous:({from:number;edge:Edge}|undefined)[]=nodes.map(()=>undefined),visited=new Set<number>();costs[0]=0;
  for(let step=0;step<nodes.length;step++){
    let current=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(current<0||costs[i]<costs[current]-1e-7))current=i;
    if(current<0||!Number.isFinite(costs[current]))break;visited.add(current);
    for(const edge of graph[current])if(costs[current]+edge.cost<costs[edge.to]-1e-7){costs[edge.to]=costs[current]+edge.cost;previous[edge.to]={from:current,edge};}
  }
  floor.cables=endpoints.map(device=>{
    const old=source.cables.find(c=>c.toId===device.id&&c.fromId===cabinet.id);
    if(old?.locked){
      const copy=structuredClone(old);if(copy.pointsM.length<2||distance(copy.pointsM[0],cabinet.positionM)>1e-6||distance(copy.pointsM[copy.pointsM.length-1],device.positionM)>1e-6){copy.status='disconnected';problem('STALE_LOCKED_ROUTE','锁定线路端点已失效，请人工校正',[copy.id]);}
      else if(copy.pointsM.slice(1).some((p,i)=>!segmentInside(copy.pointsM[i],p,floor.boundary))){copy.status='disconnected';problem('STALE_LOCKED_ROUTE','锁定线路越出建筑边界，保留草图待校正',[copy.id]);}
      else if(copy.pointsM.slice(1).some((p,i)=>segmentBlocked(copy.pointsM[i],p,floor.walls,floor.openings))){copy.status='provisional';problem('PROVISIONAL_ROUTE','锁定路线与墙体相交，原路径保留但施工状态待确认',[copy.id]);}
      return copy;
    }
    const result:Cable={id:old?.id??`${floor.id}-cable-${device.id}`,floorId:floor.id,fromId:cabinet.id,toId:device.id,pointsM:[],locked:false,status:'disconnected'};
    const chain:Edge[]=[];let current=ends.get(device.id)!;
    while(current!==0&&previous[current]){const p=previous[current]!;chain.unshift(p.edge);current=p.from;}
    if(current===0&&chain.length){result.pointsM=compact(chain.flatMap(e=>e.points));result.status=chain.some(e=>e.status==='provisional')?'provisional':'confirmed';}
    if(result.status==='disconnected')problem('DISCONNECTED_CABLE','没有经已确认门洞/线槽连接机柜的路径，未猜测穿墙线路',[result.id,device.id]);
    else if(result.status==='provisional')problem('PROVISIONAL_ROUTE','用户线槽路径穿越待确认墙体，请核对施工条件',[result.id]);
    return result;
  });
  floor.cables.push(...inactiveCameraCables);
  return {floor,issues};
}
export function routeProject(source:Project):{project:Project;issues:Issue[]}{
  const project=structuredClone(source),issues:Issue[]=[];
  project.floors=project.floors.map((floor,index)=>{
    // One automatic building inlet; manually specified extra inlets are preserved.
    if(index>0)floor.devices=floor.devices.filter(d=>d.kind!=='wan'||d.source==='manual'||d.locked);
    const result=routeFloor(floor,project.settings.monitoring);issues.push(...result.issues);return result.floor;
  });
  const root=project.floors[0],cabinet=root?.devices.find(d=>d.kind==='cabinet');
  const existing=project.backbones??[];project.backbones=[];
  for(const floor of project.floors.slice(1)){
    const target=floor.devices.find(d=>d.kind==='cabinet');
    if(!cabinet||!target){issues.push({code:'MISSING_BACKBONE',severity:'blocking',message:'跨层缺少机柜，未生成虚构主干',entityIds:[floor.id]});continue;}
    const previous=existing.find(b=>b.fromFloorId===root.id&&b.toFloorId===floor.id);
    const first=previous?.pointsM[0],last=previous?.pointsM[previous.pointsM.length-1];
    const matches=previous?.fromId===cabinet.id&&previous.toId===target.id&&first&&last&&Math.hypot(first.x-cabinet.positionM.x,first.y-cabinet.positionM.y,first.z-root.elevationM)<1e-6&&Math.hypot(last.x-target.positionM.x,last.y-target.positionM.y,last.z-floor.elevationM)<1e-6;
    if(previous&&(previous.locked||(matches&&previous.status!=='disconnected'))){project.backbones.push(previous);continue;}
    const points=[{...cabinet.positionM,z:root.elevationM},{...cabinet.positionM,z:floor.elevationM},{...target.positionM,z:floor.elevationM}].filter((p,i,list)=>!i||Math.hypot(p.x-list[i-1].x,p.y-list[i-1].y,p.z-list[i-1].z)>1e-7);
    project.backbones.push({id:previous?.id??`backbone-${floor.id}`,fromFloorId:root.id,toFloorId:floor.id,fromId:cabinet.id,toId:target.id,medium:previous?.medium??'fiber',status:'provisional',locked:false,pointsM:points});
  }
  for(const b of project.backbones)if(b.status==='provisional')issues.push({code:'BACKBONE_CONFIRMATION',severity:'blocking',message:'默认竖井/楼高是假设，请确认跨层实际路径',entityIds:[b.id]});
  return {project,issues};
}
