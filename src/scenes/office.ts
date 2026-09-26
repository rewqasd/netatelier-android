import { door, entrance, floor, room, target } from './builder';
export function office(){
  const f=floor('office-f1','办公企业 · 1层',20,15,[
    room('entry','前台','entrance',0,0,5,4),room('meeting','会议室','meeting',5,0,7,4),room('office','独立办公室','office',12,0,5,4),room('equipment','弱电间','equipment',17,0,3,4),
    room('corridor','公共通道','corridor',0,4,20,2),room('open','开放办公区','public',0,6,16,9),room('break','茶水休息区','public',16,6,4,5),room('toilet','卫生间','toilet',16,11,4,4),
  ],{employees:30,visitors:8,concurrentUsers:40,terminals:60,wiredPoints:20});
  entrance(f,'entry',{x:2,y:0});
  for(const [r,x] of [['entry',2],['meeting',8],['office',14],['equipment',18]] as const)door(f,r,'corridor',{x,y:4});
  door(f,'corridor','open',{x:8,y:6},2);door(f,'corridor','break',{x:18,y:6});door(f,'break','toilet',{x:18,y:11});
  target(f,'entry',{x:2,y:1},'entrance',3);target(f,'corridor',{x:10,y:5},'circulation',2);target(f,'open',{x:8,y:10},'public');
  return [f];
}
