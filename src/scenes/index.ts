import type { Project, SceneId } from '../domain/model';
import { restaurant } from './restaurant';
import { office } from './office';
import { gym } from './gym';
import { hotel } from './hotel';
import { retail } from './retail';
export const sceneMeta: {id:SceneId;name:string;summary:string}[]=[
  {id:'restaurant',name:'400㎡ 餐厅',summary:'入口 / 就餐 / 包间 / 后厨'},
  {id:'office',name:'300㎡ 办公企业',summary:'30名员工 / 开放办公 / 会议室'},
  {id:'gym',name:'1000㎡ 健身房',summary:'有氧 / 力量 / 团操 / 隐私区'},
  {id:'hotel',name:'40间客房酒店',summary:'4层共1600㎡ / 每层10间'},
  {id:'retail',name:'200㎡ 零售门店',summary:'销售 / 收银 / 仓储'},
];
export function createScene(id:SceneId):Project{
  const meta=sceneMeta.find(m=>m.id===id);if(!meta)throw new Error('未知场景');
  const now=new Date().toISOString();
  return {schemaVersion:1,id:`p-${crypto.randomUUID()}`,scene:id,name:meta.name,revision:0,createdAt:now,updatedAt:now,
    settings:{wifi:6,bandwidthMbps:1000,monitoring:true,retentionDays:30,bitrateMbps:3,cableReserve:0.1,endpointAllowanceM:1,dropM:2,portReserve:0.2,poeReserve:0.25,cablePurchase:'box',laborMode:'itemized',fixedLaborCents:0},
    floors:({restaurant,office,gym,hotel,retail})[id](),business:[],priceOverrides:{}};
}
