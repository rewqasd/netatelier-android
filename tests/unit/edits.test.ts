import {describe,it,expect} from 'vitest';
import {minimalProject} from '../helpers/projects';
import {applyEdit} from '../../src/planning/edits';
import {planFloor} from '../../src/planning/ap';
import type {Device} from '../../src/domain/model';
function placed(){const p=minimalProject();p.floors[0].devices=[{id:'ap1',floorId:'f1',kind:'ap',label:'AP1',positionM:{x:5,y:5},locked:true,source:'manual',wifi:6,serviceRoomIds:['r1']},{id:'ap2',floorId:'f1',kind:'ap',label:'AP2',positionM:{x:14,y:9},locked:false,source:'automatic',wifi:6,serviceRoomIds:['r1']}];return p;}
describe('immutable project transactions',()=>{
  it('radio-only changes keep physical positions and demand while updating every AP',()=>{
    const p=placed(),before=structuredClone(p),next=applyEdit(p,{type:'configure',floorId:'f1',counts:{ap:2,camera:0,information:0},wifi:5,modelId:'wifi5'});
    expect(next.floors[0].devices.filter(d=>d.kind==='ap').every(d=>d.wifi===5&&d.modelId==='wifi5')).toBe(true);
    expect(next.floors[0].devices.map(d=>d.positionM)).toEqual(before.floors[0].devices.map(d=>d.positionM));expect(next.floors[0].demand).toEqual(before.floors[0].demand);expect(p).toEqual(before);
  });
  it('rejects reduction below protected count without partial mutation',()=>{
    const p=placed(),before=structuredClone(p);expect(()=>applyEdit(p,{type:'configure',floorId:'f1',counts:{ap:0,camera:0,information:0},wifi:6})).toThrow(/锁定|手工/);expect(p).toEqual(before);
  });
  it('moving a point invalidates stale cable geometry and outside moves fail',()=>{
    const p=placed();p.floors[0].cables=[{id:'line',floorId:'f1',fromId:'ap1',toId:'ap2',pointsM:[{x:5,y:5},{x:14,y:9}],locked:false,status:'confirmed'}];
    const next=applyEdit(p,{type:'move-device',floorId:'f1',id:'ap2',positionM:{x:12,y:8}});
    expect(next.floors[0].devices[1].positionM).toEqual({x:12,y:8});expect(next.floors[0].cables[0].status).toBe('disconnected');expect(next.floors[0].cables[0].pointsM).toEqual([]);
    expect(()=>applyEdit(p,{type:'move-device',floorId:'f1',id:'ap2',positionM:{x:-1,y:8}})).toThrow(/边界/);
  });
  it('requires explicit add, prevents privacy camera installation and protects locked deletion',()=>{
    const p=placed(),camera:Device={id:'cam',floorId:'f1',kind:'camera',positionM:{x:4,y:3},label:'摄像头',locked:false,source:'manual'};
    expect(applyEdit(p,{type:'add-device',floorId:'f1',device:camera}).floors[0].devices).toHaveLength(3);
    p.floors[0].rooms[0].use='changing';expect(()=>applyEdit(p,{type:'add-device',floorId:'f1',device:camera})).toThrow(/隐私|监控/);
    expect(()=>applyEdit(p,{type:'delete-device',floorId:'f1',id:'ap1'})).toThrow(/锁定/);
  });
  it('business additions are affirmative and removal preserves unrelated manual points',()=>{
    const p=placed();const next=applyEdit(p,{type:'join-business',selection:{id:'biz',modelId:'pos',floorId:'f1',roomId:'r1',quantity:1,purchase:false,network:'wired'}});
    expect(next.business).toHaveLength(1);expect(p.business).toHaveLength(0);
    const restored=applyEdit(next,{type:'remove-business',id:'biz'});expect(restored.business).toHaveLength(0);expect(restored.floors[0].devices).toEqual(p.floors[0].devices);
  });
  it('an explicit deletion is not resurrected by later automatic planning',()=>{
    const p=placed(),next=applyEdit(p,{type:'delete-device',floorId:'f1',id:'ap2'});
    expect(planFloor(next.floors[0],next.settings).floor.devices.filter(d=>d.kind==='ap')).toHaveLength(1);
  });
  it('moving an AP does not retain a stale service-area claim',()=>{
    const p=placed(),next=applyEdit(p,{type:'move-device',floorId:'f1',id:'ap2',positionM:{x:8,y:4}});
    expect(next.floors[0].devices[1].serviceRoomIds).toEqual([]);
  });
  it('an unchanged locked route can be explicitly unlocked before editing',()=>{
    const p=placed();const cable={id:'wire',floorId:'f1',fromId:'ap1',toId:'ap2',pointsM:[{x:5,y:5},{x:14,y:9}],locked:true,status:'confirmed' as const};p.floors[0].cables=[cable];
    expect(applyEdit(p,{type:'route',floorId:'f1',cable:{...cable,locked:false}}).floors[0].cables[0].locked).toBe(false);
    expect(()=>applyEdit(p,{type:'route',floorId:'f1',cable:{...cable,locked:false,pointsM:[{x:5,y:5},{x:5,y:9},{x:14,y:9}]}})).toThrow(/锁定/);
  });
});
