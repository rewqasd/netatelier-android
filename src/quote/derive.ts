import type {Project,Catalog,DerivedProject,Issue} from '../domain/model';
import {measureProject} from './quantities';
import {allocate,endpointModel,type Endpoint} from './allocation';
import {recording,num} from './storage';
import {Bill,copperRuns,packCableRuns} from './pricing';
import {priceOf} from '../catalog/prices';
import {pathLength3} from '../planning/line-union';
import {assessFloor} from '../planning/assess';
export function deriveProject(project:Project,catalog:Catalog):DerivedProject {
  const quantities=measureProject(project),issues:Issue[]=[...quantities.issues,...project.floors.flatMap(f=>assessFloor(f,project.settings))],bill=new Bill(project,catalog),endpoints:Endpoint[]=[];
  const blocking=(code:string,message:string,entityIds:string[]=[])=>issues.push({code,severity:'blocking',message,entityIds});
  const seenFloors=new Set<string>();
  for(const b of project.backbones??[]){if(b.fromFloorId!==project.floors[0].id||seenFloors.has(b.toFloorId))blocking('BACKBONE_TOPOLOGY_UNSUPPORTED','本版仅分配主机柜到各楼层的一条星形主干；重复链路/环网需另行设计。',[b.id]);seenFloors.add(b.toFloorId);}
  let cameras=0,infos=0,aps=0;
  for(const f of project.floors)for(const d of f.devices){
    if(d.kind==='cabinet'||d.kind==='wan'||d.kind==='camera'&&!project.settings.monitoring)continue;
    const item=d.kind==='information'?undefined:endpointModel(d,f,project,catalog);
    if(d.kind==='camera')cameras++;if(d.kind==='information')infos++;if(d.kind==='ap')aps++;
    if(d.kind!=='information'&&!item)blocking('MODEL_UNAVAILABLE',`点位${d.label}没有匹配当前规格的已知型号。`,[d.id]);
    if(item){bill.add(item,1,d.kind==='camera'?'monitoring':'network',`${f.name}实际点位数量`,f.id);if(!['af','at'].includes(String(item.specs.poe)))blocking('POWER_STANDARD_UNKNOWN','未核实为802.3af/at标准PoE，不能承诺供电兼容',[d.id]);if(d.kind==='camera'&&!(num(item,'maxBitrateMbps')>=project.settings.bitrateMbps))blocking('CAMERA_BITRATE','录像码率超出摄像机核实范围',[d.id]);}
    endpoints.push({id:d.id,floorId:f.id,watts:d.kind==='information'?0:item?num(item,'poeW'):NaN,model:item,kind:d.kind,label:d.label,deviceId:d.id});
  }
  const record=recording(project,catalog,cameras);issues.push(...record.issues);
  if(record.nvr)bill.add(record.nvr,1,'monitoring',`${cameras}路摄像机；通道及接入带宽预留20%；连续录像需${record.requiredTB.toFixed(2)}TB`);
  for(const disk of record.disks)bill.add(disk,1,'monitoring',`${project.settings.retentionDays}天、${project.settings.bitrateMbps}Mbps/路、24小时连续录像含10%开销；不假定智能编码节省量`);
  const network=allocate(project,catalog,endpoints,record.nvr);issues.push(...network.issues);
  for(const purchase of network.purchases)bill.add(purchase.item,1,'network','同一端口与供电分配生成；含上联占口，内置AC不另收费',purchase.floorId);
  const cables=catalog.filter(m=>m.category==='cable'&&m.specs.medium==='copper'&&num(m,'lengthM')===(project.settings.cablePurchase==='box'?305:1)).sort((a,b)=>priceOf(a,project)-priceOf(b,project)),cable=cables[0],runs=copperRuns(project);
  let purchase=0;if(project.settings.cablePurchase==='box'){try{purchase=packCableRuns(runs,305).length}catch{blocking('CABLE_CUT_LENGTH','存在超过整箱长度的单根线路，不能拼接余线掩盖问题');}}else purchase=Math.ceil(runs.reduce((n,v)=>n+v,0)-1e-9);
  bill.add(cable,purchase,'materials','每根独立铜缆：路径+两端预留+引下后，加一次损耗；整箱按连续裁线配箱，按米向上取整');
  bill.add(catalog.find(m=>m.category==='tray'),Math.ceil(quantities.trayM),'materials','物理共线路径去重，含楼层竖井，仅桥架/线槽按共线计一次');
  bill.add(bill.role('module'),infos,'materials','实际信息点模块与面板');
  bill.add(bill.role('termination'),quantities.independentLinks*2-infos,'materials','非信息点两端水晶头，信息点墙面端已计模块，不重复计水晶头');
  for(const [index,f] of project.floors.entries()){
    const cabinet=bill.role('cabinet'),count=f.devices.filter(d=>d.kind==='cabinet').length;
    bill.add(cabinet,count,'materials','每个设备汇聚位置1套机柜/弱电箱、托板、理线及PDU；柜型与220V电源现场复核',f.id);
    const equipmentU=network.purchases.filter(p=>p.floorId===f.id||!p.floorId&&index===0).length+(index===0&&record.nvr?2:0)+((project.backbones??[]).some(b=>b.medium==='fiber'&&(b.fromFloorId===f.id||b.toFloorId===f.id))?1:0)+2;
    if(!count||!cabinet||!(num(cabinet,'rackU')*count>=equipmentU))blocking('CABINET_CAPACITY',`${f.name}按网络设备1U/台、NVR2U、收发器托板及理线通风估算需${equipmentU}U，机柜容量不足/未知；需调整柜型。`,[f.id]);
  }
  const links=network.topology.edges.filter(e=>e.from.startsWith('infra-')&&e.to.startsWith('infra-'));
  bill.add(bill.role('patch'),links.filter(e=>e.label==='千兆机柜跳线'||e.label.startsWith('P')||e.label.startsWith('LAN')).length+infos,'materials','机柜内上联/录像机/AC/收发器跳线及信息点终端跳线');
  for(const b of project.backbones??[]){
    if(b.medium!=='fiber'||b.status==='disconnected'||b.pointsM.length<2)continue;
    bill.add(catalog.find(m=>m.category==='cable'&&m.specs.medium==='fiber'),Math.ceil((pathLength3(b.pointsM)+2*project.settings.endpointAllowanceM)*(1+project.settings.cableReserve)),'materials','独立楼层光纤主干含两端预留及一次损耗，不重复计入水平铜缆');
    const pair=bill.role('converter-pair');
    if(pair)bill.add(pair,1,'network','每条光纤主干A/B配对收发器（含电源），两端各占交换机一个RJ45口');else bill.add(bill.role('converter'),2,'network','每条光纤主干两端收发器，需核实成对兼容');
    bill.add(bill.role('fiber-end'),2,'materials','光纤主干两端端接/尾纤及保护盒');
  }
  if(project.settings.laborMode==='fixed')bill.lines.push({id:'labor-fixed',modelId:'labor-fixed',name:'施工与调试包干（人工改价）',quantity:1,unit:'项',unitCents:project.settings.fixedLaborCents,subtotalCents:project.settings.fixedLaborCents,section:'labor',basis:'替代全部分项人工；不与分项重复累加',priceKind:'user'});
  else{bill.add(bill.role('wire'),quantities.independentLinks+(project.backbones?.filter(b=>b.status!=='disconnected').length??0),'labor','每条独立链路敷设、端接与测试；不含高空作业/土建/强电/夜间溢价');bill.add(bill.role('mount'),aps+cameras,'labor','AP与摄像机安装定位；布线端接已在布线项，不重复');bill.add(bill.role('setup'),1,'labor','网关、AC、交换与录像联调一次');}
  for(const b of project.business){const item=catalog.find(m=>m.id===b.modelId&&m.category==='optional');if(!item)blocking('OPTIONAL_MODEL_UNKNOWN','已加入的经营设备型号不在目录内',[b.id]);
    if(b.purchase)bill.add(item,b.quantity,'optional','用户主动加入并选择采购；不含行业软件订阅/支付服务费',b.floorId);
    if(b.network==='wired'&&project.floors.flatMap(f=>f.devices).filter(d=>d.businessId===b.id).length!==b.quantity)blocking('OPTIONAL_ENDPOINT_MISMATCH','经营设备数量与有线信息点不一致',[b.id]);
    if(b.network==='wifi')network.topology.nodes.push({id:`business-${b.id}`,label:`${item?.name??b.modelId} ×${b.quantity} · 无线接入待确认`,kind:'wireless-business',floorId:b.floorId});
  }
  for(const f of project.floors){const added=project.business.filter(b=>b.floorId===f.id&&b.network==='wifi').reduce((n,b)=>n+b.quantity,0),capacity=f.devices.filter(d=>d.kind==='ap').reduce((n,d)=>n+((d.wifi??f.wifi??project.settings.wifi)===6?40:25),0);
    if(added&&Math.max(f.demand.concurrentUsers,Math.ceil(f.demand.terminals*.6))+added>capacity)issues.push({code:'BUSINESS_WIFI_CAPACITY',severity:'warning',message:`${f.name}加入的${added}台无线经营设备可能超过规划并发容量；未虚增交换机端口，需调整AP数量或分配。`,entityIds:[f.id]});
  }
  issues.push(...bill.issues);
  if(bill.lines.some(l=>l.priceKind==='estimate'))issues.push({code:'ESTIMATED_PRICES',severity:'warning',message:'含待核实预算单价；不是实时电商成交价或施工合同报价，可逐项改价。',entityIds:[]});
  issues.push({code:'COMMISSIONING_REQUIRED',severity:'warning',message:'需现场复核射频、信道、隐私遮挡、竖井与强电供电；不含运营商月租、税运差异及破墙修复。',entityIds:[]});
  const totals:DerivedProject['totals']={network:0,monitoring:0,materials:0,labor:0,optional:0};for(const line of bill.lines)totals[line.section]+=line.subtotalCents;
  const totalCents=Object.values(totals).reduce((a,b)=>a+b,0);if(!Number.isSafeInteger(totalCents))throw new Error('总金额超出安全范围');
  return {quantities,switches:network.switches,bom:bill.lines,totalCents,totals,issues,complete:!issues.some(i=>i.severity==='blocking'),topology:network.topology};
}
