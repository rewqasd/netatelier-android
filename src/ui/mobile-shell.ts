import {registerPlugin} from '@capacitor/core';
export const MobileShell=registerPlugin<{configure(options:{immersive:boolean;backEnabled:boolean}):Promise<void>;state():Promise<{immersive:boolean;statusVisible:boolean;navigationVisible:boolean}>;getSelection():Promise<{id?:string|null}>;setSelection(options:{id:string|null}):Promise<void>}>('MobileShell');
