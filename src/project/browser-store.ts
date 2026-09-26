import type {ProjectStoreBridge} from './repository';
import {parseProject} from './repository';
/** Development browser storage only; Android always uses its atomic native store. */
export class BrowserProjectStore implements ProjectStoreBridge{
 constructor(private storage:Storage){}
 private key(id:string){if(!/^[a-zA-Z0-9:_-]{1,120}$/.test(id))throw new Error('无效项目标识');return `netatelier:project:${id}`;}
 async list(){const projects=[];for(let i=0;i<this.storage.length;i++){const key=this.storage.key(i)!;if(!key.startsWith('netatelier:project:'))continue;try{const p=parseProject(this.storage.getItem(key)!);projects.push({id:p.id,name:p.name,revision:p.revision,updatedAt:p.updatedAt});}catch{projects.push({id:key.slice(19),name:'损坏的本地项目',revision:0,updatedAt:'',corrupt:true});}}return {projects};}
 async load({id}:{id:string}){const project=this.storage.getItem(this.key(id));if(!project)throw new Error('项目不存在');return {project};}
 async save({project,expectedRevision}:{project:string;expectedRevision:number}){const p=parseProject(project),old=this.storage.getItem(this.key(p.id)),revision=old?parseProject(old).revision:0;if(revision!==expectedRevision)throw new Error('保存版本冲突，请重新打开项目');p.revision=revision+1;const text=JSON.stringify(p);this.storage.setItem(this.key(p.id),text);return {project:text};}
 async delete({id,confirmed}:{id:string;confirmed:boolean}){if(!confirmed)throw new Error('请确认删除');this.storage.removeItem(this.key(id));}
}
