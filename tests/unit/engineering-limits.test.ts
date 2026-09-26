import {it,expect} from 'vitest';
import {adversarialRoutes} from '../helpers/adversarial-projects';
import {parseProject,ProjectRepository} from '../../src/project/repository';
import {importProjectBundle,type NativeStoreBridge} from '../../src/project/native';
import {StoreTransport} from '../helpers/project-store';
import {measureProject} from '../../src/quote/quantities';
import {bundleCables} from '../../src/planning/shared-routes';
import {renderExport} from '../../src/export';
import {deriveProject} from '../../src/quote/derive';
import {catalog} from '../../src/catalog/models';
import {minimalProject} from '../helpers/projects';
for(const mode of ['length','segments'] as const){
 it(`rejects ${mode} workload before project persistence and staged bundle commit`,async()=>{
  const p=adversarialRoutes(mode),raw=JSON.stringify(p);expect(new TextEncoder().encode(raw).length).toBeLessThan(2*1024*1024);
  expect(()=>parseProject(raw)).toThrow(/计算上限|路径总长/);
  const store=new StoreTransport(),repo=new ProjectRepository(store);await expect(repo.save(p)).rejects.toThrow(/计算上限|路径总长/);expect(store.files.size).toBe(0);
  let committed=false,discarded=false;
  const bridge:NativeStoreBridge={list:()=>store.list(),load:o=>store.load(o),save:o=>store.save(o),delete:o=>store.delete(o),exportBundle:async()=>({cancelled:true}),cancel:async()=>{},pickBundle:async()=>({cancelled:false,token:'stage',project:raw,manifest:JSON.stringify({format:'netatelier',version:1,project:'project.json',assets:[]})}),commitBundle:async()=>{committed=true;return {project:raw}},discardBundle:async()=>{discarded=true}};
  await expect(importProjectBundle(bridge)).rejects.toThrow(/计算上限|路径总长/);expect(committed).toBe(false);expect(discarded).toBe(true);
 });
 it(`guards direct measurement, shared rendering and export entrypoints for ${mode}`,async()=>{
  const p=adversarialRoutes(mode),d=deriveProject(minimalProject(),catalog);
  expect(()=>measureProject(p)).toThrow(/计算上限|路径总长/);
  expect(()=>bundleCables(p.floors[0].cables)).toThrow(/计算上限|路径总长/);
  await expect(renderExport(p,d,'svg')).rejects.toThrow(/计算上限|路径总长/);
 });
}
