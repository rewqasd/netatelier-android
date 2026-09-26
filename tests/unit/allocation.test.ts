import {it,expect} from 'vitest';
import {deriveProject} from '../../src/quote/derive';
import {fixtureCatalog,quoteProject} from '../helpers/catalog';
it('allocates every endpoint once with per-switch PoE reserve and real uplink ports',()=>{
  const p=quoteProject(8,2,3),c=fixtureCatalog(),d=deriveProject(p,c);
  expect(d.switches.flatMap(s=>s.endpointIds).filter(id=>/^(ap|camera|information)/.test(id)).sort()).toEqual(p.floors[0].devices.filter(d=>d.kind!=='cabinet').map(d=>d.id).sort());
  for(const s of d.switches){const m=c.find(m=>m.id===s.modelId)!;expect(s.loadW*1.25).toBeLessThanOrEqual(Number(m.specs.poeW));expect(s.endpointIds.length+s.uplinkPorts).toBeLessThanOrEqual(Number(m.specs.ports));}
});
it('compares integrated PoE gateway with separate switch, charges integrated AC only once',()=>{
  const c=fixtureCatalog();c.find(c=>c.id==='gw-poe')!.unitCents=40000;const d=deriveProject(quoteProject(4),c);
  expect(d.bom.filter(b=>b.modelId==='gw-poe')).toHaveLength(1);expect(d.bom.some(b=>b.modelId==='sw8'||b.modelId==='sw16')).toBe(false);
  expect(d.switches[0]?.endpointIds).toHaveLength(4);expect(d.bom.some(b=>c.find(m=>m.id===b.modelId)?.category==='ac')).toBe(false);
});
it('unknown or insufficient power and gateway capacities block instead of inventing capacities',()=>{
  const c=fixtureCatalog().filter(m=>m.id!=='gw-poe');for(const m of c.filter(m=>m.category==='switch'))m.specs.poeW=null;
  let d=deriveProject(quoteProject(4),c);expect(d.complete).toBe(false);expect(d.issues.some(i=>i.code==='NO_SWITCH_CAPACITY')).toBe(true);
  c.find(m=>m.id==='gw')!.specs.clients=1;d=deriveProject(quoteProject(4),c);expect(d.issues.some(i=>i.code==='NO_GATEWAY_CAPACITY')).toBe(true);
});
it('recorder choice checks channels, bandwidth and disk bays rather than camera count alone',()=>{
  const p=quoteProject(0,8);const c=fixtureCatalog();let d=deriveProject(p,c);
  expect(d.bom.find(b=>b.modelId==='nvr16')?.quantity).toBe(1);expect(d.bom.find(b=>b.modelId==='disk8')?.quantity).toBe(1);expect(d.bom.find(b=>b.modelId==='disk4')?.quantity).toBe(1); // 8.5536TB needs 8+4TB in 2 bays, cheaper than 8+8
  p.settings.bitrateMbps=6;p.settings.retentionDays=365;d=deriveProject(p,c);expect(d.issues.some(i=>i.code==='NO_RECORDING_CAPACITY')).toBe(true);expect(d.complete).toBe(false);
});
it('does not power incompatible passive-PoE equipment from standard switch ports',()=>{
  const c=fixtureCatalog();c.find(m=>m.id==='ap6')!.specs.poe='passive';const d=deriveProject(quoteProject(),c);expect(d.issues.some(i=>i.code==='POWER_STANDARD_UNKNOWN')).toBe(true);expect(d.complete).toBe(false);
});
it('counts only one RJ45 plug at the panel end and includes an equipment enclosure per cabinet',()=>{
  const d=deriveProject(quoteProject(4,0,2),fixtureCatalog());expect(d.bom.find(b=>b.modelId==='termination')?.quantity).toBe(10);expect(d.bom.find(b=>b.modelId==='cabinet')?.quantity).toBe(1);
});
it('cabinet capacity is explicit when many switches no longer fit the budget enclosure',()=>{
  const c=fixtureCatalog();c.find(m=>m.id==='cabinet')!.specs.rackU=1;const d=deriveProject(quoteProject(8,3,12),c);expect(d.issues.some(i=>i.code==='CABINET_CAPACITY')).toBe(true);expect(d.complete).toBe(false);
});
