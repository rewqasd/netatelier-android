import {it,expect} from 'vitest';
import {interiorLabelPoint,containsPoint,distanceToSegment} from '../../src/domain/geometry';
it('places room labels inside angled and concave shapes, away from shared corners',()=>{
  const a=[{x:160,y:15},{x:160,y:225},{x:25,y:120}],b=[{x:160,y:15},{x:295,y:120},{x:160,y:225}];
  const left=interiorLabelPoint(a),right=interiorLabelPoint(b);
  expect(left.x).toBeLessThan(120);expect(right.x).toBeGreaterThan(200);
  const elbow=[{x:0,y:0},{x:240,y:0},{x:240,y:75},{x:130,y:75},{x:130,y:190},{x:0,y:190}];
  const point=interiorLabelPoint(elbow);expect(containsPoint(point,elbow)).toBe(true);
  expect(Math.min(...elbow.map((a,i)=>distanceToSegment(point,a,elbow[(i+1)%elbow.length])))).toBeGreaterThan(30);
});
