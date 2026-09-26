import type {Project,ProjectEdit,Device,Floor} from '../domain/model';
import {validateProject} from '../domain/schema';
import {containsPoint,distance} from '../domain/geometry';
import {cameraAllowed,roomCentre,protectedPoint} from './candidates';
import {planFloor} from './ap';
import {cameraSees} from './cameras';
function assertPosition(floor:Floor,device:Device):void{
  if(!Number.isFinite(device.positionM.x)||!Number.isFinite(device.positionM.y)||!containsPoint(device.positionM,floor.boundary))throw new Error('点位必须位于建筑边界内');
  if(device.kind==='camera'&&!cameraAllowed(floor,device.positionM))throw new Error('隐私区及默认排除房间不能安装监控');
}
function invalidate(floor:Floor,id:string):void{
  floor.cables=floor.cables.map(c=>c.fromId===id||c.toId===id?{...c,status:'disconnected',pointsM:[]}:c);
}
function preserveExplicitCount(floor:Floor):void{
  floor.deviceCounts={ap:floor.devices.filter(d=>d.kind==='ap').length,camera:floor.devices.filter(d=>d.kind==='camera').length,information:floor.devices.filter(d=>d.kind==='information'&&!d.businessId).length};
}
function assertRoutesUnlocked(project:Project,floor:Floor,id:string):void{
  if(floor.cables.some(c=>c.locked&&(c.fromId===id||c.toId===id))||project.backbones?.some(b=>b.locked&&(b.fromId===id||b.toId===id)))throw new Error('关联线路已锁定，请先在点位属性中解锁关联线路；未修改点位或走线。');
}
export function applyEdit(source:Project,edit:ProjectEdit):Project{
  const project=structuredClone(source),floor='floorId' in edit?project.floors.find(f=>f.id===edit.floorId):undefined;
  if('floorId' in edit&&!floor)throw new Error('楼层不存在');
  const device='id' in edit&&floor?floor.devices.find(d=>d.id===edit.id):undefined;
  switch(edit.type){
    case 'configure':{
      if(Object.values(edit.counts).some(n=>!Number.isInteger(n)||n<0||n>128))throw new Error('点位数量须为0至128的整数');
      const f=floor!;
      for(const kind of ['ap','camera','information'] as const)if(edit.counts[kind]<f.devices.filter(d=>d.kind===kind&&!d.businessId&&protectedPoint(d)).length)throw new Error('不能减少到锁定或手工点位数量以下');
      const unchanged=(['ap','camera','information'] as const).every(kind=>edit.counts[kind]===f.devices.filter(d=>d.kind===kind&&!d.businessId).length);
      f.deviceCounts=structuredClone(edit.counts);f.wifi=edit.wifi;f.apModelId=edit.modelId;
      f.devices.filter(d=>d.kind==='ap').forEach(d=>{d.wifi=edit.wifi;d.modelId=edit.modelId;});
      if(!unchanged){const result=planFloor(f,project.settings);project.floors[project.floors.indexOf(f)]=result.floor;const ids=new Set(result.floor.devices.map(d=>d.id));result.floor.cables=result.floor.cables.filter(c=>ids.has(c.fromId)&&ids.has(c.toId));}
      break;
    }
    case 'move-device':{
      if(!device)throw new Error('点位不存在');if(device.locked)throw new Error('点位已锁定，请先解锁');
      assertRoutesUnlocked(project,floor!,device.id);
      const moved={...device,positionM:{...edit.positionM}};assertPosition(floor!,moved);
      device.positionM=moved.positionM;device.source='manual';device.roomId=floor!.rooms.find(r=>containsPoint(device.positionM,r.polygon))?.id;
      if(device.kind==='camera')device.targetIds=floor!.targets.filter(t=>cameraSees(floor!,device,t)).map(t=>t.id);
      if(device.kind==='ap')device.serviceRoomIds=[];
      device.reason='手工移动；服务区域及关联线路须重新校验。';invalidate(floor!,device.id);break;
    }
    case 'lock-device':if(!device)throw new Error('点位不存在');device.locked=edit.locked;break;
    case 'unlock-device-routes':{
      if(!device)throw new Error('点位不存在');
      for(const c of floor!.cables)if(c.fromId===device.id||c.toId===device.id)c.locked=false;
      for(const b of project.backbones??[])if(b.fromId===device.id||b.toId===device.id)b.locked=false;
      break;
    }
    case 'aim-camera':{
      if(!device||device.kind!=='camera')throw new Error('请选择摄像头');
      const target=floor!.targets.find(t=>t.id===edit.targetId);if(!target)throw new Error('监控目标不存在');
      const aimed={...device,directionRad:Math.atan2(target.at.y-device.positionM.y,target.at.x-device.positionM.x)};
      if(!cameraSees(floor!,aimed,target))throw new Error('目标不可见、未确认或属于排除区域，请检查遮挡和安装位置。');
      device.directionRad=aimed.directionRad;device.targetIds=floor!.targets.filter(t=>cameraSees(floor!,device,t)).map(t=>t.id);device.source='manual';device.reason='手工确认监控目标；保留安装坐标，现场仍需复核镜头与遮挡。';break;
    }
    case 'delete-device':{
      if(!device)throw new Error('点位不存在');if(device.locked)throw new Error('点位已锁定，请先解锁');
      assertRoutesUnlocked(project,floor!,device.id);
      if(device.businessId)throw new Error('请从可选设备中移除对应组件');
      floor!.devices=floor!.devices.filter(d=>d.id!==device.id);floor!.cables=floor!.cables.filter(c=>c.fromId!==device.id&&c.toId!==device.id);preserveExplicitCount(floor!);break;
    }
    case 'add-device':{
      if(project.floors.some(f=>f.devices.some(d=>d.id===edit.device.id)))throw new Error('设备标识已存在');
      const added={...structuredClone(edit.device),floorId:floor!.id,source:'manual' as const};assertPosition(floor!,added);floor!.devices.push(added);preserveExplicitCount(floor!);break;
    }
    case 'settings':project.settings=structuredClone(edit.settings);for(const f of project.floors)if(!f.wifi)f.devices.filter(d=>d.kind==='ap').forEach(d=>d.wifi=edit.settings.wifi);break;
    case 'floor':{
      const index=project.floors.findIndex(f=>f.id===edit.floor.id);if(index<0)project.floors.push(structuredClone(edit.floor));else project.floors[index]=structuredClone(edit.floor);break;
    }
    case 'join-business':{
      const b=structuredClone(edit.selection);if(project.business.some(v=>v.id===b.id))throw new Error('组件已加入，请先移除原项再修改');
      const f=project.floors.find(v=>v.id===b.floorId);if(!f)throw new Error('组件楼层不存在');
      project.business.push(b);
      if(b.network==='wired'){
        const room=f.rooms.find(r=>r.id===b.roomId)??f.rooms.find(r=>['public','cashier','office','entrance'].includes(r.use));if(!room)throw new Error('请为联网终端选择安装房间');
        for(let i=0;i<b.quantity;i++)f.devices.push({id:`${b.id}-port-${i+1}`,floorId:f.id,kind:'information',label:`可选终端 ${i+1}`,positionM:roomCentre(room),roomId:room.id,locked:false,source:'automatic',businessId:b.id,reason:'已主动加入的经营设备有线联网端口'});
      }
      break;
    }
    case 'remove-business':{
      project.business=project.business.filter(b=>b.id!==edit.id);
      for(const f of project.floors){const removed=new Set(f.devices.filter(d=>d.businessId===edit.id).map(d=>d.id));f.devices=f.devices.filter(d=>!removed.has(d.id));f.cables=f.cables.filter(c=>!removed.has(c.fromId)&&!removed.has(c.toId));}break;
    }
    case 'route':{
      const f=floor!,c=structuredClone(edit.cable),old=f.cables.find(v=>v.id===c.id);if(old?.locked&&(c.locked||JSON.stringify({...old,locked:false})!==JSON.stringify(c)))throw new Error('线路已锁定，请先解锁');
      if(c.status!=='disconnected'){
        const a=f.devices.find(d=>d.id===c.fromId),b=f.devices.find(d=>d.id===c.toId);
        if(!a||!b||c.pointsM.length<2||distance(c.pointsM[0],a.positionM)>1e-6||distance(c.pointsM[c.pointsM.length-1],b.positionM)>1e-6)throw new Error('路线必须保持真实设备端点');
      }
      f.cables=old?f.cables.map(v=>v.id===c.id?c:v):[...f.cables,c];break;
    }
    case 'price':if(edit.cents===null)delete project.priceOverrides[edit.modelId];else project.priceOverrides[edit.modelId]=edit.cents;break;
    case 'backbone':{
      const link=structuredClone(edit.link),old=project.backbones?.find(b=>b.id===link.id);
      if(old?.locked&&(link.locked||JSON.stringify({...old,locked:false})!==JSON.stringify(link)))throw new Error('主干已锁定，请先解锁');
      const from=project.floors.find(f=>f.id===link.fromFloorId),to=project.floors.find(f=>f.id===link.toFloorId),a=from?.devices.find(d=>d.id===link.fromId),b=to?.devices.find(d=>d.id===link.toId),first=link.pointsM[0],last=link.pointsM[link.pointsM.length-1];
      if(link.status!=='disconnected'&&(!a||!b||!from||!to||!first||!last||distance(first,a.positionM)>1e-6||distance(last,b.positionM)>1e-6||Math.abs(first.z-from.elevationM)>1e-6||Math.abs(last.z-to.elevationM)>1e-6))throw new Error('主干必须保持实际机柜端点和楼层高度');
      project.backbones=old?project.backbones!.map(b=>b.id===link.id?link:b):[...(project.backbones??[]),link];break;
    }
  }
  project.updatedAt=new Date().toISOString();
  const checked=validateProject(project);if(!checked.project)throw new Error(checked.issues.map(i=>i.message).join('；'));
  return checked.project;
}
