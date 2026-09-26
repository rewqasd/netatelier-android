import type {CatalogItem,Project} from '../domain/model';
/** All monetary state is integer fen. A zero override is intentional. */
export function priceOf(item:CatalogItem,project:Project):number{
  const n=project.priceOverrides[item.id]??item.unitCents;
  if(!Number.isSafeInteger(n)||n<0||n>1_000_000_000)throw new Error(`无效单价：${item.id}`);
  return n;
}
export const yuan=(cents:number)=>new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY'}).format(cents/100);
