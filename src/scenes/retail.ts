import { door, entrance, floor, room, target } from './builder';
export function retail(){
  const f=floor('retail-f1','零售门店 · 1层',20,10,[
    room('entry','入口','entrance',0,0,4,3),room('cash','收银区','cashier',4,0,6,3),room('aisle','主通道','corridor',10,0,6,3),
    room('shop','货架销售区','public',0,3,16,7),room('storage','仓储','storage',16,0,4,6),room('staff','员工区与弱电柜','office',16,6,4,4),
  ],{employees:6,visitors:35,concurrentUsers:20,terminals:30,wiredPoints:3});
  entrance(f,'entry',{x:2,y:0});door(f,'entry','shop',{x:2,y:3},2);door(f,'cash','shop',{x:7,y:3});door(f,'aisle','shop',{x:13,y:3},2);door(f,'aisle','storage',{x:16,y:1.5});door(f,'shop','staff',{x:16,y:8});
  target(f,'entry',{x:2,y:1},'entrance',3);target(f,'cash',{x:7,y:1.5},'cashier',3);target(f,'shop',{x:8,y:6},'public',2);target(f,'storage',{x:18,y:3},'public');
  return [f];
}
