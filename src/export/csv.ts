import type {Project,DerivedProject} from '../domain/model';
import {catalog} from '../catalog/models';
export function csvCell(value:string|number):string{
 let text=String(value);if(typeof value==='string'&&/^[\s\u0000-\u001f]*[=+@-]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
export function quoteCsv(project:Project,derived:DerivedProject):string{
 const rows:(string|number)[][]=[['组网工坊 0.1.0',project.name],['工程更新时间',project.updatedAt],['性质',derived.complete?'预算估算，非施工承诺':'待确认预算，不可直接施工'],['分类','楼层','项目','品牌型号','数量','单位','单价（元）','小计（元）','计价依据','价格性质','核查日期','价格/规格来源','使用条件']];
 for(const l of derived.bom){const m=catalog.find(m=>m.id===l.modelId);rows.push([l.section,project.floors.find(f=>f.id===l.floorId)?.name??'全项目',l.name,m?`${m.brand} ${m.model}`:l.modelId,l.quantity,l.unit,(l.unitCents/100).toFixed(2),(l.subtotalCents/100).toFixed(2),l.basis,l.priceKind==='user'?'人工改价':l.priceKind==='page'?'页面参考':'待核实估算',m?.checkedAt??'',m?.sourceUrl??m?.specificationUrl??'',m?.conditions??'']);}
 rows.push(['金额（元）',(derived.totalCents/100).toFixed(2)]);
 for(const i of derived.issues)rows.push([i.severity==='blocking'?'待确认':'说明',i.code,i.message]);
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
