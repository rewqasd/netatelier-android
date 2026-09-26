import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {_android,expect} from '@playwright/test';
import {checkPdfPagination} from './check-pdf.mjs';
const serial=process.env.ANDROID_SERIAL;if(!serial)throw new Error('Set ANDROID_SERIAL to the intended emulator');
const pkg='io.github.rewqasd.netatelier',docs='com.android.documentsui',print='com.android.printspooler',prefix=`netatelier-${Date.now()}`,out=`artifacts/exports/${prefix}`;
const adb=(...a)=>execFileSync('adb',['-s',serial,...a],{encoding:'utf8',timeout:20000}).trim();
await mkdir(out,{recursive:true});adb('shell','am','start','-W','-n',`${pkg}/.MainActivity`);
const device=(await _android.devices()).find(d=>d.serial()===serial);if(!device)throw new Error('Specified emulator unavailable');
async function tap(selector){const info=await present(selector);adb('shell','input','tap',String(Math.round(info.bounds.x+info.bounds.width/2)),String(Math.round(info.bounds.y+info.bounds.height/2)));}
// Reacquire accessibility information at each poll. A long native wait can retain
// a stale root when consecutive document-picker activities reuse the same window.
async function present(selector){let info;await expect.poll(async()=>{try{info=await device.info(selector);return info.enabled}catch{return false}},{timeout:60000,intervals:[250,500,1000]}).toBe(true);return info;}
async function destination(filename){await present({pkg:docs,res:'android:id/title',clazz:'android.widget.EditText'});await device.fill({pkg:docs,res:'android:id/title',clazz:'android.widget.EditText'},filename);await tap({pkg:docs,res:'android:id/button1'});}
try{
 const first=await(await device.webView({pkg})).page();let page;await expect.poll(()=>{page=first.context().pages().find(p=>p.url().startsWith('https://localhost'));return !!page;},{timeout:30000}).toBe(true);await page.waitForFunction(()=>!!window.Capacitor?.Plugins?.MobileShell);await page.evaluate(()=>window.Capacitor.Plugins.MobileShell.setSelection({id:null}));await page.reload();await page.getByRole('button',{name:'400㎡ 餐厅',exact:true}).click();await expect(page.getByLabel('保存状态')).toContainText('已保存');await page.getByRole('button',{name:'导出方案',exact:true}).click();
 const snapshot=()=>page.evaluate(async()=>{const {id}=await window.Capacitor.Plugins.MobileShell.getSelection();return (await window.Capacitor.Plugins.ProjectStore.load({id})).project;});
 const before=await snapshot();await page.getByRole('button',{name:'当前楼层 SVG',exact:true}).click();await present({pkg:docs,res:'android:id/title',clazz:'android.widget.EditText'});adb('shell','input','keyevent','4');await expect(page.getByRole('status')).toContainText('已取消');expect(await snapshot()).toBe(before);
 for(const [button,file] of [['当前楼层 SVG','floor.svg'],['当前楼层 PNG','floor.png'],['全项目拓扑 SVG','topology.svg'],['全项目拓扑 PNG','topology.png'],['全项目报价 CSV','quote.csv'],['完整工程包（含原图）','project.netatelier']]){
  await page.getByRole('button',{name:button,exact:true}).click();const filename=`${prefix}-${file}`;await destination(filename);await expect(page.getByRole('status')).toContainText('已完成',{timeout:60000});adb('pull',`/sdcard/Download/${filename}`,`${out}/${file}`);const bytes=await readFile(`${out}/${file}`);expect(bytes.length).toBeGreaterThan(100);
  if(file.endsWith('.svg'))expect(await page.evaluate(s=>new DOMParser().parseFromString(s,'image/svg+xml').querySelector('parsererror')?.textContent,bytes.toString('utf8'))).toBeUndefined();
  if(file.endsWith('.png'))expect(await page.evaluate(async b64=>{const image=new Image();image.src=`data:image/png;base64,${b64}`;await image.decode();return image.width;},bytes.toString('base64'))).toBeGreaterThan(1000);
  if(file.endsWith('.csv'))expect(bytes.toString('utf8')).toContain('8380.00');
 }
 for(const scene of ['restaurant','hotel']){
  if(scene==='hotel'){await page.getByRole('button',{name:'关闭导出',exact:true}).click();await page.getByRole('button',{name:'返回项目列表'}).click();await page.getByRole('button',{name:'40间客房酒店',exact:true}).click();await page.getByRole('button',{name:'导出方案',exact:true}).click();}
  await page.getByRole('button',{name:'全项目方案 PDF',exact:true}).click();await present({pkg:print,res:print+':id/destination_spinner'});await tap({pkg:print,res:print+':id/destination_spinner'});await tap({pkg:print,text:'Save as PDF'});await tap({pkg:print,res:print+':id/print_button'});await destination(`${prefix}-${scene}.pdf`);await expect(page.getByRole('status')).toContainText('已返回',{timeout:60000});adb('pull',`/sdcard/Download/${prefix}-${scene}.pdf`,`${out}/${scene}.pdf`);
  checkPdfPagination(`${out}/${scene}.pdf`);
  const info=execFileSync('pdfinfo',[`${out}/${scene}.pdf`],{encoding:'utf8'}),fonts=execFileSync('pdffonts',[`${out}/${scene}.pdf`],{encoding:'utf8'}),text=execFileSync('pdftotext',['-layout',`${out}/${scene}.pdf`,'-'],{encoding:'utf8'});expect(text).toContain(scene==='hotel'?'28434.00':'8380.00');expect(text).toContain('价格来源');expect(text).toContain('待确认事项');if(scene==='hotel')for(const n of [1,2,3,4])expect(text).toContain(`${n}层`);expect(fonts).toMatch(/NotoSansCJK.*yes\s+yes\s+yes/);await writeFile(`${out}/${scene}-check.txt`,info+'\n'+fonts+'\n'+text);
 }
 await page.getByRole('button',{name:'全项目方案 PDF',exact:true}).click();await present({pkg:print,res:print+':id/destination_spinner'});const beforeCancel=await snapshot();adb('shell','input','keyevent','4');await expect(page.getByRole('status')).toContainText('已返回',{timeout:60000});expect(await snapshot()).toBe(beforeCancel);
 await writeFile(`${out}/result.json`,JSON.stringify({serial,files:['floor.svg','floor.png','topology.svg','topology.png','quote.csv','project.netatelier','restaurant.pdf','hotel.pdf'],safCancelledWithoutMutation:true,printCancelledWithoutMutation:true},null,2));console.log(`Actual system save/reopen/cancel passed: ${out}`);
}finally{await device.close();adb('shell','am','force-stop','com.microsoft.playwright.androiddriver');}
