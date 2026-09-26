import {it,expect} from 'vitest';
import {displayMarkers,roomLabel} from '../../src/ui/display-layout';
it('overlapping icons get bounded display leaders without moving engineering anchors',()=>{
 const input=[{id:'a',at:{x:1,y:1}},{id:'b',at:{x:1,y:1}},{id:'c',at:{x:389,y:269}}];
 const result=displayMarkers(input,390,270);
 expect(result[0].anchor).toEqual({x:1,y:1});expect(input[0].at).toEqual({x:1,y:1});
 expect(Math.hypot(result[0].at.x-result[1].at.x,result[0].at.y-result[1].at.y)).toBeGreaterThanOrEqual(38);
 expect(result.every(p=>p.at.x>=24&&p.at.x<=366&&p.at.y>=22&&p.at.y<=234)).toBe(true);
});
it('room titles avoid equipment icons while narrow rooms wrap or use an explicit legend number',()=>{
 const label=roomLabel([{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}],'公共区域',[{x:50,y:50}],0);
 expect(Math.hypot(label.at.x-50,label.at.y-50)).toBeGreaterThan(30);expect(label.at.x).toBeGreaterThan(8);expect(label.at.x).toBeLessThan(92);
 const narrow=roomLabel([{x:0,y:0},{x:40,y:0},{x:40,y:110},{x:0,y:110}],'401 客房',[],1);expect(narrow.lines.length>1||narrow.numbered).toBe(true);
});
