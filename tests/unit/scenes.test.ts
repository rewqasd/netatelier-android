import { describe, expect, it } from 'vitest';
import { createScene } from '../../src/scenes';
import { validateProject } from '../../src/domain/schema';
import { containsPoint, polygonArea } from '../../src/domain/geometry';
import type { SceneId, Vec2 } from '../../src/domain/model';
const cases:[SceneId,number,number][]=[['restaurant',400,1],['office',300,1],['gym',1000,1],['hotel',400,4],['retail',200,1]];
const bounds=(p:Vec2[])=>({l:Math.min(...p.map(a=>a.x)),r:Math.max(...p.map(a=>a.x)),t:Math.min(...p.map(a=>a.y)),b:Math.max(...p.map(a=>a.y))});
describe('five usable metric scenes',()=>{
  it.each(cases)('%s has its stated size, legal distinct room extents and stable identities',(id,area,count)=>{
    const p=createScene(id);
    expect(validateProject(p).issues).toEqual([]);
    expect(p.floors).toHaveLength(count);
    for(const f of p.floors){
      expect(polygonArea(f.boundary)).toBe(area);
      expect(f.rooms.reduce((n,r)=>n+polygonArea(r.polygon),0)).toBe(area);
      expect(f.devices).toEqual([]); // Templates must use the same placement pipeline as imports.
      expect(f.targets.length).toBeGreaterThan(1);
      for(const r of f.rooms){
        expect(r.polygon.every(v=>containsPoint(v,f.boundary))).toBe(true);
        expect(f.openings.some(o=>o.roomIds.includes(r.id))).toBe(true);
      }
      for(let i=0;i<f.rooms.length;i++)for(let j=i+1;j<f.rooms.length;j++){
        const a=bounds(f.rooms[i].polygon),b=bounds(f.rooms[j].polygon);
        const intersection=Math.max(0,Math.min(a.r,b.r)-Math.max(a.l,b.l))*Math.max(0,Math.min(a.b,b.b)-Math.max(a.t,b.t));
        expect(intersection).toBe(0);
      }
      for(const t of f.targets){
        const room=f.rooms.find(r=>r.id===t.roomId)!;
        expect(['guest','toilet','changing','shower','meeting','office']).not.toContain(room.use);
        expect(containsPoint(t.at,room.polygon)).toBe(true);
      }
      for(const d of f.openings){
        expect(d.roomIds.every(id=>containsPoint(d.at,f.rooms.find(r=>r.id===id)!.polygon))).toBe(true);
      }
    }
    expect(createScene(id).floors.map(f=>f.rooms)).toEqual(p.floors.map(f=>f.rooms));
  });
  it('hotel has forty guest rooms, ten per layer, not a single-floor quantity multiplied blindly',()=>{
    const p=createScene('hotel');
    expect(p.floors.map(f=>f.rooms.filter(r=>r.use==='guest').length)).toEqual([10,10,10,10]);
    expect(p.floors.map(f=>f.elevationM)).toEqual([0,3.2,6.4,9.6]);
    expect(new Set(p.floors.flatMap(f=>f.rooms.map(r=>r.id))).size).toBe(p.floors.flatMap(f=>f.rooms).length);
    expect(p.floors.reduce((n,f)=>n+polygonArea(f.boundary),0)).toBe(1600);
  });
  it('has five distinct spatial plans and labels private uses structurally',()=>{
    const plans=cases.map(([id])=>createScene(id));
    for(const p of plans)expect(p.floors.length).toBeGreaterThan(0);
    expect(new Set(plans.map(p=>JSON.stringify(p.floors[0].rooms.map(r=>r.polygon)))).size).toBe(5);
    expect(plans[2].floors[0].rooms.map(r=>r.use)).toEqual(expect.arrayContaining(['changing','shower','toilet']));
    expect(plans[0].floors[0].rooms.map(r=>r.use)).toContain('kitchen');
    expect(plans[1].floors[0].rooms.map(r=>r.use)).toContain('meeting');
  });
});
