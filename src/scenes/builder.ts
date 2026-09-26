import type { Floor, FloorDemand, Room, RoomUse, Vec2 } from '../domain/model';

export const rectangle=(x:number,y:number,w:number,h:number):Vec2[]=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
export const room=(id:string,name:string,use:RoomUse,x:number,y:number,w:number,h:number):Room=>({id,name,use,polygon:rectangle(x,y,w,h),confirmed:true,needsWifi:!['equipment','toilet','shower','storage'].includes(use)});

/** Scene inputs are explicit rectangles; uploaded drawings never use this builder. */
export function floor(id:string,name:string,w:number,h:number,rooms:Room[],demand:FloorDemand,elevationM=0):Floor{
  const walls:Floor['walls']=[],seen=new Set<string>();
  for(const r of rooms)for(let i=0;i<r.polygon.length;i++){
    const from=r.polygon[i],to=r.polygon[(i+1)%r.polygon.length];
    const key=[`${from.x},${from.y}`,`${to.x},${to.y}`].sort().join('|');
    if(seen.has(key))continue;seen.add(key);
    walls.push({id:`${id}-w${walls.length+1}`,from:{...from},to:{...to},material:'partition',confirmed:true});
  }
  return {id,name,elevationM,boundary:rectangle(0,0,w,h),rooms:rooms.map(r=>({...r,id:`${id}-${r.id}`})),walls,openings:[],targets:[],devices:[],cables:[],demand,
    calibration:{kind:'demo',metersPerPixel:0.05,originPx:{x:0,y:0},angleRad:0},notes:'合成演示户型；隔墙、门洞、人数均为可修改的规划假设，非现场勘察。'};
}
export function door(f:Floor,a:string,b:string,at:Vec2,widthM=1.2):void{
  f.openings.push({id:`${f.id}-door${f.openings.length+1}`,at,roomIds:[`${f.id}-${a}`,`${f.id}-${b}`],widthM,entrance:false,confirmed:true});
}
export function entrance(f:Floor,r:string,at:Vec2):void{
  f.openings.push({id:`${f.id}-entrance`,at,roomIds:[`${f.id}-${r}`],widthM:1.8,entrance:true,confirmed:true});
}
export function target(f:Floor,r:string,at:Vec2,kind:Floor['targets'][number]['kind'],weight=1):void{
  f.targets.push({id:`${f.id}-target${f.targets.length+1}`,roomId:`${f.id}-${r}`,at,kind,weight,confirmed:true});
}
