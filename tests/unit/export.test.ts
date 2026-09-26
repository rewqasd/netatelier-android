import {describe,it,expect} from 'vitest';
import {createScene,sceneMeta} from '../../src/scenes';
import {planFloor} from '../../src/planning/ap';
import {routeProject} from '../../src/planning/routing';
import {deriveProject} from '../../src/quote/derive';
import {catalog} from '../../src/catalog/models';
import {csvCell,quoteCsv} from '../../src/export/csv';
import {floorSvg,topologySvg} from '../../src/export/svg';
import {reportHtml} from '../../src/export/report';
function planned(id:Parameters<typeof createScene>[0]){const p=createScene(id);p.floors=p.floors.map(f=>planFloor(f,p.settings).floor);return routeProject(p).project;}
describe('portable exports use the applied project, not a second generated plan',()=>{
 for(const scene of sceneMeta)it(`${scene.id}: retains engineering anchors and all explicit endpoints in SVG`,()=>{
  const p=planned(scene.id),before=JSON.stringify(p),s=floorSvg(p,p.floors[0].id);
  expect(s).toContain('<svg');expect(s).toContain('xmlns="http://www.w3.org/2000/svg"');
  for(const d of p.floors[0].devices){expect(s).toContain(`data-device="${d.id}"`);expect(s).toContain(`data-x-m="${d.positionM.x}"`);}
  expect(s).toContain('独立线缆');expect(JSON.stringify(p)).toBe(before);
 });
 it('exports only the selected hotel floor as SVG but every floor, bill, risk and source in PDF HTML',()=>{
  const p=planned('hotel'),d=deriveProject(p,catalog),last=p.floors[3],svg=floorSvg(p,last.id),html=reportHtml(p,d);
  expect(svg).toContain(last.devices[0].id);expect(svg).not.toContain(p.floors[0].devices[0].id);
  for(const f of p.floors)expect(html).toContain(`data-floor="${f.id}"`);
  for(const l of d.bom)expect(html).toContain(`data-bom="${l.id}"`);
  expect(html).toContain('28434.00');expect(html).toContain('BACKBONE_CONFIRMATION');expect(html).toContain('2026-09-26');expect(html).toContain('现场');
  expect(html).toContain('价格来源');expect(html).toContain('网络拓扑');
 });
 it('emits exact fen amounts without rounding or optional recommendation purchases',()=>{
  const p=planned('retail'),d=deriveProject(p,catalog),csv=quoteCsv(p,d);
  expect(csv).toContain('6317.00');expect(csv).toContain('299.00');expect(csv).not.toContain('2499.00');
  const amounts=[...csv.matchAll(/"金额（元）","([0-9.]+)"/g)].map(m=>m[1]);expect(amounts).toEqual(['6317.00']);
 });
 it('escapes quotes/newlines and disarms formula and leading-control cells',()=>{
  expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
  for(const s of ['=1+1','+SUM(A1)','-1+3','@SUM(1)','\t=2','  =3','\r+4','\n@x'])expect(csvCell(s)).toBe('"\''+s+'"');
  expect(csvCell(12)).toBe('"12"');
 });
 it('rejects remote image references and escapes user-authored text in standalone outputs',()=>{
  const p=planned('office');p.name='<script>alert(1)</script>';const f=p.floors[0];
  expect(reportHtml(p,deriveProject(p,catalog))).not.toContain('<script>');expect(reportHtml(p,deriveProject(p,catalog))).toContain('&lt;script&gt;');
  f.document={assetId:'image.png',mime:'image/png',page:0,widthPx:100,heightPx:100};
  expect(()=>floorSvg(p,f.id,{'image.png':'https://example.com/private.png'})).toThrow();
  expect(()=>floorSvg(p,f.id)).toThrow();
 });
 it('topology has every actual edge and port without inventing a direct camera-NVR link',()=>{
  const p=planned('office'),d=deriveProject(p,catalog),svg=topologySvg(p,d);
  for(const edge of d.topology.edges)expect(svg).toContain(`data-edge="${edge.id}"`);
  for(const node of d.topology.nodes)expect(svg).toContain(`data-node="${node.id}"`);
  expect(svg).toContain('P');
 });
});
