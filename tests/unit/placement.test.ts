import {describe,it,expect} from 'vitest';
import {minimalProject} from '../helpers/projects';
import {planFloor} from '../../src/planning/ap';
import {cameraSees} from '../../src/planning/cameras';
import {containsPoint,distance,transformFloor} from '../../src/domain/geometry';
import {createScene,sceneMeta} from '../../src/scenes';
function targetFixture(){const p=minimalProject(),f=p.floors[0];f.targets=[{id:'top',roomId:'r1',at:{x:2,y:1},kind:'entrance',weight:3,confirmed:true},{id:'middle',roomId:'r1',at:{x:10,y:7},kind:'cashier',weight:2,confirmed:true},{id:'bottom',roomId:'r1',at:{x:18,y:14},kind:'circulation',weight:2,confirmed:true}];return p;}
describe('physical explainable planning',()=>{
  it('covers upper/central/lower targets and does not collect cameras at the lower edge',()=>{
    const p=targetFixture(),{floor,issues}=planFloor(p.floors[0],p.settings),cams=floor.devices.filter(d=>d.kind==='camera');
    expect(cams.length).toBeGreaterThan(0);expect(cams.some(d=>d.positionM.y<7)).toBe(true);
    for(const t of floor.targets)expect(cams.some(c=>c.targetIds?.includes(t.id)&&cameraSees(floor,c,t))).toBe(true);
    expect(issues.some(i=>i.code==='UNCOVERED_TARGET')).toBe(false);
    expect(cams.every(c=>Number.isFinite(c.directionRad)&&!!c.reason)).toBe(true);
  });
  it('never counts a blocked sightline as camera coverage',()=>{
    const p=targetFixture(),f=p.floors[0];f.walls=[{id:'block',from:{x:5,y:0},to:{x:5,y:15},confirmed:true,material:'brick'}];
    expect(cameraSees(f,{id:'cam',floorId:'f1',kind:'camera',label:'C',positionM:{x:2,y:7},directionRad:0,locked:false,source:'automatic'},f.targets[1])).toBe(false);
  });
  it('reports explicit target gaps for quantity zero and preserves chosen zero',()=>{
    const p=targetFixture();p.floors[0].deviceCounts={ap:1,camera:0,information:0};
    const result=planFloor(p.floors[0],p.settings);
    expect(result.floor.devices.filter(d=>d.kind==='camera')).toHaveLength(0);
    expect(result.issues.filter(i=>i.code==='UNCOVERED_TARGET').flatMap(i=>i.entityIds).sort()).toEqual(['bottom','middle','top']);
  });
  it.each(sceneMeta.map(s=>s.id))('excludes privacy and default office/meeting spaces in %s',id=>{
    const p=createScene(id);let cameraCount=0;
    for(const source of p.floors){const result=planFloor(source,p.settings);const cams=result.floor.devices.filter(d=>d.kind==='camera');cameraCount+=cams.length;
      for(const c of cams){expect(containsPoint(c.positionM,source.boundary)).toBe(true);expect(source.rooms.some(r=>['guest','toilet','changing','shower','meeting','office'].includes(r.use)&&containsPoint(c.positionM,r.polygon))).toBe(false);}
      const claimed=cams.flatMap(c=>c.targetIds??[]),missing=result.issues.filter(i=>i.code==='UNCOVERED_TARGET').flatMap(i=>i.entityIds);
      expect(source.targets.every(t=>claimed.includes(t.id)||missing.includes(t.id))).toBe(true);
    }
    expect(cameraCount).toBeGreaterThan(0);
  });
  it('rotating/translating the geometry preserves legal installation and target coverage',()=>{
    const p=createScene('restaurant'),source=p.floors[0],first=planFloor(source,p.settings);
    const moved=transformFloor(source,{angleRad:1.137,translation:{x:17,y:-29}}),second=planFloor(moved,p.settings);
    const targets=(f:typeof source)=>f.devices.filter(d=>d.kind==='camera').flatMap(d=>d.targetIds??[]).sort();
    expect(targets(first.floor).length).toBeGreaterThan(0);expect(targets(second.floor)).toEqual(targets(first.floor));
    for(const d of second.floor.devices)expect(containsPoint(d.positionM,moved.boundary)).toBe(true);
  });
  it('uses metric spacing and reports scale/capacity constraints instead of screen coordinates',()=>{
    const p=minimalProject(),before=structuredClone(p.floors[0]);const result=planFloor(p.floors[0],p.settings),aps=result.floor.devices.filter(d=>d.kind==='ap');
    expect(aps.length).toBeGreaterThanOrEqual(2);expect(aps.length).toBeLessThanOrEqual(4);
    for(let i=0;i<aps.length;i++)for(let j=i+1;j<aps.length;j++)expect(distance(aps[i].positionM,aps[j].positionM)).toBeGreaterThan(4);
    expect(aps.every(d=>d.serviceRoomIds?.includes('r1')&&!!d.reason)).toBe(true);expect(p.floors[0]).toEqual(before);
    const f=structuredClone(before);f.calibration={kind:'unset',metersPerPixel:null,originPx:{x:0,y:0},angleRad:0};expect(planFloor(f,p.settings).issues.some(i=>i.code==='MISSING_SCALE')).toBe(true);
    f.calibration=before.calibration;f.demand.concurrentUsers=200;f.deviceCounts={ap:1,camera:0,information:0};expect(planFloor(f,p.settings).issues.some(i=>i.code==='AP_CAPACITY')).toBe(true);
  });
  it('makes RF and lens assumptions explicit even if all targets are assigned',()=>{
    const p=targetFixture(),result=planFloor(p.floors[0],p.settings);
    expect(result.issues.some(i=>i.code==='RF_PLANNING_ASSUMPTION')).toBe(true);
    expect(result.issues.some(i=>i.code==='CAMERA_VIEW_ASSUMPTION')).toBe(true);
  });
  it('rejects oversized planning workloads without starting unbounded candidate search',()=>{
    const p=minimalProject(),f=p.floors[0];f.rooms=Array.from({length:101},(_,i)=>({...f.rooms[0],id:`room${i}`}));
    const result=planFloor(f,p.settings);expect(result.issues.some(i=>i.code==='PLANNING_COMPLEXITY'&&i.severity==='blocking')).toBe(true);
    expect(result.floor.devices).toHaveLength(0);
  });
});
