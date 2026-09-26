import {it,expect} from 'vitest';
import {deriveProject} from '../../src/quote/derive';
import {recommendations} from '../../src/catalog/recommendations';
import {fixtureCatalog,quoteProject} from '../helpers/catalog';
import {applyEdit} from '../../src/planning/edits';
import {routeProject} from '../../src/planning/routing';
it('viewing recommendations does not purchase; existing wired PC adds endpoint but no hardware cost, removal restores baseline',()=>{
  const p=routeProject(quoteProject()).project,c=fixtureCatalog(),before=deriveProject(p,c).totalCents;
  expect(recommendations('restaurant',c).some(m=>m.id==='pc')).toBe(true);expect(deriveProject(p,c).totalCents).toBe(before);
  const joined=routeProject(applyEdit(p,{type:'join-business',selection:{id:'desk',modelId:'pc',quantity:1,purchase:false,network:'wired',floorId:'f1',roomId:'r1'}})).project,d=deriveProject(joined,c);
  expect(joined.floors[0].devices.filter(d=>d.businessId==='desk')).toHaveLength(1);expect(d.bom.some(b=>b.modelId==='pc')).toBe(false);expect(d.quantities.independentLinks).toBe(5);expect(d.totalCents).toBeGreaterThan(before);
  expect(deriveProject(routeProject(applyEdit(joined,{type:'remove-business',id:'desk'})).project,c).totalCents).toBe(before);
});
it('affirmative purchase charges selected optional quantity once',()=>{
  const p=quoteProject(),c=fixtureCatalog();p.business=[{id:'pc-choice',modelId:'pc',quantity:2,purchase:true,network:'none',floorId:'f1'}];const d=deriveProject(p,c);expect(d.bom.find(b=>b.modelId==='pc')?.subtotalCents).toBe(500000);
});
it('monitoring off excludes cameras, their lines, recorder and disks but preserves manual saved state',()=>{
  const p=quoteProject(4,3),before=structuredClone(p),c=fixtureCatalog();p.settings.monitoring=false;const d=deriveProject(p,c);
  expect(d.bom.some(b=>b.section==='monitoring')).toBe(false);expect(d.switches.flatMap(s=>s.endpointIds).some(id=>id.startsWith('camera'))).toBe(false);expect(d.quantities.independentLinks).toBe(4);expect(p.floors).toEqual(before.floors);
});
it('wireless business equipment consumes wireless capacity but never creates fictitious switch ports',()=>{
  const p=quoteProject(1),c=fixtureCatalog();p.business=[{id:'wireless-pc',modelId:'pc',quantity:50,purchase:false,network:'wifi',floorId:'f1'}];const d=deriveProject(p,c);
  expect(d.issues.some(i=>i.code==='BUSINESS_WIFI_CAPACITY')).toBe(true);expect(d.topology.nodes.some(n=>n.id==='business-wireless-pc'&&n.kind==='wireless-business')).toBe(true);expect(d.switches.flatMap(s=>s.endpointIds)).toEqual(['ap0']);
});
