import {registerPlugin} from '@capacitor/core';
import type {ProjectStoreBridge} from './repository';
import {parseProject} from './repository';
import {validateBundleManifest} from './bundle';
import {deriveProject} from '../quote/derive';
import {catalog} from '../catalog/models';
export interface NativeStoreBridge extends ProjectStoreBridge {
  pickBundle(options:{requestId:string}):Promise<{cancelled:true}|{cancelled:false;token:string;project:string;manifest:string}>;
  commitBundle(options:{token:string}):Promise<{project:string}>;
  discardBundle(options:{token:string}):Promise<void>;
  exportBundle(options:{id:string;requestId:string}):Promise<{cancelled:boolean;uri?:string}>;
  cancel(options:{requestId:string}):Promise<void>;
}
export const NativeProjectStore=registerPlugin<NativeStoreBridge>('ProjectStore');
/** Stage native bytes first; full schema/reference validation must precede publication. */
export async function importProjectBundle(bridge:NativeStoreBridge=NativeProjectStore,requestId=crypto.randomUUID()){
  const staged=await bridge.pickBundle({requestId});if(staged.cancelled)return null;
  try{const project=parseProject(staged.project);validateBundleManifest(JSON.parse(staged.manifest),project);deriveProject(project,catalog);const saved=parseProject((await bridge.commitBundle({token:staged.token})).project);if(saved.id!==project.id||saved.revision!==1)throw new Error('导入响应标识/版本不一致');return saved}
  finally{await bridge.discardBundle({token:staged.token})}
}
