import type {Project} from '../domain/model';
import type {ProjectRepository} from './repository';
export class SaveQueue {
  private tail:Promise<void>=Promise.resolve();
  private revisions=new Map<string,number>();
  constructor(readonly repository:ProjectRepository){}
  save(project:Project):Promise<Project>{
    const snapshot=structuredClone(project);
    const result=this.tail.then(async()=>{const expected=Math.max(snapshot.revision,this.revisions.get(snapshot.id)??0),saved=await this.repository.save(snapshot,expected);this.revisions.set(saved.id,saved.revision);return saved});
    this.tail=result.then(()=>undefined,()=>undefined);return result;
  }
}
