import type {Catalog,Project,CatalogItem,Issue} from '../domain/model';
import {priceOf} from '../catalog/prices';
export interface Recording {nvr?:CatalogItem;disks:CatalogItem[];requiredTB:number;issues:Issue[]}
export const num=(m:CatalogItem,key:string):number=>typeof m.specs[key]==='number'&&Number.isFinite(m.specs[key])?m.specs[key] as number:NaN;
export function recording(project:Project,catalog:Catalog,cameras:number):Recording{
  const requiredTB=cameras*project.settings.bitrateMbps*86400*project.settings.retentionDays/8/1e6*1.1;
  if(!cameras)return {disks:[],requiredTB:0,issues:[]};
  let best:{nvr:CatalogItem;disks:CatalogItem[];cost:number}|undefined;
  for(const nvr of catalog.filter(m=>m.category==='nvr')){
    if(!(num(nvr,'channels')>=Math.ceil(cameras*1.2))||!(num(nvr,'inputMbps')>=cameras*project.settings.bitrateMbps*1.2)||nvr.specs.codec!=='h265')continue;
    const disks=catalog.filter(m=>m.category==='disk'&&m.specs.interface==='sata'&&num(m,'tb')>0&&num(m,'tb')<=num(nvr,'maxDiskTB'));
    const bays=Math.min(8,num(nvr,'diskBays'));let visits=0;
    const search=(selected:CatalogItem[],start:number,tb:number,cost:number)=>{
      if(++visits>10000)return;
      if(tb>=requiredTB){if(!best||cost<best.cost)best={nvr,disks:[...selected],cost};return;}
      if(selected.length>=bays||!Number.isFinite(bays)||best&&cost>=best.cost)return;
      for(let i=start;i<disks.length;i++)search([...selected,disks[i]],i,tb+num(disks[i],'tb'),cost+priceOf(disks[i],project));
    };search([],0,0,priceOf(nvr,project));
  }
  return best?{nvr:best.nvr,disks:best.disks,requiredTB,issues:[]}:{disks:[],requiredTB,issues:[{code:'NO_RECORDING_CAPACITY',severity:'blocking',message:`录像通道/接入带宽/盘位不足或参数未知；连续录像含10%开销需${requiredTB.toFixed(2)}TB，不能承诺留存天数。`,entityIds:[]}]};
}
