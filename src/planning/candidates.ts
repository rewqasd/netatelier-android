import type {Floor,Room,Vec2} from '../domain/model';
import {containsPoint,distance,distanceToSegment,polygonArea} from '../domain/geometry';
export const cameraExcluded=new Set(['guest','toilet','changing','shower','meeting','office']);
export const protectedPoint=(d:{locked:boolean;source:string})=>d.locked||d.source==='manual';
export function edgeClearance(p:Vec2,r:Room):number{return Math.min(...r.polygon.map((a,i)=>distanceToSegment(p,a,r.polygon[(i+1)%r.polygon.length])));}
/** Room-relative axes rotate with the drawing, never with the screen. */
export function roomGrid(room:Room,spacing=4):Vec2[]{
  const poly=room.polygon;if(poly.length<3||polygonArea(poly)<.01)return [];
  let edge=0;for(let i=1;i<poly.length;i++)if(distance(poly[i],poly[(i+1)%poly.length])>distance(poly[edge],poly[(edge+1)%poly.length])+1e-7)edge=i;
  const origin=poly[edge],next=poly[(edge+1)%poly.length],length=distance(origin,next);if(length<1e-7)return [];
  const u={x:(next.x-origin.x)/length,y:(next.y-origin.y)/length},v={x:-u.y,y:u.x};
  const coords=poly.map(p=>({x:(p.x-origin.x)*u.x+(p.y-origin.y)*u.y,y:(p.x-origin.x)*v.x+(p.y-origin.y)*v.y}));
  const minX=Math.min(...coords.map(p=>p.x)),minY=Math.min(...coords.map(p=>p.y)),w=Math.max(...coords.map(p=>p.x))-minX,h=Math.max(...coords.map(p=>p.y))-minY;
  const nx=Math.max(1,Math.min(24,Math.ceil(w/spacing))),ny=Math.max(1,Math.min(24,Math.ceil(h/spacing))),points:Vec2[]=[];
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const a=minX+w*(x+.5)/nx,b=minY+h*(y+.5)/ny,p={x:origin.x+u.x*a+v.x*b,y:origin.y+u.y*a+v.y*b};
    if(containsPoint(p,poly)&&edgeClearance(p,room)>.1)points.push(p);
  }
  return points;
}
export function roomCentre(room:Room):Vec2{
  const average={x:room.polygon.reduce((s,p)=>s+p.x,0)/room.polygon.length,y:room.polygon.reduce((s,p)=>s+p.y,0)/room.polygon.length};
  if(containsPoint(average,room.polygon)&&edgeClearance(average,room)>.1)return average;
  return roomGrid(room,1).sort((a,b)=>edgeClearance(b,room)-edgeClearance(a,room))[0]??room.polygon[0];
}
export function cameraAllowed(floor:Floor,point:Vec2):boolean{
  return containsPoint(point,floor.boundary)&&floor.rooms.some(r=>r.confirmed&&!cameraExcluded.has(r.use)&&containsPoint(point,r.polygon))&&!floor.rooms.some(r=>cameraExcluded.has(r.use)&&containsPoint(point,r.polygon));
}
export function cameraCandidates(floor:Floor):{at:Vec2;roomId:string}[]{
  return floor.rooms.filter(r=>r.confirmed&&!cameraExcluded.has(r.use)).flatMap(room=>{
    const center=roomCentre(room),points:Vec2[]=[];
    for(let i=0;i<room.polygon.length;i++){
      const a=room.polygon[i],b=room.polygon[(i+1)%room.polygon.length];
      for(const fraction of [.12,.5,.88]){
        const p={x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction},d=distance(p,center);if(d<.2)continue;
        const step=Math.min(.55,d/2),q={x:p.x+(center.x-p.x)/d*step,y:p.y+(center.y-p.y)/d*step};
        if(cameraAllowed(floor,q)&&edgeClearance(q,room)>.12)points.push(q);
      }
    }
    if(!points.length&&cameraAllowed(floor,center))points.push(center);
    return points.map(at=>({at,roomId:room.id}));
  });
}
