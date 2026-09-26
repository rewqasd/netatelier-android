import type {Vec3} from '../domain/model';
import {assertPathsBounded} from '../domain/workload';
export interface PhysicalSegment {scope:string;from:Vec3;to:Vec3;ids:string[]}
const sub=(a:Vec3,b:Vec3):Vec3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a:Vec3,b:Vec3)=>a.x*b.x+a.y*b.y+a.z*b.z;
const norm=(a:Vec3)=>Math.hypot(a.x,a.y,a.z);
const tolerance=1e-6;
/** Split only collinear overlap. A geometric crossing does not create a shared run. */
export function unionSegments(input:PhysicalSegment[]):PhysicalSegment[]{
  assertPathsBounded((function*(){for(const s of input)yield [s.from,s.to];})());
  const groups:{scope:string;origin:Vec3;unit:Vec3;intervals:{start:number;end:number;ids:string[]}[]}[]=[];
  for(const segment of input){
    const vector=sub(segment.to,segment.from),length=norm(vector);if(length<tolerance)continue;
    const collinear=(p:Vec3,g:typeof groups[number])=>{const delta=sub(p,g.origin),t=dot(delta,g.unit);return norm({x:delta.x-t*g.unit.x,y:delta.y-t*g.unit.y,z:delta.z-t*g.unit.z})<tolerance;};
    let group=groups.find(g=>g.scope===segment.scope&&collinear(segment.from,g)&&collinear(segment.to,g));
    if(!group){
      const reversed=vector.x< -tolerance||(Math.abs(vector.x)<tolerance&&(vector.y< -tolerance||(Math.abs(vector.y)<tolerance&&vector.z<0)));
      const factor=reversed?-1:1;group={scope:segment.scope,origin:segment.from,unit:{x:vector.x/length*factor,y:vector.y/length*factor,z:vector.z/length*factor},intervals:[]};groups.push(group);
    }
    const a=dot(sub(segment.from,group.origin),group.unit),b=dot(sub(segment.to,group.origin),group.unit);group.intervals.push({start:Math.min(a,b),end:Math.max(a,b),ids:segment.ids});
  }
  const result:PhysicalSegment[]=[];
  for(const group of groups){
    const cuts=group.intervals.flatMap(i=>[i.start,i.end]).sort((a,b)=>a-b).filter((v,i,list)=>i===0||v-list[i-1]>tolerance);
    const at=(t:number)=>({x:group.origin.x+t*group.unit.x,y:group.origin.y+t*group.unit.y,z:group.origin.z+t*group.unit.z});
    let previous:PhysicalSegment|undefined;
    for(let i=0;i<cuts.length-1;i++){
      const middle=(cuts[i]+cuts[i+1])/2,ids=[...new Set(group.intervals.filter(v=>v.start<=middle&&v.end>=middle).flatMap(v=>v.ids))].sort();if(!ids.length){previous=undefined;continue;}
      if(previous&&previous.ids.join('\0')===ids.join('\0'))previous.to=at(cuts[i+1]);
      else{previous={scope:group.scope,from:at(cuts[i]),to:at(cuts[i+1]),ids};result.push(previous);}
    }
  }
  return result;
}
export const pathLength3=(points:Vec3[])=>points.slice(1).reduce((n,p,i)=>n+norm(sub(p,points[i])),0);
