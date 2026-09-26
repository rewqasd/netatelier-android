import {it,expect} from 'vitest';
import {quoteProject} from '../helpers/catalog';
import {applyEdit} from '../../src/planning/edits';
import {ProjectHistory} from '../../src/planning/history';
import {ProjectRepository} from '../../src/project/repository';
import {StoreTransport} from '../helpers/project-store';
import {routeProject} from '../../src/planning/routing';
import {cameraSees} from '../../src/planning/cameras';
import {measureProject} from '../../src/quote/quantities';
import {minimalProject} from '../helpers/projects';
import {createScene} from '../../src/scenes';
import {planFloor} from '../../src/planning/ap';
it('locked custom cable prevents endpoint movement, survives reopen, then explicitly unlocks and repairs',async()=>{
 const p=quoteProject(1),f=p.floors[0];f.cables[0].locked=true;const raw=JSON.stringify(f.cables);
 expect(()=>applyEdit(p,{type:'move-device',floorId:f.id,id:'ap0',positionM:{x:5.1,y:5}})).toThrow(/关联线路.*锁定/);expect(JSON.stringify(f.cables)).toBe(raw);
 const repo=new ProjectRepository(new StoreTransport());await repo.save(p);let next=await repo.load(p.id);expect(JSON.stringify(next.floors[0].cables)).toBe(raw);
 next=applyEdit(next,{type:'unlock-device-routes',floorId:f.id,id:'ap0'} as never);
 next=routeProject(applyEdit(next,{type:'move-device',floorId:f.id,id:'ap0',positionM:{x:5.1,y:5}})).project;
 expect(next.floors[0].cables[0].locked).toBe(false);expect(next.floors[0].cables[0].pointsM.slice(-1)).toEqual([{x:5.1,y:5}]);
 await repo.save(next);expect((await repo.load(p.id)).floors[0].cables).toEqual(next.floors[0].cables);
});
it('old disconnected locked cable can be unlocked from its endpoint without a visible shared segment',()=>{
 const p=quoteProject(1),f=p.floors[0];f.cables[0].locked=true;f.cables[0].status='disconnected';f.cables[0].pointsM=[];
 const n=routeProject(applyEdit(p,{type:'unlock-device-routes',floorId:f.id,id:'ap0'} as never)).project;
 expect(n.floors[0].cables[0].locked).toBe(false);expect(n.floors[0].cables[0].status).toBe('confirmed');expect(n.floors[0].cables[0].pointsM.length).toBeGreaterThan(1);
});
it('manual camera acquires a target without moving its protected coordinates, with undo and persisted aim',async()=>{
 const p=minimalProject(),f=p.floors[0];f.targets=[{id:'target',roomId:'r1',at:{x:8,y:5},kind:'public',weight:1,confirmed:true}];f.devices=[{id:'camera',floorId:f.id,kind:'camera',label:'手工摄像头',positionM:{x:5,y:5},source:'manual',locked:true}];
 const history=new ProjectHistory(p);history.apply({type:'aim-camera',floorId:f.id,id:'camera',targetId:'target'} as never);const aimed=history.current.floors[0].devices[0];
 expect(aimed.directionRad).toBe(0);expect(aimed.positionM).toEqual({x:5,y:5});expect(aimed.locked).toBe(true);expect(aimed.targetIds).toEqual(['target']);expect(cameraSees(f,aimed,f.targets[0])).toBe(true);
 history.undo();expect(history.current.floors[0].devices[0].directionRad).toBeUndefined();history.redo();
 const repo=new ProjectRepository(new StoreTransport());await repo.save(history.current);expect((await repo.load(p.id)).floors[0].devices[0]).toEqual(aimed);
 const unlocked=applyEdit(history.current,{type:'lock-device',floorId:f.id,id:'camera',locked:false});const moved=applyEdit(unlocked,{type:'move-device',floorId:f.id,id:'camera',positionM:{x:5.1,y:5}});expect(moved.floors[0].devices[0].targetIds).toEqual(['target']);
});
for(const index of [0,1])it(`unlocked hotel backbone regenerates on ${index?'floor':'root'} cabinet move and can be confirmed`,()=>{
 let p=createScene('hotel');p.floors=p.floors.map(f=>planFloor(f,p.settings).floor);p=routeProject(p).project;
 const f=p.floors[index],cab=f.devices.find(d=>d.kind==='cabinet')!;cab.locked=false;for(const b of p.backbones!)b.status='confirmed';
 const next=routeProject(applyEdit(p,{type:'move-device',floorId:f.id,id:cab.id,positionM:{x:cab.positionM.x+.1,y:cab.positionM.y}})).project;
 expect(measureProject(next).issues.some(i=>i.code==='STALE_BACKBONE')).toBe(false);const affected=next.backbones!.filter(b=>b.fromId===cab.id||b.toId===cab.id);expect(affected.every(b=>b.status==='provisional')).toBe(true);
 for(const link of affected)expect(()=>applyEdit(next,{type:'backbone',link:{...link,status:'confirmed'}})).not.toThrow();
});
it('locked backbone blocks relocation and an imported stale locked backbone remains repairable from its cabinet',()=>{
 let p=createScene('hotel');p.floors=p.floors.map(f=>planFloor(f,p.settings).floor);p=routeProject(p).project;
 const f=p.floors[1],cab=f.devices.find(d=>d.kind==='cabinet')!;cab.locked=false;p.backbones![0].locked=true;
 expect(()=>applyEdit(p,{type:'move-device',floorId:f.id,id:cab.id,positionM:{x:cab.positionM.x+.1,y:cab.positionM.y}})).toThrow(/关联线路.*锁定/);
 const original=structuredClone(p.backbones![0].pointsM);f.elevationM+=.2;const kept=routeProject(p).project;expect(kept.backbones![0].pointsM).toEqual(original);expect(kept.backbones![0].locked).toBe(true);
 const repaired=routeProject(applyEdit(kept,{type:'unlock-device-routes',floorId:f.id,id:cab.id})).project;
 expect(repaired.backbones![0].locked).toBe(false);expect(repaired.backbones![0].status).toBe('provisional');expect(measureProject(repaired).issues.some(i=>i.code==='STALE_BACKBONE')).toBe(false);
});
it('aiming at excluded or blocked targets never changes camera orientation or protected coordinates',()=>{
 const p=quoteProject(0,1),f=p.floors[0];f.targets=[{id:'target',roomId:'r1',at:{x:8,y:5},kind:'public',weight:1,confirmed:true}];const original=structuredClone(f.devices);
 f.rooms[0].use='changing';expect(()=>applyEdit(p,{type:'aim-camera',floorId:f.id,id:'camera0',targetId:'target'})).toThrow(/排除|隐私/);expect(f.devices).toEqual(original);
 f.rooms[0].use='public';f.walls=[{id:'wall',from:{x:6,y:0},to:{x:6,y:15},material:'brick',confirmed:true}];expect(()=>applyEdit(p,{type:'aim-camera',floorId:f.id,id:'camera0',targetId:'target'})).toThrow(/遮挡/);expect(f.devices).toEqual(original);
});
