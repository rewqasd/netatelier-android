/** Persisted coordinates are metres; imported recognition data is explicitly pixels. */
export interface Vec2 { x: number; y: number }
export type SceneId = 'restaurant' | 'office' | 'gym' | 'hotel' | 'retail'
export type RoomUse = 'public' | 'entrance' | 'cashier' | 'corridor' | 'kitchen' | 'storage' | 'equipment' | 'office' | 'meeting' | 'guest' | 'toilet' | 'changing' | 'shower'
export interface Issue { code: string; severity: 'warning' | 'blocking'; message: string; entityIds: string[] }
export interface Calibration { kind: 'known-length' | 'approximate-area' | 'demo' | 'unset'; metersPerPixel: number | null; originPx: Vec2; angleRad: number }
export interface DocumentPage { assetId: string; sourceAssetId?: string; mime: 'image/png' | 'image/jpeg' | 'application/pdf'; widthPx: number; heightPx: number; page: number; rotationDeg?: 0|90|180|270 }
export interface Room { id: string; name: string; use: RoomUse; polygon: Vec2[]; confirmed: boolean; needsWifi?: boolean }
export interface Wall { id: string; from: Vec2; to: Vec2; material: 'unknown' | 'brick' | 'concrete' | 'glass' | 'partition'; confirmed: boolean }
export interface Opening { id: string; at: Vec2; roomIds: string[]; widthM: number; entrance: boolean; confirmed: boolean }
export interface Target { id: string; roomId: string; at: Vec2; kind: 'entrance' | 'cashier' | 'circulation' | 'public'; weight: number; confirmed: boolean }
export type DeviceKind = 'ap' | 'camera' | 'information' | 'wan' | 'cabinet'
export interface Device {
  id: string; floorId: string; kind: DeviceKind; label: string; positionM: Vec2;
  locked: boolean; source: 'automatic' | 'manual'; roomId?: string;
  wifi?: 5 | 6; mount?: 'ceiling' | 'panel'; modelId?: string;
  targetIds?: string[]; directionRad?: number; serviceRoomIds?: string[];
  businessId?: string; reason?: string;
}
export interface Cable { id: string; floorId: string; fromId: string; toId: string; pointsM: Vec2[]; status: 'confirmed' | 'provisional' | 'disconnected'; locked: boolean }
export interface Vec3 extends Vec2 {z:number}
export interface BackboneLink {id:string;fromFloorId:string;toFloorId:string;fromId:string;toId:string;pointsM:Vec3[];medium:'fiber'|'copper';status:Cable['status'];locked:boolean}
export interface FloorDemand { employees: number; visitors: number; concurrentUsers: number; terminals: number; wiredPoints: number }
export interface DeviceCounts { ap: number; camera: number; information: number }
export interface Floor {
  id: string; name: string; elevationM: number; boundary: Vec2[]; calibration: Calibration;
  document?: DocumentPage; demand: FloorDemand; rooms: Room[]; walls: Wall[];
  openings: Opening[]; targets: Target[]; devices: Device[]; cables: Cable[];
  deviceCounts?: DeviceCounts; wifi?: 5 | 6; apModelId?: string;
  trayPaths?: Vec2[][]; notes?: string;
}
export interface Settings {
  wifi: 5 | 6; bandwidthMbps: number; monitoring: boolean; retentionDays: number;
  bitrateMbps: number; cableReserve: number; endpointAllowanceM: number; dropM: number;
  portReserve: number; poeReserve: number; cablePurchase: 'box' | 'metre';
  laborMode: 'itemized' | 'fixed'; fixedLaborCents: number;
}
export interface BusinessSelection { id: string; modelId: string; quantity: number; purchase: boolean; network: 'wired' | 'wifi' | 'none'; floorId: string; roomId?: string }
export type PriceOverride = Record<string, number>
export interface Project {
  schemaVersion: 1; id: string; name: string; revision: number; createdAt: string; updatedAt: string;
  scene?: SceneId; settings: Settings; floors: Floor[]; business: BusinessSelection[]; priceOverrides: PriceOverride;
  backbones?:BackboneLink[];
}
export interface OcrText { text: string; boxPx: {x:number;y:number;width:number;height:number}; source: 'ocr' }
export type PixelRoom = Room & {provenance:'geometry'|'manual'}
export type PixelWall = Wall & {provenance:'geometry'|'manual'}
export type PixelOpening = Omit<Opening,'widthM'> & {widthPx:number;provenance:'candidate'|'manual'}
export interface RecognitionDraft { document: DocumentPage; text: OcrText[]; boundaryPx: Vec2[]; wallsPx: PixelWall[]; roomsPx: PixelRoom[]; openingsPx: PixelOpening[]; issues: Issue[] }
export interface DraftEdits { roomsPx: PixelRoom[]; wallsPx: PixelWall[]; openingsPx: PixelOpening[]; cabinetPx?: Vec2; wanPx?: Vec2; targetsPx: Target[]; boundaryPx: Vec2[] }
export interface SharedSegment { id: string; floorId: string; from: Vec2; to: Vec2; cableIds: string[]; kinds: DeviceKind[] }
export type CatalogCategory = 'gateway' | 'ac' | 'ap' | 'switch' | 'camera' | 'nvr' | 'disk' | 'cable' | 'tray' | 'material' | 'labor' | 'optional'
export interface CatalogItem { id: string; category: CatalogCategory; brand: string; model: string; name: string; unit: string; unitCents: number; priceKind: 'page' | 'estimate'; sourceUrl?: string; checkedAt?: string; conditions: string; specs: Record<string,number|string|boolean|null>; specificationUrl?: string; priceReferences?:{url:string;observedCents:number;kind:'retail-page'|'procurement-cap';checkedAt:string;conditions:string}[] }
export type Catalog = CatalogItem[]
export interface BomLine { id: string; modelId: string; floorId?: string; name: string; quantity: number; unit: string; unitCents: number; subtotalCents: number; section: 'network' | 'monitoring' | 'materials' | 'labor' | 'optional'; basis: string; priceKind: 'page' | 'estimate' | 'user' }
export interface SwitchAllocation { id: string; floorId: string; modelId: string; endpointIds: string[]; uplinkPorts: number; loadW: number; portAssignments?: {endpointId:string;port:number}[] }
export interface Quantities { netCableM: number; cableWithReserveM: number; trayM: number; backboneM: number; independentLinks: number; issues: Issue[] }
export interface DerivedProject { quantities: Quantities; switches: SwitchAllocation[]; bom: BomLine[]; totalCents: number; totals: Record<BomLine['section'],number>; issues: Issue[]; complete: boolean; topology:TopologyGraph }
export interface TopologyGraph { nodes: {id:string;label:string;floorId?:string;deviceId?:string;kind:string}[]; edges: {id:string;from:string;to:string;label:string}[] }
export type ProjectEdit =
  | {type:'configure';floorId:string;counts:DeviceCounts;wifi:5|6;modelId?:string}
  | {type:'move-device';floorId:string;id:string;positionM:Vec2}
  | {type:'lock-device';floorId:string;id:string;locked:boolean}
  | {type:'unlock-device-routes';floorId:string;id:string}
  | {type:'aim-camera';floorId:string;id:string;targetId:string}
  | {type:'delete-device';floorId:string;id:string}
  | {type:'add-device';floorId:string;device:Device}
  | {type:'settings';settings:Settings}
  | {type:'floor';floor:Floor}
  | {type:'join-business';selection:BusinessSelection}
  | {type:'remove-business';id:string}
  | {type:'route';floorId:string;cable:Cable}
  | {type:'price';modelId:string;cents:number|null}
  | {type:'backbone';link:BackboneLink}
export type ExportFormat = 'svg' | 'png' | 'csv' | 'pdf'
export interface ExportArtifact { filename:string;mime:string;content:string|Uint8Array;reportHtml?:string }
