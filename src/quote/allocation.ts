import type {Project,Catalog,CatalogItem,Device,Floor,Issue,SwitchAllocation,TopologyGraph} from '../domain/model';
import {num} from './storage';
import {priceOf} from '../catalog/prices';
export interface Endpoint {id:string;floorId:string;watts:number;model?:CatalogItem;kind:string;label:string;deviceId?:string}
export interface NetworkAllocation {switches:SwitchAllocation[];purchases:{item:CatalogItem;floorId?:string}[];topology:TopologyGraph;issues:Issue[]}
export function endpointModel(device:Device,floor:Floor,project:Project,catalog:Catalog):CatalogItem|undefined{
  const id=device.modelId??(device.kind==='ap'?floor.apModelId:undefined),radio=device.wifi??floor.wifi??project.settings.wifi;
  const compatible=(m:CatalogItem)=>m.category===device.kind&&(device.kind!=='ap'||m.specs.wifi===radio&&m.specs.mount===(device.mount??'ceiling'));
  return id?catalog.find(m=>m.id===id&&compatible(m)):catalog.filter(compatible).sort((a,b)=>priceOf(a,project)-priceOf(b,project))[0];
}
function fits(item:CatalogItem,points:Endpoint[],links:number,project:Project):boolean{
  const load=points.reduce((n,p)=>n+p.watts,0),poe=points.filter(p=>p.watts>0);
  return points.every(p=>Number.isFinite(p.watts))&&Math.ceil(points.length*(1+project.settings.portReserve))+links<=num(item,'ports')&&poe.length<=num(item,'poePorts')&&load*(1+project.settings.poeReserve)<=num(item,'poeW')+1e-9&&poe.every(p=>p.watts<=num(item,'portW'));
}
interface Group {item:CatalogItem;points:Endpoint[];links:number}
/** Min-cost contiguous partition of power-sorted endpoints, with a reserved inter-switch chain. */
function floorGroups(points:Endpoint[],firstLinks:number,project:Project,catalog:Catalog):Group[]|undefined{
  const ordered=[...points].sort((a,b)=>b.watts-a.watts||a.id.localeCompare(b.id)),models=catalog.filter(m=>m.category==='switch'),memo=new Map<number,{cost:number;groups:Group[]}|null>();
  const solve=(start:number):{cost:number;groups:Group[]}|undefined=>{
    if(memo.has(start))return memo.get(start)??undefined;
    let best:{cost:number;groups:Group[]}|undefined;
    for(const item of models){const max=Math.min(ordered.length,start+Math.min(128,num(item,'ports')));
      for(let end=start+(ordered.length===0?0:1);end<=max;end++){
        const final=end===ordered.length,links=(start===0?firstLinks:1)+(final?0:1),slice=ordered.slice(start,end);
        if(!fits(item,slice,links,project))continue;
        const rest=final?{cost:0,groups:[]}:solve(end);if(!rest)continue;
        const cost=priceOf(item,project)+rest.cost;if(!best||cost<best.cost)best={cost,groups:[{item,points:slice,links},...rest.groups]};
      }
    }memo.set(start,best??null);return best;
  };return solve(0)?.groups;
}
export function allocate(project:Project,catalog:Catalog,endpoints:Endpoint[],nvr?:CatalogItem):NetworkAllocation{
  const empty:NetworkAllocation={switches:[],purchases:[],topology:{nodes:endpoints.map(p=>({id:p.id,label:p.label,kind:p.kind,floorId:p.floorId,deviceId:p.deviceId})),edges:[]},issues:[]};
  const root=project.floors[0],aps=endpoints.filter(p=>p.kind==='ap'),clients=project.floors.reduce((n,f)=>n+Math.max(f.demand.terminals,f.demand.concurrentUsers),0)+project.business.filter(b=>b.network!=='none').reduce((n,b)=>n+b.quantity,0);
  const gateways=catalog.filter(m=>m.category==='gateway'&&num(m,'clients')>=clients&&num(m,'bandwidthMbps')>=project.settings.bandwidthMbps&&num(m,'ports')>=1);
  if(!gateways.length){empty.issues.push({code:'NO_GATEWAY_CAPACITY',severity:'blocking',message:'目录中没有带机量与宽带匹配的网关，或容量参数未核实。',entityIds:[]});return empty;}
  let best:NetworkAllocation|undefined,bestCost=Infinity,acPossible=false;
  for(const gateway of gateways){
    let ac:CatalogItem|undefined;
    const acFits=(m:CatalogItem)=>num(m,'acCapacity')>=aps.length&&aps.every(a=>a.model?.specs.acFamily===m.specs.acFamily);
    if(aps.length&&!acFits(gateway)){ac=catalog.filter(m=>m.category==='ac'&&acFits(m)).sort((a,b)=>priceOf(a,project)-priceOf(b,project))[0];if(!ac)continue;}acPossible=true;
    const extra:Endpoint[]=[...(nvr?[{id:'infra-nvr',floorId:root.id,watts:0,kind:'nvr',label:nvr.model,model:nvr}]:[]),...(ac?[{id:'infra-ac',floorId:root.id,watts:0,kind:'ac',label:ac.model,model:ac}]:[])];
    const all=[...endpoints,...extra],direct=project.floors.length===1&&fits(gateway,all,0,project);
    const groups=direct?[]:project.floors.map((f,i)=>floorGroups(all.filter(p=>p.floorId===f.id),i===0?project.floors.length:1,project,catalog));
    if(!direct&&groups.some(g=>!g))continue;
    const result:NetworkAllocation={switches:[],purchases:[{item:gateway},...(ac?[{item:ac}]:[])],topology:{nodes:[{id:'infra-gateway',kind:'gateway',label:gateway.model,floorId:root.id},...all.map(p=>({id:p.id,label:p.label,kind:p.kind,floorId:p.floorId,...(p.deviceId?{deviceId:p.deviceId}:{})}))],edges:[]},issues:[]};
    const edge=(from:string,to:string,label:string)=>result.topology.edges.push({id:`edge-${result.topology.edges.length+1}`,from,to,label});
    if(direct){result.switches.push({id:'infra-gateway',floorId:root.id,modelId:gateway.id,endpointIds:all.map(p=>p.id),uplinkPorts:0,loadW:all.reduce((n,p)=>n+p.watts,0),portAssignments:all.map((p,i)=>({endpointId:p.id,port:i+1}))});for(const [i,p] of all.entries())edge('infra-gateway',p.id,`LAN${i+1}${p.watts?' · PoE':''}`);}
    else for(const [fi,fg] of groups.entries())for(const [gi,group] of fg!.entries()){
      const floor=project.floors[fi],id=`infra-switch-${fi}-${gi}`;result.purchases.push({item:group.item,floorId:floor.id});
      result.switches.push({id,floorId:floor.id,modelId:group.item.id,endpointIds:group.points.map(p=>p.id),uplinkPorts:group.links,loadW:group.points.reduce((n,p)=>n+p.watts,0),portAssignments:group.points.map((p,i)=>({endpointId:p.id,port:i+1}))});
      result.topology.nodes.push({id,kind:'switch',label:group.item.model,floorId:floor.id});
      for(const [i,p] of group.points.entries())edge(id,p.id,`P${i+1}${p.watts?' · PoE':''}`);
      const parent=gi>0?`infra-switch-${fi}-${gi-1}`:fi>0?'infra-switch-0-0':'infra-gateway';
      const backbone=fi>0&&gi===0?project.backbones?.find(b=>b.fromFloorId===root.id&&b.toFloorId===floor.id):undefined;
      if(backbone?.medium==='fiber'){
        const pair=catalog.find(m=>m.specs.role==='converter-pair'),a=`infra-converter-${fi}-a`,b=`infra-converter-${fi}-b`;
        result.topology.nodes.push({id:a,kind:'converter',label:pair?`${pair.model} · A端`:'收发器A端 · 待选型',floorId:root.id},{id:b,kind:'converter',label:pair?`${pair.model} · B端`:'收发器B端 · 待选型',floorId:floor.id});
        edge(parent,a,'千兆机柜跳线');edge(a,b,`楼层光纤主干 · ${backbone.status==='confirmed'?'已确认':'待确认'}`);edge(b,id,'千兆机柜跳线');
      }else edge(parent,id,fi>0&&gi===0?`楼层铜缆主干 · ${backbone?.status==='confirmed'?'已确认':'待确认'}`:'千兆机柜跳线');
    }
    // WAN is attached to the gateway, not counted as a powered LAN endpoint.
    for(const f of project.floors)for(const w of f.devices.filter(d=>d.kind==='wan')){result.topology.nodes.push({id:w.id,label:w.label,kind:'wan',deviceId:w.id,floorId:f.id});edge(w.id,'infra-gateway','宽带入户 · WAN');}
    const cost=result.purchases.reduce((n,p)=>n+priceOf(p.item,project),0);if(cost<bestCost){best=result;bestCost=cost;}
  }
  if(best)return best;
  empty.issues.push({code:acPossible?'NO_SWITCH_CAPACITY':'NO_AC_CAPACITY',severity:'blocking',message:acPossible?'交换机端口、单口功率或逐台PoE预算不足/未知。':'缺少兼容且容量足够的AC；不会重复购买已集成AC。',entityIds:[]});return empty;
}
