import { z } from 'zod'
import type { Issue, Project } from './model'
import {assertEngineeringBounded} from './workload'

const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{0,119}$/)
const label = z.string().trim().min(1).max(160)
const coordinate = z.number().finite().min(-1e6).max(1e6)
const point = z.strictObject({x:coordinate,y:coordinate})
const polygon = z.array(point).min(3).max(1024)
const count = z.number().int().min(0).max(100_000)
const money = z.number().int().min(0).max(1_000_000_000)
const radio = z.union([z.literal(5),z.literal(6)])
const room = z.strictObject({id,name:label,use:z.enum(['public','entrance','cashier','corridor','kitchen','storage','equipment','office','meeting','guest','toilet','changing','shower']),polygon,confirmed:z.boolean(),needsWifi:z.boolean().optional()})
const wall = z.strictObject({id,from:point,to:point,material:z.enum(['unknown','brick','concrete','glass','partition']),confirmed:z.boolean()})
const opening = z.strictObject({id,at:point,roomIds:z.array(id).min(1).max(2),widthM:z.number().positive().max(50),entrance:z.boolean(),confirmed:z.boolean()})
const target = z.strictObject({id,roomId:id,at:point,kind:z.enum(['entrance','cashier','circulation','public']),weight:z.number().positive().max(100),confirmed:z.boolean()})
const device = z.strictObject({
  id,floorId:id,kind:z.enum(['ap','camera','information','wan','cabinet']),label,positionM:point,locked:z.boolean(),source:z.enum(['automatic','manual']),roomId:id.optional(),
  wifi:radio.optional(),mount:z.enum(['ceiling','panel']).optional(),modelId:id.optional(),targetIds:z.array(id).max(128).optional(),directionRad:z.number().finite().optional(),serviceRoomIds:z.array(id).max(1024).optional(),businessId:id.optional(),reason:z.string().max(1000).optional(),
}).superRefine((d,ctx)=>{
  if(d.kind!=='ap' && (d.wifi!==undefined || d.mount!==undefined)) ctx.addIssue({code:'custom',message:'只有AP可设置无线标准和安装形态'})
  if(d.kind!=='camera' && (d.targetIds!==undefined || d.directionRad!==undefined)) ctx.addIssue({code:'custom',message:'只有摄像头可设置监控目标和视向'})
})
const cable = z.strictObject({id,floorId:id,fromId:id,toId:id,pointsM:z.array(point).max(2048),status:z.enum(['confirmed','provisional','disconnected']),locked:z.boolean()})
const backbone = z.strictObject({id,fromFloorId:id,toFloorId:id,fromId:id,toId:id,pointsM:z.array(z.strictObject({x:coordinate,y:coordinate,z:coordinate})).max(2048),medium:z.enum(['fiber','copper']),status:z.enum(['confirmed','provisional','disconnected']),locked:z.boolean()})
const calibration = z.strictObject({kind:z.enum(['known-length','approximate-area','demo','unset']),metersPerPixel:z.number().positive().max(1000).nullable(),originPx:point,angleRad:z.number().finite()}).superRefine((c,ctx)=>{
  if((c.kind==='unset')!==(c.metersPerPixel===null)) ctx.addIssue({code:'custom',message:'标尺状态与米/像素比例不一致'})
})
const assetId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/)
const document = z.strictObject({assetId,sourceAssetId:assetId.optional(),rotationDeg:z.union([z.literal(0),z.literal(90),z.literal(180),z.literal(270)]).optional(),mime:z.enum(['image/png','image/jpeg','application/pdf']),widthPx:z.number().int().positive().max(24000),heightPx:z.number().int().positive().max(24000),page:z.number().int().min(0).max(59)})
const floor = z.strictObject({
  id,name:label,elevationM:z.number().finite().min(-200).max(1000),boundary:polygon,calibration,document:document.optional(),
  demand:z.strictObject({employees:count,visitors:count,concurrentUsers:count,terminals:count,wiredPoints:count.max(128)}),
  rooms:z.array(room).max(1024),walls:z.array(wall).max(4096),openings:z.array(opening).max(2048),targets:z.array(target).max(512),devices:z.array(device).max(1024),cables:z.array(cable).max(2048),
  deviceCounts:z.strictObject({ap:count.max(128),camera:count.max(128),information:count.max(128)}).optional(),wifi:radio.optional(),apModelId:id.optional(),trayPaths:z.array(z.array(point).min(2).max(2048)).max(128).optional(),notes:z.string().max(2000).optional(),
})
const settings = z.strictObject({
  wifi:radio,bandwidthMbps:z.number().int().positive().max(100000),monitoring:z.boolean(),retentionDays:z.number().int().positive().max(365),bitrateMbps:z.number().positive().max(100),
  cableReserve:z.number().min(0).max(1),endpointAllowanceM:z.number().min(0).max(20),dropM:z.number().min(0).max(50),portReserve:z.number().min(0).max(1),poeReserve:z.number().min(0).max(1),
  cablePurchase:z.enum(['box','metre']),laborMode:z.enum(['itemized','fixed']),fixedLaborCents:money,
})
const projectSchema = z.strictObject({
  schemaVersion:z.literal(1),id,name:label,revision:z.number().int().min(0),createdAt:z.iso.datetime({offset:true}),updatedAt:z.iso.datetime({offset:true}),scene:z.enum(['restaurant','office','gym','hotel','retail']).optional(),
  settings,floors:z.array(floor).min(1).max(20),business:z.array(z.strictObject({id,modelId:id,quantity:z.number().int().positive().max(128),purchase:z.boolean(),network:z.enum(['wired','wifi','none']),floorId:id,roomId:id.optional()})).max(128),
  priceOverrides:z.record(id,money),
  backbones:z.array(backbone).max(128).optional(),
})

/** Reject invalid persisted/imported data; never silently drop fields or mutate callers. */
export function validateProject(value: unknown): {project?: Project; issues: Issue[]} {
  const parsed = projectSchema.safeParse(value)
  if(!parsed.success) return {issues:parsed.error.issues.map(e=>({code:'INVALID_PROJECT',severity:'blocking',message:`${e.path.join('.') || '项目'}：${e.message}`,entityIds:[]}))}
  const project:Project = parsed.data
  try{assertEngineeringBounded(project)}catch(e){return {issues:[{code:'ENGINEERING_LIMIT',severity:'blocking',message:String(e),entityIds:[]}]}}
  const issues:Issue[]=[]
  const invalid=(message:string,entityIds:string[])=>issues.push({code:'INVALID_REFERENCE',severity:'blocking',message,entityIds})
  const seen=new Set<string>()
  const unique=(entityId:string)=>{if(seen.has(entityId)) invalid('存在重复标识',[entityId]);seen.add(entityId)}
  unique(project.id)
  for(const f of project.floors) {
    unique(f.id)
    for(const entity of [...f.rooms,...f.walls,...f.openings,...f.targets,...f.devices,...f.cables]) unique(entity.id)
    const roomIds=new Set(f.rooms.map(r=>r.id)),deviceIds=new Set(f.devices.map(d=>d.id)),targetIds=new Set(f.targets.map(t=>t.id))
    for(const o of f.openings) if(o.roomIds.some(r=>!roomIds.has(r))) invalid('门洞引用不属于当前楼层的房间',[o.id])
    for(const t of f.targets) if(!roomIds.has(t.roomId)) invalid('监控目标引用不存在的房间',[t.id])
    for(const d of f.devices) {
      if(d.floorId!==f.id || (d.roomId && !roomIds.has(d.roomId))) invalid('设备楼层或房间引用无效',[d.id])
      if(d.targetIds?.some(t=>!targetIds.has(t)) || d.serviceRoomIds?.some(r=>!roomIds.has(r))) invalid('设备服务目标引用无效',[d.id])
      if(d.businessId && !project.business.some(b=>b.id===d.businessId)) invalid('设备对应的经营设备不存在',[d.id])
    }
    for(const c of f.cables) {
      if(c.floorId!==f.id || !deviceIds.has(c.fromId) || !deviceIds.has(c.toId) || c.fromId===c.toId) invalid('线缆端点或楼层引用无效',[c.id])
      if(c.status!=='disconnected' && c.pointsM.length<2) invalid('有效线缆至少需要两个路由点',[c.id])
    }
  }
  for(const b of project.business) {
    unique(b.id)
    const f=project.floors.find(f=>f.id===b.floorId)
    if(!f || (b.roomId && !f.rooms.some(r=>r.id===b.roomId))) invalid('经营设备楼层或房间引用无效',[b.id])
  }
  for(const b of project.backbones??[]){
    unique(b.id);
    const from=project.floors.find(f=>f.id===b.fromFloorId),to=project.floors.find(f=>f.id===b.toFloorId);
    if(!from||!to||from.id===to.id||!from.devices.some(d=>d.id===b.fromId&&d.kind==='cabinet')||!to.devices.some(d=>d.id===b.toId&&d.kind==='cabinet'))invalid('楼层主干必须连接不同楼层的有效机柜',[b.id]);
    if(b.status!=='disconnected'&&b.pointsM.length<2)invalid('有效主干至少需要两个三维路径点',[b.id]);
  }
  return issues.length ? {issues} : {project,issues}
}
