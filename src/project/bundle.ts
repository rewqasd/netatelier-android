import type {Project} from '../domain/model';
import {z} from 'zod';
export interface BundleManifest {format:'netatelier';version:1;project:'project.json';assets:{id:string;path:string;bytes:number;sha256:string}[]}
export function assetIds(project:Project):string[]{return [...new Set(project.floors.flatMap(f=>f.document?[f.document.assetId,...(f.document.sourceAssetId?[f.document.sourceAssetId]:[])]:[]))].sort()}
const manifestSchema=z.strictObject({format:z.literal('netatelier'),version:z.literal(1),project:z.literal('project.json'),assets:z.array(z.strictObject({id:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/),path:z.string(),bytes:z.number().int().positive().max(50*1024*1024),sha256:z.string().regex(/^[a-f0-9]{64}$/)})).max(254)});
export function validateBundleManifest(manifest:unknown,project:Project):BundleManifest{
  const m=manifestSchema.parse(manifest),ids=m.assets.map(a=>a.id);
  if(new Set(ids).size!==ids.length||m.assets.some(a=>a.path!==`assets/${a.id}`)||m.assets.reduce((n,a)=>n+a.bytes,0)>128*1024*1024||JSON.stringify([...ids].sort())!==JSON.stringify(assetIds(project)))throw new Error('项目包附件路径/大小/引用不一致');
  return m;
}
