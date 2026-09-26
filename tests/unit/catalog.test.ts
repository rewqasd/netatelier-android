import {it,expect} from 'vitest';
import {catalog} from '../../src/catalog/models';
import {createScene,sceneMeta} from '../../src/scenes';
import {planFloor} from '../../src/planning/ap';
import {routeProject} from '../../src/planning/routing';
import {deriveProject} from '../../src/quote/derive';
import {quoteProject} from '../helpers/catalog';
it('bundled snapshot derives finite itemized bills for all five actual scene inventories',()=>{
  for(const meta of sceneMeta){let p=createScene(meta.id);p.floors=p.floors.map(f=>planFloor(f,p.settings).floor);p=routeProject(p).project;const d=deriveProject(p,catalog);
    expect(d.bom.length).toBeGreaterThan(5);expect(d.totalCents).toBeGreaterThan(0);expect(d.totalCents).toBe(d.bom.reduce((sum,line)=>sum+line.quantity*line.unitCents,0));
    expect(d.issues.filter(i=>['MODEL_UNAVAILABLE','NO_GATEWAY_CAPACITY','NO_SWITCH_CAPACITY','NO_RECORDING_CAPACITY','MISSING_CATALOG_ITEM'].includes(i.code))).toEqual([]);
    expect(d.bom.filter(b=>catalog.find(m=>m.id===b.modelId)?.category==='ap').reduce((n,b)=>n+b.quantity,0)).toBe(p.floors.flatMap(f=>f.devices).filter(d=>d.kind==='ap').length);
  }
});
it('actual ceiling and panel WiFi5/6 choices have known power and sourced specification; estimates never masquerade as observed prices',()=>{
  for(const wifi of [5,6] as const)for(const mount of ['ceiling','panel'] as const){const p=quoteProject(1);p.floors[0].devices[1].wifi=wifi;p.floors[0].devices[1].mount=mount;const d=deriveProject(p,catalog),line=d.bom.find(b=>catalog.find(m=>m.id===b.modelId)?.category==='ap');expect(line).toBeDefined();const m=catalog.find(m=>m.id===line!.modelId)!;expect(m.specificationUrl?.startsWith('https://')).toBe(true);expect(m.specs.poeW).toBeGreaterThan(0);}
  const refs=catalog.flatMap(m=>m.priceReferences??[]);expect(refs.some(r=>r.kind==='retail-page'&&r.observedCents>0)).toBe(true);
  for(const m of catalog.filter(m=>m.priceKind==='page'))expect(m.priceReferences?.some(r=>r.kind==='retail-page'&&r.observedCents===m.unitCents&&r.url===m.sourceUrl)).toBe(true);
});
