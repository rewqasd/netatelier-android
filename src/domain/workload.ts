import type {Project,Vec2,Vec3} from './model';
// A phone editor is not a GIS batch processor. Limits apply to the entire
// project (including dormant routes), before allocation, unions or rendering.
export const MAX_ROUTE_SEGMENTS=2048;
const MAX_ROUTE_METRES=100_000;
export function assertPathsBounded(paths:Iterable<readonly (Vec2|Vec3)[]>):void{
 let segments=0,metres=0;
 for(const path of paths){
  segments+=Math.max(0,path.length-1);
  if(segments>MAX_ROUTE_SEGMENTS)throw new Error('线路超过手机计算上限（全项目2048段），请简化路径或拆分项目。');
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i];metres+=Math.hypot(b.x-a.x,b.y-a.y,('z' in b?b.z:0)-('z' in a?a.z:0));
   if(!Number.isFinite(metres)||metres>MAX_ROUTE_METRES)throw new Error('路径总长超过100公里安全上限，请检查比例、坐标或拆分项目。');
  }
 }
}
export function assertEngineeringBounded(project:Project):void{
 function* paths(){for(const f of project.floors){for(const c of f.cables)yield c.pointsM;for(const path of f.trayPaths??[])yield path;}for(const b of project.backbones??[])yield b.pointsM;}
 assertPathsBounded(paths());
}
