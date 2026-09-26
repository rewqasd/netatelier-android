import {it,expect} from 'vitest';
import {deriveProject} from '../../src/quote/derive';
import {packCableRuns} from '../../src/quote/pricing';
import {fixtureCatalog,quoteProject} from '../helpers/catalog';
it('four 395-yuan APs total exactly 158000 cents; WiFi5 and user zero override propagate',()=>{
  const p=quoteProject(),c=fixtureCatalog();let d=deriveProject(p,c);expect(d.bom.find(b=>b.modelId==='ap6')?.subtotalCents).toBe(158000);
  for(const a of p.floors[0].devices.filter(d=>d.kind==='ap'))a.wifi=5;d=deriveProject(p,c);expect(d.bom.find(b=>b.modelId==='ap5')?.subtotalCents).toBe(79600);expect(d.bom.some(b=>b.modelId==='ap6')).toBe(false);
  p.priceOverrides.ap5=0;expect(deriveProject(p,c).bom.find(b=>b.modelId==='ap5')?.subtotalCents).toBe(0);
});
it('continuous cable runs cannot be joined from box offcuts; metre and box purchases are exclusive',()=>{
  expect(packCableRuns([60,60,60],100)).toEqual([60,60,60]); // ceil(180/100) is wrong
  const p=quoteProject(),c=fixtureCatalog();p.settings.cablePurchase='box';let d=deriveProject(p,c);expect(d.bom.some(b=>b.modelId==='cat6-box')).toBe(true);expect(d.bom.some(b=>b.modelId==='cat6-m')).toBe(false);
  p.settings.cablePurchase='metre';d=deriveProject(p,c);expect(d.bom.some(b=>b.modelId==='cat6-box')).toBe(false);expect(d.bom.find(b=>b.modelId==='cat6-m')?.quantity).toBe(54); // (8+8.1+8.2+8.3+4×4)×1.1=53.46 round purchase to whole m
});
it('fixed labor replaces all itemized labor and totals are cents-safe independent line sums',()=>{
  const p=quoteProject(),c=fixtureCatalog();p.settings.laborMode='fixed';p.settings.fixedLaborCents=123456;
  const d=deriveProject(p,c),labor=d.bom.filter(b=>b.section==='labor');expect(labor).toHaveLength(1);expect(labor[0].subtotalCents).toBe(123456);
  expect(d.totalCents).toBe(d.bom.reduce((n,b)=>n+b.quantity*b.unitCents,0));expect(Object.values(d.totals).reduce((a,b)=>a+b,0)).toBe(d.totalCents);
});
it('missing selected model blocks quote, never silently substitutes a different radio',()=>{
  const p=quoteProject();p.floors[0].devices[1].modelId='not-in-catalog';const d=deriveProject(p,fixtureCatalog());expect(d.issues.some(i=>i.code==='MODEL_UNAVAILABLE')).toBe(true);expect(d.complete).toBe(false);
});
