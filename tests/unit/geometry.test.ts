import { describe, expect, it } from 'vitest';
import { containsPoint, polygonArea, segmentsIntersect, segmentBlocked, transformFloor } from '../../src/domain/geometry';
import { minimalProject } from '../helpers/projects';
import type { Opening, Wall } from '../../src/domain/model';
const rect = [{x:0,y:0},{x:20,y:0},{x:20,y:15},{x:0,y:15}];
describe('metric geometry', () => {
  it('computes signed-independent area and includes edges, not a concavity notch', () => {
    expect(polygonArea(rect)).toBe(300);
    expect(polygonArea([...rect].reverse())).toBe(300);
    expect(containsPoint({x:20,y:7}, rect)).toBe(true);
    expect(containsPoint({x:20.01,y:7}, rect)).toBe(false);
    const l = [{x:0,y:0},{x:4,y:0},{x:4,y:1},{x:1,y:1},{x:1,y:4},{x:0,y:4}];
    expect(containsPoint({x:2,y:2}, l)).toBe(false);
    expect(containsPoint({x:0.5,y:3}, l)).toBe(true);
    expect(polygonArea(l)).toBe(7);
  });
  it('detects crossings, touching, collinear overlap and disjoint parallel lines', () => {
    expect(segmentsIntersect({x:0,y:0},{x:4,y:4},{x:0,y:4},{x:4,y:0})).toBe(true);
    expect(segmentsIntersect({x:0,y:0},{x:4,y:0},{x:2,y:0},{x:6,y:0})).toBe(true);
    expect(segmentsIntersect({x:0,y:0},{x:4,y:0},{x:4,y:0},{x:6,y:2})).toBe(true);
    expect(segmentsIntersect({x:0,y:0},{x:4,y:0},{x:5,y:0},{x:6,y:0})).toBe(false);
    expect(segmentsIntersect({x:0,y:0},{x:4,y:0},{x:0,y:1},{x:4,y:1})).toBe(false);
  });
  it('blocks walls but lets a ray through a confirmed door only', () => {
    const wall:Wall = {id:'w',from:{x:5,y:0},to:{x:5,y:10},material:'brick',confirmed:true};
    const door:Opening = {id:'d',at:{x:5,y:5},widthM:1,roomIds:[],entrance:false,confirmed:true};
    expect(segmentBlocked({x:1,y:3},{x:9,y:3},[wall],[door])).toBe(true);
    expect(segmentBlocked({x:1,y:5},{x:9,y:5},[wall],[door])).toBe(false);
    expect(segmentBlocked({x:1,y:5},{x:9,y:5},[wall],[{...door,confirmed:false}])).toBe(true);
  });
  it('rigid transforms preserve area and transform all metric objects without mutation', () => {
    const floor = minimalProject().floors[0];
    floor.boundary=rect; floor.openings=[{id:'d',at:{x:4,y:5},widthM:1,roomIds:[],entrance:true,confirmed:true}];
    floor.devices=[{id:'cam',floorId:floor.id,kind:'camera',label:'C',positionM:{x:2,y:3},directionRad:0,locked:true,source:'manual'}];
    floor.cables=[{id:'wire',floorId:floor.id,fromId:'a',toId:'b',pointsM:[{x:2,y:3},{x:4,y:5}],status:'provisional',locked:true}];
    floor.trayPaths=[[{x:1,y:2},{x:3,y:2}]];
    const original=structuredClone(floor);
    const moved=transformFloor(floor,{angleRad:Math.PI/2,translation:{x:40,y:20}});
    expect(polygonArea(moved.boundary)).toBeCloseTo(300);
    expect(moved.devices[0].positionM).toEqual({x:37,y:22});
    expect(moved.devices[0].directionRad).toBeCloseTo(Math.PI/2);
    expect(moved.openings[0].at).toEqual({x:35,y:24});
    expect(moved.cables[0].pointsM[1]).toEqual({x:35,y:24});
    expect(moved.trayPaths?.[0][0]).toEqual({x:38,y:21});
    expect(floor).toEqual(original);
  });
});
