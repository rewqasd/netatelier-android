import {it,expect} from 'vitest';
import {minimalProject} from '../helpers/projects';
import {measureProject} from '../../src/quote/quantities';
import {validateProject} from '../../src/domain/schema';
import type {Cable} from '../../src/domain/model';
const cable=(id:string):Cable=>({id,floorId:'f1',fromId:'cab',toId:id,pointsM:[{x:1,y:1},{x:11,y:1}],status:'confirmed',locked:false});
function sample(){const p=minimalProject();p.settings.endpointAllowanceM=0;p.settings.dropM=0;p.settings.cableReserve=0;p.floors[0].devices=[{id:'cab',floorId:'f1',kind:'cabinet',label:'cab',positionM:{x:1,y:1},locked:false,source:'manual'},...['a','b'].map(id=>({id,floorId:'f1',kind:'ap' as const,label:id,positionM:{x:11,y:1},locked:false,source:'automatic' as const}))];p.floors[0].cables=[cable('a'),cable('b')];return p;}
it('two independent 10m lines sharing geometry count 20m cable but 10m tray',()=>{
  const p=sample(),q=measureProject(p);expect(q.netCableM).toBe(20);expect(q.trayM).toBe(10);expect(q.independentLinks).toBe(2);expect(q.cableWithReserveM).toBe(20);
  p.settings.endpointAllowanceM=1;p.settings.dropM=2;p.settings.cableReserve=.1;expect(measureProject(p).cableWithReserveM).toBe(30.8); // (20 + 2 lines × (2 ends × 1 + 2 drop)) × 1.1
});
it('disconnected, provisional, unscaled, missing and over90m links prevent complete quantities',()=>{
  const p=sample();p.floors[0].cables[0].status='disconnected';p.floors[0].cables[0].pointsM=[];expect(measureProject(p).issues.some(i=>i.code==='DISCONNECTED_CABLE'&&i.severity==='blocking')).toBe(true);
  p.floors[0].cables[0]={...cable('a'),status:'provisional'};expect(measureProject(p).issues.some(i=>i.code==='PROVISIONAL_ROUTE')).toBe(true);
  p.floors[0].calibration={kind:'unset',metersPerPixel:null,originPx:{x:0,y:0},angleRad:0};expect(measureProject(p).issues.some(i=>i.code==='MISSING_SCALE')).toBe(true);
  p.floors[0].calibration={kind:'known-length',metersPerPixel:.05,originPx:{x:0,y:0},angleRad:0};p.floors[0].cables[0].pointsM=[{x:0,y:0},{x:100,y:0}];expect(measureProject(p).issues.some(i=>i.code==='COPPER_OVER_90M')).toBe(true);
  p.floors[0].cables=[];expect(measureProject(p).issues.some(i=>i.code==='MISSING_LINK')).toBe(true);
});
it('cross-floor independent backbones include height, while a shared vertical shaft is unique',()=>{
  const p=sample();p.floors[0].cables=[];p.floors[0].devices=p.floors[0].devices.slice(0,1);
  p.floors.push({...structuredClone(p.floors[0]),id:'f2',name:'2层',elevationM:3,rooms:[],devices:[{...p.floors[0].devices[0],id:'cab2',floorId:'f2'}]},{...structuredClone(p.floors[0]),id:'f3',name:'3层',elevationM:6,rooms:[],devices:[{...p.floors[0].devices[0],id:'cab3',floorId:'f3'}]});
  p.backbones=[{id:'bb2',fromFloorId:'f1',toFloorId:'f2',fromId:'cab',toId:'cab2',pointsM:[{x:1,y:1,z:0},{x:1,y:1,z:3}],medium:'fiber',status:'confirmed',locked:false},{id:'bb3',fromFloorId:'f1',toFloorId:'f3',fromId:'cab',toId:'cab3',pointsM:[{x:1,y:1,z:0},{x:1,y:1,z:6}],medium:'fiber',status:'confirmed',locked:false}];
  expect(validateProject(p).project).toBeDefined();const q=measureProject(p);expect(q.backboneM).toBe(9);expect(q.trayM).toBe(6);expect(q.netCableM).toBe(0);
});
