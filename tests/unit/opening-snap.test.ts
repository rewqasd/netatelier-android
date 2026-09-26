import {it,expect} from 'vitest';
import {snapOpening} from '../../src/recognition/calibration';
const boundary=[{x:150,y:225},{x:2100,y:225},{x:2100,y:1350},{x:150,y:1350}];
it('snaps a near-border door tap onto the drawn edge instead of rejecting subpixel touch error',()=>{
 expect(snapOpening({x:149.7,y:1200},[boundary])).toEqual({x:150,y:1200});
 expect(snapOpening({x:149,y:224},[boundary])).toEqual({x:150,y:225});
});
it('does not hide a genuinely misplaced door or move an exact engineering point',()=>{
 expect(snapOpening({x:135,y:1200},[boundary])).toEqual({x:135,y:1200});
 expect(snapOpening({x:150,y:1200},[boundary])).toEqual({x:150,y:1200});
});
