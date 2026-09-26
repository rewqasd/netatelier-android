import {execFileSync} from 'node:child_process';
import {_android} from '@playwright/test';
import {createServer} from 'vite';
const serial=process.env.ANDROID_SERIAL;
if(!serial)throw new Error('Set ANDROID_SERIAL explicitly');
const adb=(...args)=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:20000}).trim();
const pkg='io.github.rewqasd.netatelier';
const vite=await createServer({server:{middlewareMode:true}});
let project;
try{const {quoteProject}=await vite.ssrLoadModule('/tests/helpers/catalog.ts');project=quoteProject(1);project.id='p-native-storage-smoke';project.floors[0].devices[1].locked=true;project.priceOverrides={ap5:12345};}finally{await vite.close()}
const check=(ok,message)=>{if(!ok)throw new Error(message)};
let device;
async function connect(){adb('shell','am','start','-W','-n',`${pkg}/.MainActivity`);device=(await _android.devices()).find(d=>d.serial()===serial);if(!device)throw new Error('No selected emulator');const page=await(await device.webView({pkg})).page();await page.waitForFunction(()=>!!window.Capacitor?.Plugins);return page}
async function disconnect(){if(device){await device.close();device=undefined}adb('shell','am','force-stop','com.microsoft.playwright.androiddriver')}
try{
  let page=await connect();
  const saved=await page.evaluate(async project=>{const store=window.Capacitor.Plugins.ProjectStore;await store.delete({id:project.id,confirmed:true});return store.save({project:JSON.stringify(project),expectedRevision:0})},project);
  check(JSON.parse(saved.project).revision===1,'Save must acknowledge revision 1');await disconnect();
  adb('shell','am','force-stop',pkg);page=await connect();
  const loaded=JSON.parse((await page.evaluate(id=>window.Capacitor.Plugins.ProjectStore.load({id}),project.id)).project);
  check(loaded.floors[0].devices[1].positionM.x===5&&loaded.floors[0].devices[1].locked,'Position/lock lost across process restart');check(loaded.priceOverrides.ap5===12345,'Price override lost');
  const conflict=await page.evaluate(async project=>{try{await window.Capacitor.Plugins.ProjectStore.save({project:JSON.stringify(project),expectedRevision:0});return false}catch{return true}},project);check(conflict,'Stale writer was not rejected');
  console.log('Native bridge save -> actual force-stop -> restart/load, stable coordinates/locks/prices and revision conflict verified. Not a full project-screen UI test.');
}finally{await disconnect()}
