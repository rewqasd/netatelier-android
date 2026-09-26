import { door, entrance, floor, room, target } from './builder';
export function hotel(){
  return Array.from({length:4},(_,index)=>{
    const n=index+1,rooms=[];
    for(let i=0;i<5;i++){
      rooms.push(room(`guest${i+1}`,`${n}0${i+1} 客房`,'guest',i*4,0,4,6));
      rooms.push(room(`guest${i+6}`,`${n}${i+6<10?'0':''}${i+6} 客房`,'guest',i*4,10,4,6));
    }
    rooms.push(room('corridor','客房走廊','corridor',0,6,20,4),room('lobby',index===0?'大厅与前台':'电梯厅','entrance',20,0,5,6),room('stairs','楼梯交通核','corridor',20,6,5,6),room('equipment','楼层弱电间','equipment',20,12,5,4));
    const f=floor(`hotel-f${n}`,`${n}层 · 10间客房`,25,16,rooms,{employees:index===0?6:2,visitors:20,concurrentUsers:22,terminals:30,wiredPoints:index===0?2:0},Math.round(index*3.2*10)/10);
    for(let i=0;i<5;i++){door(f,`guest${i+1}`,'corridor',{x:i*4+2,y:6});door(f,`guest${i+6}`,'corridor',{x:i*4+2,y:10});}
    door(f,'corridor','stairs',{x:20,y:8},2);door(f,'lobby','stairs',{x:22,y:6},2);door(f,'stairs','equipment',{x:22,y:12});entrance(f,'lobby',{x:25,y:3});
    target(f,'lobby',{x:24,y:3},'entrance',3);target(f,'corridor',{x:3,y:8},'circulation',2);target(f,'corridor',{x:17,y:8},'circulation',2);target(f,'stairs',{x:22,y:9},'circulation');
    return f;
  });
}
