import type {Project,Catalog,CatalogItem,BomLine,Issue} from '../domain/model';
import {priceOf} from '../catalog/prices';
import {distance} from '../domain/geometry';
import {pathLength3} from '../planning/line-union';
/** First-fit decreasing is feasible cut packing, not a global optimum promise. */
export function packCableRuns(runs:number[],boxM:number):number[]{
  if(!Number.isFinite(boxM)||boxM<=0||runs.some(n=>!Number.isFinite(n)||n<0||n>boxM))throw new Error('单根线路不能超过整箱长度，也不能接续余料');
  const boxes:number[]=[];
  for(const run of [...runs].filter(n=>n>0).sort((a,b)=>b-a)){
    const index=boxes.findIndex(n=>n+run<=boxM+1e-8);if(index<0)boxes.push(run);else boxes[index]+=run;
  }return boxes;
}
export function copperRuns(project:Project):number[]{
  const out:number[]=[];
  for(const f of project.floors){if(f.calibration.kind==='unset')continue;
    const active=new Set(f.devices.filter(d=>d.kind!=='camera'||project.settings.monitoring).map(d=>d.id));
    for(const c of f.cables)if(active.has(c.toId)&&c.status!=='disconnected'&&c.pointsM.length>1)out.push((c.pointsM.slice(1).reduce((n,p,i)=>n+distance(p,c.pointsM[i]),0)+2*project.settings.endpointAllowanceM+project.settings.dropM)*(1+project.settings.cableReserve));
  }
  for(const b of project.backbones??[])if(b.medium==='copper'&&b.status!=='disconnected'&&b.pointsM.length>1)out.push((pathLength3(b.pointsM)+2*project.settings.endpointAllowanceM)*(1+project.settings.cableReserve));
  return out;
}
export class Bill {
  lines:BomLine[]=[];issues:Issue[]=[];
  constructor(readonly project:Project,readonly catalog:Catalog){}
  add(item:CatalogItem|undefined,quantity:number,section:BomLine['section'],basis:string,floorId?:string):void{
    if(quantity<=0)return;
    if(!item){this.issues.push({code:'MISSING_CATALOG_ITEM',severity:'blocking',message:`未找到所需材料/服务：${basis}`,entityIds:[]});return;}
    if(!Number.isInteger(quantity)||quantity>1e8)throw new Error('采购数量必须为有限非负整数');
    const unitCents=priceOf(item,this.project),subtotalCents=unitCents*quantity;if(!Number.isSafeInteger(subtotalCents))throw new Error('金额超出安全范围');
    const previous=this.lines.find(l=>l.modelId===item.id&&l.floorId===floorId&&l.section===section);
    if(previous){previous.quantity+=quantity;previous.subtotalCents+=subtotalCents;return;}
    this.lines.push({id:`bom-${this.lines.length+1}`,modelId:item.id,floorId,name:`${item.name} · ${item.model}`,unit:item.unit,quantity,unitCents,subtotalCents,section,basis,priceKind:this.project.priceOverrides[item.id]!==undefined?'user':item.priceKind});
  }
  role(role:string):CatalogItem|undefined{return this.catalog.filter(m=>m.specs.role===role).sort((a,b)=>priceOf(a,this.project)-priceOf(b,this.project))[0]}
}
