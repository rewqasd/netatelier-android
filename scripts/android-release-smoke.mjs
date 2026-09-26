// Black-box test for the exact non-debuggable signed APK: no WebView CDP,
// no JS bridge injection and no run-as access to its private project store.
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {basename} from 'node:path';
import {createHash} from 'node:crypto';
import {_android,expect} from '@playwright/test';
import {checkAndroidPlanScreen} from './check-android-plan-screen.mjs';
const serial=process.env.ANDROID_SERIAL,apk=process.argv[2],input=process.argv[3];
if(!serial?.startsWith('emulator-')||!apk?.endsWith('.apk')||!input?.endsWith('.png'))throw new Error('Usage on disposable emulator: ANDROID_SERIAL=emulator-N node scripts/android-release-smoke.mjs signed.apk clear-plan.png');
const pkg='io.github.rewqasd.netatelier',docs='com.android.documentsui',adb=(...a)=>execFileSync('adb',['-s',serial,...a],{encoding:'utf8',timeout:30000}).trim(),run=Date.now(),out=`artifacts/acceptance/release-${run}`;
await mkdir(out,{recursive:true});adb('shell','svc','wifi','disable');adb('shell','svc','data','disable');expect(adb('shell','pm','list','packages','com.google.android.gms')).toBe('');
if(adb('shell','pm','list','packages',pkg).includes(pkg))adb('uninstall',pkg);adb('install',apk);adb('logcat','-c');
const name=`release-${run}-${basename(input)}`;adb('push',input,`/sdcard/Download/${name}`);adb('shell','touch',`/sdcard/Download/${name}`);adb('shell','am','start','-W','-n',`${pkg}/.MainActivity`);
let device=(await _android.devices()).find(d=>d.serial()===serial);if(!device)throw new Error('Selected emulator missing');device.setDefaultTimeout(15000);
async function info(selector){let result;await expect.poll(async()=>{try{result=await device.info(selector);return result.enabled;}catch{return false;}},{timeout:45000}).toBe(true);return result;}
async function tap(selector){const r=await info(selector);adb('shell','input','tap',String(Math.round(r.bounds.x+r.bounds.width/2)),String(Math.round(r.bounds.y+r.bounds.height/2)));}
const shot=async name=>writeFile(`${out}/${name}.png`,execFileSync('adb',['-s',serial,'exec-out','screencap','-p'],{maxBuffer:12*1024*1024}));
async function planShot(name){
 const scope=(await info({pkg,text:'楼层范围'})).bounds,canvas=(await info({pkg,text:'点位与布线平面图'})).bounds;
 const toolbar={x:canvas.x,y:scope.y,width:canvas.width,height:canvas.y-scope.y};
 // Wait for actual composited pixels, not merely an accessible element tree.
 let pixels;await expect.poll(async()=>{try{await shot(name);pixels=await checkAndroidPlanScreen(await readFile(`${out}/${name}.png`),{toolbar,canvas});return true;}catch{return false;}},{timeout:15000}).toBe(true);
 await writeFile(`${out}/${name}-pixels.json`,JSON.stringify({toolbar,canvas,...pixels},null,2));
}
async function scrollDown(){const root=await device.info({pkg,clazz:'android.webkit.WebView'}),b=root.bounds;adb('shell','input','swipe',String(Math.round(b.x+b.width*.8)),String(Math.round(b.y+b.height*.85)),String(Math.round(b.x+b.width*.8)),String(Math.round(b.y+b.height*.3)),'350');}
try{
 await info({pkg,text:'导入平面图'});await shot('home');await tap({pkg,text:'导入平面图'});await info({pkg,text:'从本地平面图开始'});await tap({pkg,text:'导入平面图',clazz:'android.widget.Button'});
 await tap({pkg:docs,desc:'Show roots'});await tap({pkg:docs,res:'android:id/title',text:'Downloads'});await tap({pkg:docs,text:name});await tap({pkg,text:'识别这一页'});
 await info({pkg,text:/文字识别结果.*/});await scrollDown();const kitchen=await info({pkg,text:/厨房.*/}),office=await info({pkg,text:/Office.*/});const observed=kitchen.text+'\n'+office.text;
 expect(observed).toContain('厨房');expect(observed).toContain('Office');await shot('real-offline-ocr');await writeFile(`${out}/ocr-visible.txt`,observed);
 adb('shell','input','keyevent','4');await info({pkg,text:'导入项目备份'});
 // WebView exposes the aria-label, not status text. The screenshot records the
 // visible status; reopening the actual editor below proves persistent save.
 await tap({pkg,text:'400㎡ 餐厅'});await info({pkg,text:'保存状态'});await info({pkg,text:'点位与布线平面图'});await planShot('saved-plan');await tap({pkg,text:'报价'});await info({pkg,text:'方案总价'});await shot('quote');
 adb('shell','am','force-stop',pkg);await device.close();adb('shell','am','force-stop','com.microsoft.playwright.androiddriver');adb('shell','am','start','-W','-n',`${pkg}/.MainActivity`);device=(await _android.devices()).find(d=>d.serial()===serial);
 await info({pkg,text:'400㎡ 餐厅'});await info({pkg,text:'保存状态'});await info({pkg,text:'点位与布线平面图'});await planShot('reopened-plan');
 const runtime=adb('logcat','-d','-s','AndroidRuntime:E');await writeFile(`${out}/runtime-errors.txt`,runtime);expect(runtime).not.toContain(`Process: ${pkg}`);
 const hash=createHash('sha256').update(await readFile(apk)).digest('hex');await writeFile(`${out}/result.json`,JSON.stringify({serial,apk:basename(apk),sha256:hash,freshOfflineInstall:true,noPlayServices:true,realChineseOcr:true,sceneSaveRestart:true,nativePlanPixelsChecked:true,debugBridgeUsed:false},null,2));console.log(`Signed APK black-box offline smoke passed: ${out}, sha256 ${hash}`);
}finally{await device?.close();adb('shell','am','force-stop','com.microsoft.playwright.androiddriver');}
