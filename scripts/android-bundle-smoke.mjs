import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {basename} from 'node:path';
import {createHash} from 'node:crypto';
import {_android,expect} from '@playwright/test';
const serial=process.env.ANDROID_SERIAL,bundle=process.argv[2];
if(!serial||!bundle)throw new Error('Set ANDROID_SERIAL and provide an existing exported bundle');
const pkg='io.github.rewqasd.netatelier',docs='com.android.documentsui';
const adb=(...a)=>execFileSync('adb',['-s',serial,...a],{encoding:'utf8',timeout:20000}).trim();
const expected=JSON.parse(execFileSync('unzip',['-p',bundle,'project.json'],{encoding:'utf8'}));
const name=`bundle-restore-${Date.now()}-${basename(bundle)}`;
adb('push',bundle,`/sdcard/Download/${name}`);adb('shell','touch',`/sdcard/Download/${name}`);adb('shell','am','start','-W','-n',`${pkg}/.MainActivity`);
const device=(await _android.devices()).find(d=>d.serial()===serial);if(!device)throw new Error('No selected emulator');
try{
 const first=await(await device.webView({pkg})).page();let page;
 await expect.poll(()=>{page=first.context().pages().find(p=>p.url().startsWith('https://localhost'));return !!page;},{timeout:30000}).toBe(true);
 await page.waitForFunction(()=>!!window.Capacitor?.Plugins?.MobileShell);await page.evaluate(()=>window.Capacitor.Plugins.MobileShell.setSelection({id:null}));await page.reload();
 await page.getByRole('button',{name:'导入项目备份',exact:true}).click();console.log('Picker opened');
 // Navigate the system picker; do not call directly into the import bridge.
 let info;const present=async selector=>{await expect.poll(async()=>{try{info=await device.info(selector);return info.enabled}catch{return false}},{timeout:30000}).toBe(true);return info;};
 const tap=async selector=>{const i=await present(selector);adb('shell','input','tap',String(Math.round(i.bounds.x+i.bounds.width/2)),String(Math.round(i.bounds.y+i.bounds.height/2)));};
 await tap({pkg:docs,desc:'Show roots'});
 await tap({pkg:docs,res:'android:id/title',text:'Downloads'});
 await tap({pkg:docs,text:name});console.log('Bundle selected');
 await expect(page.getByLabel('保存状态')).toContainText('已保存',{timeout:60000}).catch(async error=>{console.log(await page.locator('body').innerText());throw error;});
 const restored=JSON.parse(await page.evaluate(async()=>{const {id}=await window.Capacitor.Plugins.MobileShell.getSelection();return (await window.Capacitor.Plugins.ProjectStore.load({id})).project;}));
 expect(restored.id).not.toBe(expected.id);
 // A portable import assigns a new project id/revision/time and new private
 // asset ids. Engineering state must survive; compare asset content separately
 // in the imported-drawing acceptance suite.
 for(const key of ['settings','business','priceOverrides','backbones'])expect(restored[key]).toEqual(expected[key]);
 const normalized=floors=>floors.map(f=>({...f,document:f.document?{...f.document,assetId:'raster',sourceAssetId:f.document.sourceAssetId?'original':undefined}:undefined}));
 expect(normalized(restored.floors)).toEqual(normalized(expected.floors));
 const manifest=JSON.parse(execFileSync('unzip',['-p',bundle,'manifest.json'],{encoding:'utf8'}));let checkedAssets=0;
 for(const [i,floor] of expected.floors.entries())if(floor.document)for(const key of ['assetId','sourceAssetId'])if(floor.document[key]){
  const original=manifest.assets.find(a=>a.id===floor.document[key]),id=restored.floors[i].document[key];
  const bytes=execFileSync('adb',['-s',serial,'exec-out','run-as',pkg,'cat',`files/documents/${id}`],{maxBuffer:55*1024*1024});
  expect(bytes.length).toBe(original.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(original.sha256);checkedAssets++;
 }
 await mkdir('artifacts/exports',{recursive:true});await writeFile('artifacts/exports/bundle-restore-result.json',JSON.stringify({serial,source:basename(bundle),independentId:true,engineeringStateEqual:true,checkedAssets,assetHashesMatch:true,restoredId:restored.id},null,2));
 console.log(`Actual system file selection -> portable project import -> saved project readback: matching geometry, locks, settings, prices and ${checkedAssets} original/raster asset references with exact SHA256.`);
}finally{await device.close();adb('shell','am','force-stop','com.microsoft.playwright.androiddriver');}
