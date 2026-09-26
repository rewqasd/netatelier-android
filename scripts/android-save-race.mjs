import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {_android,expect} from '@playwright/test';
import {createServer} from 'vite';
const serial=process.env.ANDROID_SERIAL;
if(!serial?.startsWith('emulator-'))throw new Error('Explicit disposable emulator required');
const pkg='io.github.rewqasd.netatelier',adb=(...a)=>execFileSync('adb',['-s',serial,...a],{encoding:'utf8',timeout:30000}).trim();
const vite=await createServer({server:{middlewareMode:true}});let project;
try{const {quoteProject}=await vite.ssrLoadModule('/tests/helpers/catalog.ts');project=quoteProject(1);project.id=`p-save-race-${Date.now()}`;}finally{await vite.close();}
let device;
async function connect(){adb('shell','am','start','-W','-n',`${pkg}/.MainActivity`);device=(await _android.devices()).find(d=>d.serial()===serial);if(!device)throw new Error('Emulator missing');const page=await(await device.webView({pkg})).page();await page.waitForFunction(()=>!!window.Capacitor?.Plugins?.ProjectStore);return page;}
async function disconnect(){if(device){await device.close();device=undefined;}adb('shell','am','force-stop','com.microsoft.playwright.androiddriver');}
const results=[];
try{
 let page=await connect();let old=JSON.parse((await page.evaluate(p=>window.Capacitor.Plugins.ProjectStore.save({project:JSON.stringify(p),expectedRevision:0}),project)).project);
 for(const delayMs of [0,5,25]){
  const next={...old,name:`保存中断检查-${delayMs}`,priceOverrides:{...old.priceOverrides,ap5:12300+delayMs}};
  const acknowledgedAtDispatch=await page.evaluate(p=>{window.saveRaceAck=false;window.Capacitor.Plugins.ProjectStore.save({project:JSON.stringify(p),expectedRevision:p.revision}).then(()=>{window.saveRaceAck=true;}).catch(()=>{});return window.saveRaceAck;},next);
  if(delayMs)await new Promise(r=>setTimeout(r,delayMs));
  adb('shell','am','force-stop',pkg);await disconnect();page=await connect();
  const restored=JSON.parse((await page.evaluate(id=>window.Capacitor.Plugins.ProjectStore.load({id}),old.id)).project);
  const expected=restored.revision===old.revision?old:{...next,revision:old.revision+1};expect(restored).toEqual(expected);
  results.push({delayMs,acknowledgedAtDispatch,previousRevision:old.revision,restoredRevision:restored.revision,completeValidVersion:true});old=restored;
 }
 await mkdir('artifacts/acceptance',{recursive:true});await writeFile('artifacts/acceptance/save-race.json',JSON.stringify({serial,results,limitation:'Force-stop races after request dispatch; scheduler timing inside fsync is not observable. Native fault-injection tests separately exercise incomplete atomic writes.'},null,2));
 console.log('Three actual save-dispatch/process-death races restored a complete old or new project; no claim that kill occurred inside fsync.',results);
}finally{await disconnect();}
