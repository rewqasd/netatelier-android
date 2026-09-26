import type {Project} from '../domain/model';
import {validateProject} from '../domain/schema';
export interface ProjectStoreBridge {
  list():Promise<{projects:{id:string;name:string;revision:number;updatedAt:string;recovered?:boolean;corrupt?:boolean}[]}>;
  load(options:{id:string}):Promise<{project:string;recovered?:boolean}>;
  save(options:{project:string;expectedRevision:number}):Promise<{project:string}>;
  delete(options:{id:string;confirmed:boolean}):Promise<void>;
}
export class ProjectRepository {
  recovered=false;
  constructor(readonly bridge:ProjectStoreBridge){}
  async list(){return (await this.bridge.list()).projects}
  async load(id:string):Promise<Project>{const result=await this.bridge.load({id}),p=parseProject(result.project);if(p.id!==id)throw new Error('保存文件标识不一致');this.recovered=!!result.recovered;return p}
  async save(project:Project,expectedRevision=project.revision):Promise<Project>{
    const checked=validateProject(project);if(!checked.project)throw new Error(checked.issues.map(i=>i.message).join('；'));
    if(!Number.isInteger(expectedRevision)||expectedRevision<0)throw new Error('无效保存版本');
    const result=await this.bridge.save({project:JSON.stringify(checked.project),expectedRevision}),saved=parseProject(result.project);
    if(saved.id!==project.id||saved.revision!==expectedRevision+1)throw new Error('保存响应版本不一致');return saved;
  }
  async delete(id:string,confirmed:boolean):Promise<void>{if(!confirmed)throw new Error('请确认删除项目');await this.bridge.delete({id,confirmed:true})}
}
export function parseProject(text:string):Project{
  if(new TextEncoder().encode(text).byteLength>2*1024*1024)throw new Error('项目数据超过2MiB上限');
  const result=validateProject(JSON.parse(text));if(!result.project)throw new Error(result.issues.map(i=>i.message).join('；'));return result.project;
}
