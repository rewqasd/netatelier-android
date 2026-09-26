import { door, entrance, floor, room, target } from './builder';
export function restaurant(){
  const f=floor('restaurant-f1','餐厅 · 1层',20,20,[
    room('entry','入口候餐','entrance',0,0,6,4),room('cash','收银台','cashier',6,0,4,4),room('wait','等候区','public',10,0,4,4),
    room('dining','开放就餐','public',0,4,14,11),room('private1','包间 A','public',14,0,6,8),room('private2','包间 B','public',14,8,6,7),
    room('kitchen','后厨','kitchen',0,15,10,5),room('storage','库房','storage',10,15,4,5),room('toilet','卫生间','toilet',14,15,4,5),room('equipment','弱电间','equipment',18,15,2,5),
  ],{employees:16,visitors:120,concurrentUsers:75,terminals:90,wiredPoints:4});
  entrance(f,'entry',{x:2,y:0});
  door(f,'entry','dining',{x:3,y:4},2);door(f,'cash','dining',{x:8,y:4});door(f,'wait','dining',{x:12,y:4},2);
  door(f,'dining','private1',{x:14,y:6});door(f,'dining','private2',{x:14,y:11});door(f,'dining','kitchen',{x:6,y:15});
  door(f,'kitchen','storage',{x:10,y:18});door(f,'private2','toilet',{x:16,y:15});door(f,'private2','equipment',{x:19,y:15});
  target(f,'entry',{x:2,y:1},'entrance',3);target(f,'cash',{x:8,y:2},'cashier',3);target(f,'dining',{x:7,y:9},'public',2);target(f,'kitchen',{x:5,y:18},'public');
  return [f];
}
