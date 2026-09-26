import type { Floor, Opening, Vec2, Wall } from './model';
export const EPS=1e-7;
export const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.y-b.y);
/** Display-only label anchor; never used to move physical equipment. */
export function interiorLabelPoint(polygon:Vec2[]):Vec2{
  if(!polygon.length)return {x:0,y:0};
  const xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),width=Math.max(...xs)-minX,height=Math.max(...ys)-minY;
  let best=polygon[0],clearance=-1;
  for(let y=1;y<24;y++)for(let x=1;x<24;x++){
    const p={x:minX+width*x/24,y:minY+height*y/24};if(!containsPoint(p,polygon))continue;
    const d=Math.min(...polygon.map((a,i)=>distanceToSegment(p,a,polygon[(i+1)%polygon.length])));
    if(d>clearance){best=p;clearance=d;}
  }
  return {...best};
}
const cross=(a:Vec2,b:Vec2,c:Vec2)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function distanceToSegment(p:Vec2,a:Vec2,b:Vec2):number{
  const len=(b.x-a.x)**2+(b.y-a.y)**2;
  if(len<EPS*EPS)return distance(p,a);
  const t=Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/len));
  return distance(p,{x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)});
}
export function containsPoint(p:Vec2,polygon:Vec2[]):boolean{
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[j],b=polygon[i];
    if(distanceToSegment(p,a,b)<=EPS)return true;
    if((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}
export function polygonArea(polygon:Vec2[]):number{
  if(polygon.length<3)return 0;
  // Translate first: precision is not lost merely because a plan is far from zero.
  const o=polygon[0];let area=0;
  for(let i=1;i<polygon.length-1;i++)area+=cross(o,polygon[i],polygon[i+1]);
  return Math.abs(area)/2;
}
export function segmentsIntersect(a:Vec2,b:Vec2,c:Vec2,d:Vec2):boolean{
  if([distanceToSegment(a,c,d),distanceToSegment(b,c,d),distanceToSegment(c,a,b),distanceToSegment(d,a,b)].some(n=>n<=EPS))return true;
  const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
  return ab1*ab2<0 && cd1*cd2<0;
}
export function segmentBlocked(a:Vec2,b:Vec2,walls:Wall[],openings:Opening[]):boolean{
  for(const wall of walls){
    const c=wall.from,d=wall.to;
    if(!segmentsIntersect(a,b,c,d))continue;
    const denominator=(b.x-a.x)*(d.y-c.y)-(b.y-a.y)*(d.x-c.x);
    if(Math.abs(denominator)<=EPS)return true;
    const t=((c.x-a.x)*(d.y-c.y)-(c.y-a.y)*(d.x-c.x))/denominator;
    const at={x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)};
    // A confirmed opening can span the two inner contours of a thin scanned wall.
    // The 0.25m band does not turn an unconfirmed mark into a passable doorway.
    const throughDoor=openings.some(o=>o.confirmed && distanceToSegment(o.at,c,d)<=Math.min(.25,o.widthM/2)+EPS && distance(o.at,at)<o.widthM/2-EPS);
    if(!throughDoor)return true;
  }
  return false;
}
export function transformFloor(f:Floor,t:{angleRad:number;translation:Vec2}):Floor{
  const p=structuredClone(f),cos=Math.cos(t.angleRad),sin=Math.sin(t.angleRad);
  const move=(v:Vec2)=>({x:v.x*cos-v.y*sin+t.translation.x,y:v.x*sin+v.y*cos+t.translation.y});
  p.boundary=p.boundary.map(move);
  p.rooms.forEach(r=>r.polygon=r.polygon.map(move));
  p.walls.forEach(w=>{w.from=move(w.from);w.to=move(w.to)});
  p.openings.forEach(o=>o.at=move(o.at));p.targets.forEach(v=>v.at=move(v.at));
  p.devices.forEach(d=>{d.positionM=move(d.positionM);if(d.directionRad!==undefined)d.directionRad+=t.angleRad});
  p.cables.forEach(c=>c.pointsM=c.pointsM.map(move));
  p.trayPaths=p.trayPaths?.map(path=>path.map(move));
  p.calibration.angleRad+=t.angleRad;
  const scale=p.calibration.metersPerPixel;
  if(scale){
    const c=Math.cos(p.calibration.angleRad),s=Math.sin(p.calibration.angleRad);
    p.calibration.originPx.x-=(t.translation.x*c+t.translation.y*s)/scale;
    p.calibration.originPx.y-=(-t.translation.x*s+t.translation.y*c)/scale;
  }
  return p;
}
