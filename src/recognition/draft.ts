import type {DraftEdits,RecognitionDraft} from '../domain/model';
export class LatestJob {
  private controller?:AbortController;
  get isRunning():boolean{return !!this.controller&&!this.controller.signal.aborted;}
  async run<T>(work:(signal:AbortSignal)=>Promise<T>):Promise<T|undefined>{
    this.cancel();const controller=new AbortController();this.controller=controller;
    try{const result=await work(controller.signal);return !controller.signal.aborted&&this.controller===controller?result:undefined;}
    catch(error){if(!controller.signal.aborted)throw error;}
    finally{if(this.controller===controller)this.controller=undefined;}
  }
  cancel():void{this.controller?.abort();this.controller=undefined;}
}
export function createDraftEdits(draft:RecognitionDraft):DraftEdits{return structuredClone({boundaryPx:draft.boundaryPx,roomsPx:draft.roomsPx,wallsPx:draft.wallsPx,openingsPx:draft.openingsPx,targetsPx:[]});}
