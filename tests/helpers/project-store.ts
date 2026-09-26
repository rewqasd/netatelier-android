import type {ProjectStoreBridge} from '../../src/project/repository';
/** Test transport models native CAS; actual filesystem crash/recovery is tested on Android. */
export class StoreTransport implements ProjectStoreBridge {
  readonly files=new Map<string,string>();
  async list(){return {projects:[...this.files.values()].map(v=>JSON.parse(v))}}
  async load({id}:{id:string}){const project=this.files.get(id);if(!project)throw new Error('NOT_FOUND');return {project}}
  async save({project,expectedRevision}:{project:string;expectedRevision:number}){
    const value=JSON.parse(project),old=this.files.get(value.id),revision=old?JSON.parse(old).revision:0;
    if(expectedRevision!==revision)throw new Error('REVISION_CONFLICT');value.revision=revision+1;const saved=JSON.stringify(value);this.files.set(value.id,saved);return {project:saved};
  }
  async delete({id,confirmed}:{id:string;confirmed:boolean}){if(!confirmed)throw new Error('CONFIRM_DELETE');this.files.delete(id)}
}
