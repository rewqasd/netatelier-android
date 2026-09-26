import {it,expect} from 'vitest';
import {minimalProject} from '../helpers/projects';
import {routeFloor,routeProject,segmentInside} from '../../src/planning/routing';
import {applyEdit} from '../../src/planning/edits';
import {createScene} from '../../src/scenes';
import {planFloor} from '../../src/planning/ap';
import {bundleCables} from '../../src/planning/shared-routes';
it('routes cabinet→door graph→kitchen common trunk before camera/AP branches',()=>{
  const p=createScene('restaurant'),f=planFloor(p.floors[0],p.settings).floor,{floor,issues}=routeFloor(f);
  const kitchen=f.rooms.find(r=>r.use==='kitchen')!,ends=floor.devices.filter(d=>['ap','camera'].includes(d.kind)&&d.roomId===kitchen.id),ids=ends.map(d=>d.id);
  expect(ends).toHaveLength(2);expect(floor.cables.filter(c=>ids.includes(c.toId)).every(c=>c.status==='confirmed'&&c.pointsM.length>=3)).toBe(true);
  expect(floor.cables.length).toBeGreaterThan(0);expect(bundleCables(floor.cables.filter(c=>ids.includes(c.toId))).some(s=>s.cableIds.length===2)).toBe(true);
  expect(issues.some(i=>i.code==='DISCONNECTED_CABLE')).toBe(false);
});
it('a sealed room is disconnected rather than a fabricated straight wire through the wall',()=>{
  const p=minimalProject(),f=p.floors[0];f.rooms=[{...f.rooms[0],id:'left',polygon:[{x:0,y:0},{x:10,y:0},{x:10,y:15},{x:0,y:15}]},{...f.rooms[0],id:'right',polygon:[{x:10,y:0},{x:20,y:0},{x:20,y:15},{x:10,y:15}]}];f.walls=[{id:'wall',from:{x:10,y:0},to:{x:10,y:15},material:'brick',confirmed:true}];f.devices=[{id:'cab',floorId:'f1',kind:'cabinet',label:'cab',positionM:{x:2,y:2},locked:false,source:'manual'},{id:'ap',floorId:'f1',kind:'ap',label:'ap',positionM:{x:15,y:5},locked:false,source:'manual'}];
  const result=routeFloor(f);expect(result.floor.cables[0]?.status).toBe('disconnected');expect(result.floor.cables[0]?.pointsM).toEqual([]);expect(result.issues.some(i=>i.code==='DISCONNECTED_CABLE')).toBe(true);
});
it('retains an explicit locked path with valid endpoints',()=>{
  const p=minimalProject(),f=p.floors[0];f.devices=[{id:'cab',floorId:'f1',kind:'cabinet',label:'cab',positionM:{x:2,y:2},locked:false,source:'manual'},{id:'ap',floorId:'f1',kind:'ap',label:'ap',positionM:{x:15,y:5},locked:false,source:'manual'}];f.cables=[{id:'fixed',floorId:'f1',fromId:'cab',toId:'ap',pointsM:[{x:2,y:2},{x:2,y:10},{x:15,y:10},{x:15,y:5}],status:'confirmed',locked:true}];
  expect(routeFloor(f).floor.cables).toEqual(f.cables);
});
it('hotel has explicit whole-building backbones, not copied first-floor lengths',()=>{
  const p=createScene('hotel');p.floors=p.floors.map(f=>planFloor(f,p.settings).floor);const result=routeProject(p);
  expect(result.project.backbones).toHaveLength(3);expect(result.project.backbones?.map(b=>b.pointsM[b.pointsM.length-1].z)).toEqual([3.2,6.4,9.6]);
  expect(result.project.backbones?.every(b=>b.status==='provisional')).toBe(true);expect(result.issues.some(i=>i.code==='BACKBONE_CONFIRMATION')).toBe(true);
});
it('explicit backbone confirmation retains geometry and rejects changed physical endpoints',()=>{
  const p=createScene('hotel');p.floors=p.floors.map(f=>planFloor(f,p.settings).floor);const routed=routeProject(p).project,link={...routed.backbones![0],status:'confirmed' as const};
  const confirmed=applyEdit(routed,{type:'backbone',link});expect(confirmed.backbones![0].status).toBe('confirmed');
  expect(()=>applyEdit(routed,{type:'backbone',link:{...link,pointsM:[{x:0,y:0,z:0},...link.pointsM.slice(1)]}})).toThrow(/端点/);
});
it('a user can unlock an unchanged backbone without bypassing protection on geometry edits',()=>{
  const p=createScene('hotel');p.floors=p.floors.map(f=>planFloor(f,p.settings).floor);const routed=routeProject(p).project;routed.backbones![0].locked=true;const old=structuredClone(routed.backbones![0]);
  const next=applyEdit(routed,{type:'backbone',link:{...old,locked:false}});expect(next.backbones![0].locked).toBe(false);
  expect(()=>applyEdit(routed,{type:'backbone',link:{...old,locked:false,pointsM:[{x:0,y:0,z:0},...old.pointsM.slice(1)]}})).toThrow(/锁定/);
});
it('shared-path bounds cannot skip a narrow notch between valid endpoints',()=>{
  const polygon=[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:4,y:10},{x:4,y:4},{x:3.9,y:4},{x:3.9,y:10},{x:0,y:10}];
  expect(segmentInside({x:1,y:8},{x:9,y:8},polygon)).toBe(false);
});
it('a changed wall does not leave a locked crossing marked construction-confirmed',()=>{
  const p=minimalProject(),f=p.floors[0];f.devices=[{id:'cab',floorId:'f1',kind:'cabinet',label:'cab',positionM:{x:2,y:2},locked:false,source:'manual'},{id:'ap',floorId:'f1',kind:'ap',label:'ap',positionM:{x:15,y:2},locked:false,source:'manual'}];f.cables=[{id:'fixed',floorId:'f1',fromId:'cab',toId:'ap',pointsM:[{x:2,y:2},{x:15,y:2}],status:'confirmed',locked:true}];f.walls=[{id:'wall',from:{x:10,y:0},to:{x:10,y:15},material:'brick',confirmed:true}];
  const result=routeFloor(f);expect(result.floor.cables[0].pointsM).toEqual(f.cables[0].pointsM);expect(result.floor.cables[0].status).toBe('provisional');expect(result.issues.some(i=>i.code==='PROVISIONAL_ROUTE')).toBe(true);
});
it('imported inner-wall contours connect only through an explicitly confirmed door',()=>{
  const p=minimalProject(),f=p.floors[0];
  f.rooms=[{...f.rooms[0],id:'left',polygon:[{x:0,y:0},{x:4.9,y:0},{x:4.9,y:10},{x:0,y:10}]},{...f.rooms[0],id:'right',polygon:[{x:5.1,y:0},{x:10,y:0},{x:10,y:10},{x:5.1,y:10}]}];
  f.walls=[{id:'w1',from:{x:4.9,y:0},to:{x:4.9,y:10},material:'unknown',confirmed:true},{id:'w2',from:{x:5.1,y:0},to:{x:5.1,y:10},material:'unknown',confirmed:true}];
  f.openings=[{id:'door',at:{x:5,y:5},widthM:1,roomIds:['left','right'],entrance:false,confirmed:true}];
  f.devices=[{id:'cab',floorId:'f1',kind:'cabinet',label:'cab',positionM:{x:2,y:5},locked:false,source:'manual'},{id:'ap',floorId:'f1',kind:'ap',label:'ap',positionM:{x:8,y:5},locked:false,source:'manual'}];
  const result=routeFloor(f);expect(result.floor.cables[0].status).toBe('confirmed');f.openings[0].confirmed=false;expect(routeFloor(f).floor.cables[0].status).toBe('disconnected');
});
