import {describe,it,expect} from 'vitest';
import {extractGeometry} from '../../src/recognition/image-pipeline';
import {drawingFixture} from '../helpers/drawings';
import {polygonArea,containsPoint} from '../../src/domain/geometry';
describe('actual pixel geometry (not OCR or scene matching)',()=>{
  it('recovers two enclosed rooms, associates labels, and retains candidate provenance',()=>{
    const input=drawingFixture(),draft=extractGeometry(input);
    expect(draft.roomsPx).toHaveLength(2);
    const kitchen=draft.roomsPx.find(r=>r.name==='厨房101')!;
    expect(kitchen.use).toBe('kitchen');expect(kitchen.provenance).toBe('geometry');expect(kitchen.confirmed).toBe(false);
    expect(containsPoint({x:70,y:100},kitchen.polygon)).toBe(true);
    expect(draft.wallsPx.length).toBeGreaterThanOrEqual(7);
    expect(draft.openingsPx).toEqual([]); // Solid walls do not become invented doors.
    expect(draft.text).toEqual(input.text);
  });
  it('retains an L-shaped concavity instead of inserting a rectangular template',()=>{
    const draft=extractGeometry(drawingFixture('elbow'));
    expect(draft.roomsPx).toHaveLength(1);
    const polygon=draft.roomsPx[0].polygon;
    expect(containsPoint({x:230,y:180},polygon)).toBe(false);
    expect(containsPoint({x:70,y:180},polygon)).toBe(true);
    expect(polygonArea(polygon)).toBeGreaterThan(30000);expect(polygonArea(polygon)).toBeLessThan(34000);
  });
  it('recovers angled boundaries with isolated noise; geometry differs from axis-aligned input',()=>{
    const draft=extractGeometry(drawingFixture('angled'));
    expect(draft.roomsPx).toHaveLength(2);
    const edges=draft.wallsPx;
    expect(edges.some(w=>Math.abs(w.to.x-w.from.x)>60&&Math.abs(w.to.y-w.from.y)>60)).toBe(true);
    expect(draft.boundaryPx).not.toEqual(extractGeometry(drawingFixture()).boundaryPx);
  });
  it('does not infer rooms from text-only or blank pages and reports no-result',()=>{
    const input=drawingFixture('blank');input.text=drawingFixture().text;
    const result=extractGeometry(input);
    expect(result.roomsPx).toHaveLength(0);
    expect(result.issues.some(i=>i.code==='NO_ENCLOSED_REGIONS'&&i.severity==='blocking')).toBe(true);
  });
  it('rejects mismatched and over-limit buffers before processing',()=>{
    expect(()=>extractGeometry({...drawingFixture(),pixels:new Uint8ClampedArray(4)})).toThrow();
    const input=drawingFixture();input.document.widthPx=2500;
    expect(()=>extractGeometry(input)).toThrow();
  });
  it('masks actual OCR glyph boxes so letter outlines do not become additional rooms',()=>{
    const input=drawingFixture();
    for(const word of input.text){const b=word.boxPx;for(let y=b.y;y<b.y+b.height;y++)for(let x=b.x;x<b.x+b.width;x++){
      if(x>b.x+3&&x<b.x+b.width-4&&y>b.y+3&&y<b.y+b.height-4)continue;
      const i=(y*320+x)*4;input.pixels[i]=input.pixels[i+1]=input.pixels[i+2]=0;
    }}
    const draft=extractGeometry(input);expect(draft.roomsPx).toHaveLength(2);expect(draft.roomsPx.map(r=>r.name)).toEqual(['厨房101','Office202']);
  });
});
