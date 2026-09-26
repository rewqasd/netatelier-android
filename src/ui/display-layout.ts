import type {Vec2} from '../domain/model';
import {containsPoint,interiorLabelPoint} from '../domain/geometry';
export function roomLabel(polygon:Vec2[],name:string,markers:Vec2[],index:number):{at:Vec2;lines:string[];numbered:boolean}{
 const xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
 const measure=(s:string)=>[...s].reduce((n,c)=>n+(c===' '?3:c.charCodeAt(0)<256?6:11),0),maxWidth=Math.max(18,Math.min(96,w-10));
 const lines:string[]=[];let line='';for(const c of name){if(line&&measure(line+c)>maxWidth){lines.push(line.trim());line=c;}else line+=c;}if(line.trim())lines.push(line.trim());
 function choose(text:string[]){const width=Math.max(...text.map(measure))+4,height=text.length*13;let best:{at:Vec2;score:number}|undefined;
  for(const rx of [.5,.2,.8,.35,.65])for(const ry of [.5,.18,.82,.34,.66]){
   const at={x:x+w*rx,y:y+h*ry},corners=[{x:at.x-width/2,y:at.y-height/2},{x:at.x+width/2,y:at.y-height/2},{x:at.x+width/2,y:at.y+height/2},{x:at.x-width/2,y:at.y+height/2}];if(corners.some(p=>!containsPoint(p,polygon)))continue;
   const overlaps=markers.filter(p=>Math.abs(p.x-at.x)<width/2+21&&at.y+height/2>p.y-22&&at.y-height/2<p.y+38).length;
   const score=overlaps*10000+Math.hypot(rx-.5,ry-.5);if(!best||score<best.score)best={at,score};
  }return best;
 }
 const full=lines.length<=3?choose(lines):undefined;if(full&&full.score<10000)return {at:full.at,lines,numbered:false};
 const numbered=[`R${index+1}`],small=choose(numbered);return {at:small?.at??interiorLabelPoint(polygon),lines:numbered,numbered:true};
}
export function displayMarkers(points:{id:string;at:Vec2}[],width:number,height:number):{id:string;anchor:Vec2;at:Vec2}[]{
 const placed:Vec2[]=[];return points.map(p=>{
  const clamp=(a:Vec2)=>({x:Math.max(24,Math.min(width-24,a.x)),y:Math.max(22,Math.min(height-36,a.y))});
  let at=clamp(p.at),score=-Infinity;
  for(let ring=0;ring<=8;ring++)for(let i=0;i<(ring?16:1);i++){
   const angle=i*Math.PI/8,candidate=clamp({x:p.at.x+ring*22*Math.cos(angle),y:p.at.y+ring*22*Math.sin(angle)});
   const separation=Math.min(44,...placed.map(q=>Math.hypot(q.x-candidate.x,q.y-candidate.y)));
   const merit=separation*100-Math.hypot(candidate.x-p.at.x,candidate.y-p.at.y);
   if(merit>score){score=merit;at=candidate;}
  }
  placed.push(at);return {id:p.id,anchor:{...p.at},at};
 });
}
