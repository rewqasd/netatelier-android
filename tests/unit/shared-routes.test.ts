import {it,expect} from 'vitest';
import type {Cable} from '../../src/domain/model';
import {bundleCables,moveSharedSegment} from '../../src/planning/shared-routes';
import {distance} from '../../src/domain/geometry';
import {minimalProject} from '../helpers/projects';
export const line=(id:string,points:number[][]):Cable=>({id,floorId:'f1',fromId:'cab',toId:id,pointsM:points.map(([x,y])=>({x,y})),status:'confirmed',locked:false});
const length=(cables:Cable[])=>bundleCables(cables).reduce((n,s)=>n+distance(s.from,s.to),0);
it('reversed and partial collinear overlaps split into real independent membership spans',()=>{
  const segments=bundleCables([line('a',[[0,0],[10,0]]),line('b',[[15,0],[5,0]])]);
  expect(segments).toHaveLength(3);expect(length([line('a',[[0,0],[10,0]]),line('b',[[15,0],[5,0]])])).toBe(15);
  const shared=segments.find(s=>s.cableIds.length===2)!;expect(shared.from).toEqual({x:5,y:0});expect(shared.to).toEqual({x:10,y:0});expect(shared.cableIds.sort()).toEqual(['a','b']);
});
it('point crossings do not share length and different floors never share a tray',()=>{
  const a=line('a',[[0,0],[10,0]]),b=line('b',[[5,-5],[5,5]]);expect(length([a,b])).toBe(20);expect(bundleCables([a,b]).every(s=>s.cableIds.length===1)).toBe(true);
  expect(length([a,{...a,id:'other',floorId:'f2'}])).toBe(20);
});
it('rotation and translation preserve real overlap length',()=>{
  const cs=[line('a',[[0,0],[10,0]]),line('b',[[15,0],[5,0]])].map(c=>({...c,pointsM:c.pointsM.map(p=>({x:p.x*Math.cos(.713)-p.y*Math.sin(.713)+39,y:p.x*Math.sin(.713)+p.y*Math.cos(.713)-7}))}));
  expect(length(cs)).toBeCloseTo(15,6);expect(bundleCables(cs).find(s=>s.cableIds.length===2)).toBeTruthy();
});
it('moving a shared segment moves both physical wires but keeps actual endpoints; locked routes reject atomically',()=>{
  const f=minimalProject().floors[0];f.cables=[line('a',[[1,1],[10,1]]),line('b',[[1,1],[10,1]])];
  const segment=bundleCables(f.cables)[0]??{id:'s',floorId:'f1',from:{x:1,y:1},to:{x:10,y:1},cableIds:['a','b'],kinds:[]};
  const moved=moveSharedSegment(f,segment,{x:0,y:2});
  for(const cable of moved.cables){expect(cable.pointsM[0]).toEqual({x:1,y:1});expect(cable.pointsM[cable.pointsM.length-1]).toEqual({x:10,y:1});expect(cable.pointsM).toContainEqual({x:1,y:3});expect(cable.pointsM).toContainEqual({x:10,y:3});}
  f.cables[0].locked=true;expect(()=>moveSharedSegment(f,segment,{x:0,y:2})).toThrow(/锁定/);expect(f.cables[1].pointsM).toHaveLength(2);
});
