import { door, entrance, floor, room, target } from './builder';
export function gym(){
  const f=floor('gym-f1','健身房 · 1层',40,25,[
    room('entry','前台入口','entrance',0,0,8,5),room('cash','服务收银','cashier',8,0,4,5),room('lobby','公共休息区','public',12,0,20,5),room('equipment','设备间','equipment',32,0,8,5),
    room('cardio','有氧区','public',0,5,16,12),room('strength','力量区','public',16,5,16,12),room('group','团操房','public',0,17,16,8),room('yoga','瑜伽室','public',16,17,16,8),
    room('changing','更衣区','changing',32,5,8,9),room('shower','淋浴区','shower',32,14,8,7),room('toilet','卫生间','toilet',32,21,8,4),
  ],{employees:12,visitors:160,concurrentUsers:90,terminals:110,wiredPoints:4});
  entrance(f,'entry',{x:4,y:0});door(f,'entry','cardio',{x:4,y:5},2);door(f,'cash','cardio',{x:10,y:5});door(f,'cardio','strength',{x:16,y:10},2);
  door(f,'lobby','strength',{x:24,y:5},2);door(f,'lobby','equipment',{x:32,y:2});door(f,'cardio','group',{x:8,y:17},2);door(f,'strength','yoga',{x:24,y:17});
  door(f,'strength','changing',{x:32,y:10});door(f,'changing','shower',{x:36,y:14});door(f,'shower','toilet',{x:36,y:21});
  target(f,'entry',{x:4,y:1},'entrance',3);target(f,'cash',{x:10,y:2},'cashier',3);target(f,'cardio',{x:8,y:11},'public',2);target(f,'strength',{x:24,y:11},'public',2);target(f,'group',{x:8,y:21},'public');target(f,'yoga',{x:24,y:21},'public');
  return [f];
}
