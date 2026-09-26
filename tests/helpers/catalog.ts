import type {Catalog, CatalogItem, Device} from '../../src/domain/model';
import {minimalProject} from './projects';
export const item=(id:string,category:CatalogItem['category'],unitCents:number,specs:CatalogItem['specs']={},unit='台'):CatalogItem=>({id,category,brand:'Fixture',model:id,name:id,unit,unitCents,priceKind:'estimate',conditions:'independent test fixture',specs});
export function fixtureCatalog():Catalog{return [
  item('ap6','ap',39500,{wifi:6,mount:'ceiling',poeW:10,poe:'af',acFamily:'tp'}),item('ap5','ap',19900,{wifi:5,mount:'ceiling',poeW:8,poe:'af',acFamily:'tp'}),
  item('gw','gateway',30000,{ports:4,poePorts:0,poeW:0,portW:0,clients:1000,bandwidthMbps:1000,acCapacity:100,acFamily:'tp'}),
  item('gw-poe','gateway',150000,{ports:8,poePorts:8,poeW:120,portW:30,clients:1000,bandwidthMbps:1000,acCapacity:100,acFamily:'tp'}),
  item('sw8','switch',20000,{ports:8,poePorts:8,poeW:45,portW:30}),item('sw16','switch',60000,{ports:16,poePorts:16,poeW:120,portW:30}),
  item('cam','camera',20000,{poeW:6,poe:'af',codec:'h265',maxBitrateMbps:6}),
  item('nvr8','nvr',30000,{channels:8,inputMbps:40,diskBays:1,maxDiskTB:6,codec:'h265'}),
  item('nvr16','nvr',60000,{channels:16,inputMbps:80,diskBays:2,maxDiskTB:10,codec:'h265'}),
  item('disk4','disk',40000,{tb:4,interface:'sata'}),item('disk8','disk',70000,{tb:8,interface:'sata'}),
  item('cat6-box','cable',60000,{medium:'copper',lengthM:305},'箱'),item('cat6-m','cable',220,{medium:'copper',lengthM:1},'米'),
  item('tray','tray',500,{},'米'),item('module','material',1800,{role:'module'},'套'),
  item('termination','material',300,{role:'termination'},'端'),item('patch','material',1000,{role:'patch'},'条'),item('cabinet','material',30000,{role:'cabinet',rackU:9},'套'),
  item('fiber-m','cable',300,{medium:'fiber',lengthM:1},'米'),item('converter','material',15000,{role:'converter',medium:'singlemode-duplex',speedMbps:1000},'台'),item('fiber-end','material',3500,{role:'fiber-end'},'端'),
  item('wire-labor','labor',8000,{role:'wire'},'链路'),item('mount-labor','labor',5000,{role:'mount'},'台'),item('setup-labor','labor',20000,{role:'setup'},'项'),
  item('pc','optional',250000,{scenes:'restaurant,office,gym,hotel,retail',network:'wired'}),
]}
export function quoteProject(aps=4,cameras=0,information=0){
  const p=minimalProject();p.settings.cablePurchase='metre';p.settings.portReserve=0;p.settings.poeReserve=.25;
  const f=p.floors[0];f.devices=[{id:'cab',floorId:f.id,kind:'cabinet',label:'cab',positionM:{x:1,y:1},source:'manual',locked:false}];
  for(const [kind,n] of [['ap',aps],['camera',cameras],['information',information]] as const)for(let i=0;i<n;i++){
    const d:Device={id:`${kind}${i}`,floorId:f.id,kind,label:`${kind}${i}`,positionM:{x:5+i*.1,y:5},source:'manual',locked:false,roomId:'r1'};
    if(kind==='ap'){d.wifi=6;d.mount='ceiling'}f.devices.push(d);
    f.cables.push({id:`c-${d.id}`,floorId:f.id,fromId:'cab',toId:d.id,pointsM:[{x:1,y:1},{x:d.positionM.x,y:1},d.positionM],status:'confirmed',locked:false});
  }return p;
}
