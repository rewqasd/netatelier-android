import {it,expect} from 'vitest';
import {deriveProject} from '../../src/quote/derive';
import {buildTopology} from '../../src/topology/graph';
import {fixtureCatalog,quoteProject} from '../helpers/catalog';
import {catalog} from '../../src/catalog/models';
import {createScene} from '../../src/scenes';
import {planFloor} from '../../src/planning/ap';
import {routeProject} from '../../src/planning/routing';
it('topology uses exact allocation membership, not a second point generator or fictitious recorder PoE',()=>{
  const p=quoteProject(4,3,2),d=deriveProject(p,fixtureCatalog()),g=buildTopology(p,d);
  expect(g.nodes.filter(n=>n.deviceId).map(n=>n.deviceId).sort()).toEqual(p.floors[0].devices.filter(d=>d.kind!=='cabinet').map(d=>d.id).sort());
  expect(g.nodes.filter(n=>n.kind==='nvr')).toHaveLength(1);const nvr=g.nodes.find(n=>n.kind==='nvr')!;
  expect(g.edges.some(e=>e.from===nvr.id&&g.nodes.some(n=>n.id===e.to&&n.kind==='camera'))).toBe(false);
  for(const s of d.switches)for(const id of s.endpointIds)expect(g.edges.some(e=>e.from===s.id&&e.to===id)).toBe(true);
  for(const e of g.edges){expect(g.nodes.some(n=>n.id===e.from)).toBe(true);expect(g.nodes.some(n=>n.id===e.to)).toBe(true)}
});
it('unallocatable designs still show actual endpoints as unconnected rather than losing their topology',()=>{
  const p=quoteProject(),c=fixtureCatalog().filter(m=>m.category!=='gateway'),d=deriveProject(p,c),g=buildTopology(p,d);expect(g.nodes.filter(n=>n.deviceId)).toHaveLength(4);expect(g.edges).toHaveLength(0);expect(d.complete).toBe(false);
});
it('each hotel fiber backbone has paired converters in both purchasing and physical topology',()=>{
  let p=createScene('hotel');p.floors=p.floors.map(f=>planFloor(f,p.settings).floor);p=routeProject(p).project;const d=deriveProject(p,catalog),g=buildTopology(p,d);
  expect(d.bom.find(b=>b.modelId==='tp-fiber-pair')?.quantity).toBe(3);expect(g.nodes.filter(n=>n.kind==='converter')).toHaveLength(6);
  expect(g.edges.filter(e=>e.label.includes('光纤'))).toHaveLength(3);
});
it('unsupported extra backbone relationships cannot masquerade as a fully allocated star',()=>{
  let p=createScene('hotel');p.floors=p.floors.map(f=>planFloor(f,p.settings).floor);p=routeProject(p).project;p.backbones!.forEach(b=>b.status='confirmed');p.backbones!.push({...structuredClone(p.backbones![0]),id:'duplicate-extra'});
  expect(deriveProject(p,catalog).issues.some(i=>i.code==='BACKBONE_TOPOLOGY_UNSUPPORTED')).toBe(true);
});
