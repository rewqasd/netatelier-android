import type {Project,ProjectEdit} from '../domain/model';
import {applyEdit} from './edits';
import {validateProject} from '../domain/schema';
export class ProjectHistory {
  private value:Project;
  private past:Project[]=[];
  private future:Project[]=[];
  constructor(value:Project){this.value=structuredClone(value);}
  get current():Project{return structuredClone(this.value);}
  get canUndo():boolean{return this.past.length>0;}
  get canRedo():boolean{return this.future.length>0;}
  transact(edits:ProjectEdit[],transform?:(project:Project)=>Project):void{
    let next=edits.reduce(applyEdit,structuredClone(this.value));if(transform)next=transform(next);
    const checked=validateProject(next);if(!checked.project)throw new Error(checked.issues.map(i=>i.message).join('；'));
    this.past.push(this.value);if(this.past.length>50)this.past.shift();this.value=checked.project;this.future=[];
  }
  apply(edit:ProjectEdit):void{this.transact([edit]);}
  undo():void{const previous=this.past.pop();if(previous){this.future.push(this.value);this.value=previous;}}
  redo():void{const next=this.future.pop();if(next){this.past.push(this.value);this.value=next;}}
}
