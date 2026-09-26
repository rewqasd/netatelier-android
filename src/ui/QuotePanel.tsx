import {useState} from 'react';
import type {BomLine,DerivedProject,Floor,Project,ProjectEdit} from '../domain/model';
import {catalog} from '../catalog/models';
import {yuan} from '../catalog/prices';
import {RecommendationPanel} from './RecommendationPanel';
const sectionNames={network:'必要网络',monitoring:'监控与录像',materials:'布线与材料',labor:'施工与调试',optional:'已加入可选项'};
export function QuotePanel({project,derived,floor,onApply,onDirty}:{project:Project;derived:DerivedProject;floor:Floor;onApply:(edits:ProjectEdit[],route?:boolean)=>boolean;onDirty:()=>void}){
 const [editing,setEditing]=useState<string>();
 const applyPrice=(edits:ProjectEdit[])=>{const ok=onApply(edits);if(ok)setEditing(undefined);return ok;};
 return <section className="result-page" aria-label="报价清单"><header className="quote-heading"><div><p className="eyebrow">全项目 · 人民币预算</p><h2 aria-label="方案总价">{yuan(derived.totalCents)}</h2></div><span className="status-chip">{derived.complete?'初步预算':'方案待补全'}</span></header><p>单价均可校正。暂估不是实时电商成交价，施工条件、税运与当地人工需采购前核实。</p>
  <div className="subtotal-list">{Object.entries(derived.totals).map(([k,n])=><div key={k}><span>{sectionNames[k as keyof typeof sectionNames]}</span><strong>{yuan(n)}</strong></div>)}</div>
  <details><summary>工程量与计算口径</summary><p>独立线路 {derived.quantities.independentLinks} 条 · 净路由 {derived.quantities.netCableM.toFixed(1)} 米 · 含预留余量 {derived.quantities.cableWithReserveM.toFixed(1)} 米 · 唯一线槽 {derived.quantities.trayM.toFixed(1)} 米 · 跨层主干 {derived.quantities.backboneM.toFixed(1)} 米</p><p>共线只合并显示，每根电缆独立计量；线槽不重复。数量由点位及配套容量计算，请在“需求与数量”或点位属性中修改。</p></details>
  {editing&&<p className="notice">请先应用或取消当前单价，再编辑其他项目或加入备选设备。</p>}
  {Object.keys(sectionNames).map(section=><section key={section} className="bom-section"><h3>{sectionNames[section as keyof typeof sectionNames]}</h3>{derived.bom.filter(b=>b.section===section).map(line=><QuoteLine key={line.id} line={line} project={project} onApply={applyPrice} disabled={!!editing&&editing!==line.id} onDirty={()=>{setEditing(line.id);onDirty();}}/>)}{!derived.bom.some(b=>b.section===section)&&<p className="muted">未计入此类费用</p>}</section>)}
  <fieldset className="optional-fieldset" disabled={!!editing}><RecommendationPanel project={project} floor={floor} onApply={onApply}/></fieldset>
 </section>;
}
function QuoteLine({line,project,onApply,onDirty,disabled}:{line:BomLine;project:Project;onApply:(edits:ProjectEdit[])=>boolean;onDirty:()=>void;disabled:boolean}){
 const item=catalog.find(c=>c.id===line.modelId)!,[draft,setDraft]=useState(String(line.unitCents/100));
 return <article className="quote-line" data-bom-model={line.modelId}><div><h4>{line.name}</h4><p>{item?.brand} {item?.model}</p><p className="muted">{line.quantity} {line.unit} × {yuan(line.unitCents)} · {line.priceKind==='user'?'人工采用价':'暂估'}</p></div><strong>{yuan(line.subtotalCents)}</strong><details><summary>依据、价格与来源</summary><p>{line.basis}</p><p>{item?.conditions}</p><p>快照日期：{item?.checkedAt??'未核实'}。目录原价：{yuan(item?.unitCents??0)}</p>{item?.sourceUrl&&<a href={item.sourceUrl} target="_blank" rel="noreferrer">查看商品来源（需网络）</a>}{item?.specificationUrl&&<a href={item.specificationUrl} target="_blank" rel="noreferrer">查看厂家规格（需网络）</a>}{item?.priceReferences?.map((r,i)=><p key={i}>{r.kind==='retail-page'?'页面展示':'采购限价'}：{yuan(r.observedCents)} · {r.conditions}</p>)}
  <fieldset className="control-row optional-fieldset" disabled={disabled}><label>采用单价（元）<input type="number" min="0" step=".01" value={draft} onChange={e=>{setDraft(e.target.value);onDirty();}}/></label><button onClick={()=>onApply(line.modelId==='labor-fixed'?[{type:'settings',settings:{...project.settings,fixedLaborCents:Math.round(Number(draft)*100)}}]:[{type:'price',modelId:line.modelId,cents:Math.round(Number(draft)*100)}])}>应用单价</button><button onClick={()=>{setDraft(String(line.unitCents/100));onApply([]);}}>取消单价修改</button>{project.priceOverrides[line.modelId]!==undefined&&item&&<button onClick={()=>{if(onApply([{type:'price',modelId:line.modelId,cents:null}]))setDraft(String(item.unitCents/100));}}>恢复目录价</button>}</fieldset></details></article>;
}
