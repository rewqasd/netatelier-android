import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {_android,expect} from '@playwright/test';
import {checkPdfPagination} from './check-pdf.mjs';
const serial=process.env.ANDROID_SERIAL;
if(!serial?.startsWith('emulator-'))throw new Error('This acceptance resets only an explicitly selected emulator, never a physical phone');
const pkg='io.github.rewqasd.netatelier',docs='com.android.documentsui',print='com.android.printspooler',run=`run-${Date.now()}`,out=`artifacts/acceptance/${run}`;
const adb=(...a)=>execFileSync('adb',['-s',serial,...a],{encoding:'utf8',timeout:30000}).trim();
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
// Hand-authored geometry from the independent source drawings, not planner output.
// It represents explicit manual correction through the real UI, not OCR answers.
const cases=[
 {name:'clear-plan',file:'clear-plan.png',w:1200,h:800,boundary:rect(60,60,1080,680),metres:27,end:1080,area:459,rooms:[['厨房101','kitchen',rect(60,60,600,360)],['Office202','office',rect(60,420,600,320)],['就餐区','public',rect(660,60,480,290)],['入口','entrance',rect(660,350,480,390)]],doors:[[660,380,0,3],[660,600,1,3],[900,350,2,3],[1140,500,3,null]],cabinet:[1000,650],wan:[1110,550],targets:[[600,380],[900,200],[900,500]],words:['厨房','Office','101']},
 {name:'dimension-plan',file:'dimension-plan.pdf',w:1500,h:1000,page:1,boundary:rect(100,150,1300,750),metres:26,end:1300,area:390,rooms:[['前台','entrance',rect(100,150,500,500)],['办公室301','office',rect(600,150,400,500)],['库房302','storage',rect(1000,150,400,500)],['公共通道','corridor',rect(100,650,1300,250)]],doors:[[350,650,0,3],[800,650,1,3],[1200,650,2,3],[100,800,3,null]],cabinet:[1300,800],wan:[1380,800],targets:[[300,400],[800,760]],words:['301','302','26.00']},
 {name:'low-quality-plan',file:'low-quality-plan.jpg',w:900,h:900,rotation:270,boundary:[[80,80],[820,80],[820,360],[480,360],[480,820],[80,820]],metres:14.8,end:740,area:156.48,rooms:[['展厅501','public',[[80,80],[820,80],[820,360],[480,360],[480,480],[80,480]]],['更衣室','changing',rect(80,480,400,340)]],doors:[[240,480,0,1],[80,220,0,null]],cabinet:[130,400],wan:[120,180],targets:[[500,220]],words:[]},
];
await mkdir(out,{recursive:true});
if(process.argv.includes('--fresh')){
 const apk=process.argv[process.argv.indexOf('--fresh')+1];if(!apk?.endsWith('.apk'))throw new Error('--fresh requires the intended APK path');
 adb('shell','svc','wifi','disable');adb('shell','svc','data','disable');
 expect(adb('shell','pm','list','packages','com.google.android.gms')).toBe('');
 if(adb('shell','pm','list','packages',pkg).includes(pkg))adb('uninstall',pkg);
 adb('install',apk);await writeFile(`${out}/apk-sha256.txt`,createHash('sha256').update(await readFile(apk)).digest('hex'));
}
let device,page;
async function connect(){adb('shell','am','start','-W','-n',`${pkg}/.MainActivity`);device=(await _android.devices()).find(d=>d.serial()===serial);if(!device)throw new Error('Selected emulator unavailable');const first=await(await device.webView({pkg})).page();await expect.poll(()=>{page=first.context().pages().find(p=>p.url().startsWith('https://localhost'));return !!page;},{timeout:30000}).toBe(true);page.setDefaultTimeout(15000);await page.waitForFunction(()=>!!window.Capacitor?.Plugins?.ProjectStore);}
async function disconnect(){if(device){await device.close();device=undefined;}adb('shell','am','force-stop','com.microsoft.playwright.androiddriver');}
async function present(selector){let info;await expect.poll(async()=>{try{info=await device.info(selector);return info.enabled}catch{return false}},{timeout:30000}).toBe(true);return info;}
async function tap(selector){const i=await present(selector);adb('shell','input','tap',String(Math.round(i.bounds.x+i.bounds.width/2)),String(Math.round(i.bounds.y+i.bounds.height/2)));}
async function pick(name){await tap({pkg:docs,desc:'Show roots'});await tap({pkg:docs,res:'android:id/title',text:'Downloads'});await tap({pkg:docs,text:name});}
async function save(filename){await present({pkg:docs,res:'android:id/title',clazz:'android.widget.EditText'});await device.fill({pkg:docs,res:'android:id/title',clazz:'android.widget.EditText'},filename);await tap({pkg:docs,res:'android:id/button1'});}
async function snapshot(){return JSON.parse(await page.evaluate(async()=>{const {id}=await window.Capacitor.Plugins.MobileShell.getSelection();return (await window.Capacitor.Plugins.ProjectStore.load({id})).project;}));}
async function point(x,y,c){const svg=page.getByRole('img',{name:'原图与待确认几何'});await svg.scrollIntoViewIfNeeded();const at=await svg.evaluate((s,{x,y,w,h})=>{const p=new DOMPoint(x/w*s.viewBox.baseVal.width,y/h*s.viewBox.baseVal.height).matrixTransform(s.getScreenCTM());return {x:p.x,y:p.y};},{x,y,w:c.w,h:c.h});await page.mouse.click(at.x,at.y);}
async function draw(tool,points,c){await page.getByRole('button',{name:tool,exact:true}).click();for(const [x,y] of points)await point(x,y,c);if(points.length>2)await page.getByRole('button',{name:'完成范围绘制',exact:true}).click();}
async function exactVertices(scope,polygon,factor){await scope.locator('summary').filter({hasText:/^编辑顶点坐标/}).click();for(const [i,[x,y]] of polygon.entries()){await scope.getByLabel(`顶点${i+1}X`,{exact:true}).fill(String(x*factor));await scope.getByLabel(`顶点${i+1}Y`,{exact:true}).fill(String(y*factor));}await scope.locator('summary').filter({hasText:/^编辑顶点坐标/}).click();}
const results=[];
try{
 await connect();await page.evaluate(()=>window.Capacitor.Plugins.MobileShell.setSelection({id:null}));await page.reload();
 await page.getByRole('button',{name:'隐私与第三方声明',exact:true}).click();await expect(page.getByLabel('声明原文')).toContainText('MIT License');await page.getByLabel('声明文件').selectOption('android/com.google.android.gms--play-services-mlkit-text-recognition-chinese--16.0.1/third_party_licenses.txt');await expect(page.getByLabel('声明原文')).toContainText('Apache License');adb('shell','input','keyevent','4');await expect(page.getByRole('button',{name:'导入项目备份',exact:true})).toBeVisible();
 for(const c of cases){
  console.log(`Starting actual native input: ${c.file}`);const name=`${run}-${c.file}`;adb('push',`artifacts/acceptance/inputs/${c.file}`,`/sdcard/Download/${name}`);adb('shell','touch',`/sdcard/Download/${name}`);
  await page.getByRole('button',{name:'导入平面图',exact:true}).click();await page.getByRole('button',{name:'导入平面图',exact:true}).click();await pick(name);await expect(page.getByRole('button',{name:'识别这一页',exact:true})).toBeEnabled();
  if(c.page!==undefined){await expect(page.getByLabel('页面').locator('option')).toHaveCount(2);await page.getByLabel('页面').selectOption(String(c.page));}
  if(c.rotation)await page.getByLabel('旋转').selectOption(String(c.rotation));
  await page.getByRole('button',{name:'识别这一页',exact:true}).click();await expect(page.getByRole('button',{name:'进入图纸校正',exact:true})).toBeVisible({timeout:60000});
  const ocr=await page.getByLabel('识别文字').innerText(),boxes=await page.getByRole('img',{name:'原图和文字识别范围'}).locator('rect').evaluateAll(nodes=>nodes.map(n=>({x:n.getAttribute('x'),y:n.getAttribute('y'),width:n.getAttribute('width'),height:n.getAttribute('height')})));
  for(const word of c.words)expect(ocr).toContain(word);expect(boxes.length).toBeGreaterThan(0);await page.screenshot({path:`${out}/${c.name}-ocr.png`});
  await page.getByRole('button',{name:'进入图纸校正',exact:true}).click();await expect(page.getByRole('status')).toHaveCount(0,{timeout:60000});await expect(page.getByRole('button',{name:'绘制房间',exact:true})).toBeVisible();
  const candidateRooms=await page.getByLabel('房间名称').count();await page.getByRole('img',{name:'原图与待确认几何'}).screenshot({path:`${out}/${c.name}-candidates.png`});
  const viewBox=(await page.getByRole('img',{name:'原图与待确认几何'}).getAttribute('viewBox')).split(' ').map(Number),factor=viewBox[2]/c.w;expect(viewBox[3]/c.h).toBeCloseTo(factor,2);
  // Deliberately exercise correction against independently authored wall centres.
  // Record the candidates before replacing them; do not call this automatic accuracy.
  while(await page.getByRole('button',{name:'删除此候选',exact:true}).count())await page.getByRole('button',{name:'删除此候选',exact:true}).first().click();
  await page.locator('summary').filter({hasText:/^墙线 ·/}).click();
  while(await page.getByRole('button',{name:'删除墙线',exact:true}).count())await page.getByRole('button',{name:'删除墙线',exact:true}).first().click();
  await draw('重画建筑边界',c.boundary,c);const boundaryCard=page.locator('details.correction-card').filter({hasText:'建筑边界顶点'});await boundaryCard.locator('summary').first().click();await exactVertices(boundaryCard,c.boundary,factor);await boundaryCard.locator('summary').first().click();
  for(const [name,use,polygon] of c.rooms){await draw('绘制房间',polygon,c);await page.getByLabel('房间名称').last().fill(name);await page.getByLabel('房间用途').last().selectOption(use);await exactVertices(page.locator('details.correction-card').filter({has:page.getByLabel('房间名称')}).last(),polygon,factor);if(use==='changing')await page.getByLabel('需要Wi-Fi',{exact:true}).last().uncheck();await page.getByLabel('确认此房间').last().check();}
  const walls=new Map();for(const [,,polygon] of c.rooms)for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],key=[a.join(','),b.join(',')].sort().join(':');walls.set(key,[a,b]);}for(const line of walls.values())await draw('补墙线',line,c);
  for(const [x,y,a,b] of c.doors){await draw('添加门/通道',[[x,y]],c);await page.getByLabel(/^连接房间1/).last().selectOption({index:a+1});await page.getByLabel(/^连接房间2/).last().selectOption({index:b===null?0:b+1});await page.getByLabel('宽度（像素）',{exact:true}).last().fill(String(40*factor));if(b===null)await page.getByLabel('建筑入口',{exact:true}).last().check();await page.getByLabel('确认门洞',{exact:true}).last().check();}
  await draw('标记机柜',[c.cabinet],c);await draw('标记宽带入口',[c.wan],c);for(const target of c.targets)await draw('添加监控目标',[target],c);
  await page.getByLabel('标尺终点X').fill(String(c.end*factor));await page.getByLabel('已知长度（米）').fill(String(c.metres));await page.getByRole('button',{name:'应用长度标尺',exact:true}).click();
  await page.getByRole('button',{name:'确认并生成楼层',exact:true}).click();await expect(page.getByLabel('保存状态')).toContainText('已保存',{timeout:60000});
  const initial=await snapshot(),f=initial.floors[0];expect(initial.scene).toBeUndefined();expect(f.rooms.length).toBe(c.rooms.length);expect(f.document.page).toBe(c.page??0);expect(f.calibration.kind).toBe('known-length');expect(f.devices.some(d=>d.kind==='ap')).toBe(true);expect(f.devices.some(d=>d.kind==='camera')).toBe(true);
  const area=Math.abs(f.boundary.reduce((sum,p,i)=>{const q=f.boundary[(i+1)%f.boundary.length];return sum+p.x*q.y-q.x*p.y;},0)/2);expect(area).toBeCloseTo(c.area,0);
  if(c.name==='low-quality-plan')for(const d of f.devices.filter(d=>d.kind==='camera'))expect(d.positionM.y>=9.6&&d.positionM.x>=1.6&&d.positionM.x<=9.6).toBe(false);
  await page.getByRole('button',{name:'报价',exact:true}).click();const quote=await page.getByLabel('方案总价').innerText();await page.getByRole('button',{name:'拓扑',exact:true}).click();await expect(page.getByRole('img',{name:'网络组网拓扑图'})).toBeVisible();await page.getByRole('button',{name:'平面图',exact:true}).click();await page.screenshot({path:`${out}/${c.name}-plan.png`});
  adb('shell','input','keyevent','3');adb('shell','am','start','-W','-n',`${pkg}/.MainActivity`);await expect(page.getByRole('img',{name:'点位与布线平面图'})).toBeVisible();
  await disconnect();adb('shell','am','force-stop',pkg);await connect();await expect(page.getByLabel('保存状态')).toContainText('已保存');const reopened=await snapshot();expect(reopened.floors).toEqual(initial.floors);expect(reopened.settings).toEqual(initial.settings);
  await page.getByRole('button',{name:'导出方案',exact:true}).click();
  for(const [button,file] of [['当前楼层 PNG',`${c.name}.png`],['全项目报价 CSV',`${c.name}.csv`],['完整工程包（含原图）',`${c.name}.netatelier`]]){await page.getByRole('button',{name:button,exact:true}).click();await save(`${run}-export-${file}`);await expect(page.getByRole('status')).toContainText('已完成',{timeout:60000});adb('pull',`/sdcard/Download/${run}-export-${file}`,`${out}/${file}`);const bytes=await readFile(`${out}/${file}`);if(file.endsWith('.png')){expect(bytes.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));expect(bytes.readUInt32BE(16)).toBe(1800);}}
  if(c.name==='dimension-plan'){
   // Kill during the real system print session; data must remain recoverable.
   const saved=await snapshot();await page.getByRole('button',{name:'全项目方案 PDF',exact:true}).click();await present({pkg:print,res:print+':id/destination_spinner'});await disconnect();adb('shell','am','force-stop',pkg);await connect();await expect(page.getByLabel('保存状态')).toContainText('已保存');expect((await snapshot()).floors).toEqual(saved.floors);
   await page.getByRole('button',{name:'导出方案',exact:true}).click();await page.getByRole('button',{name:'全项目方案 PDF',exact:true}).click();await tap({pkg:print,res:print+':id/destination_spinner'});await tap({pkg:print,text:'Save as PDF'});await tap({pkg:print,res:print+':id/print_button'});await save(`${run}-imported-report.pdf`);await expect(page.getByRole('status')).toContainText('已返回',{timeout:60000});adb('pull',`/sdcard/Download/${run}-imported-report.pdf`,`${out}/imported-report.pdf`);checkPdfPagination(`${out}/imported-report.pdf`);
  }
  results.push({input:c.file,ocr,boxes,candidateRooms,correction:'explicit manual geometry through UI',areaM2:area,quote,projectId:initial.id,sourceSha256:createHash('sha256').update(await readFile(`artifacts/acceptance/inputs/${c.file}`)).digest('hex'),processRestartUnchanged:true});await writeFile(`${out}/results.json`,JSON.stringify({serial,run,results},null,2));
  await page.getByRole('button',{name:'关闭导出',exact:true}).click();await page.getByRole('button',{name:'返回项目列表'}).click();console.log(`Completed ${c.file}: ${candidateRooms} actual candidates, ${boxes.length} OCR boxes, corrected ${area.toFixed(2)}m2, ${quote}`);
 }
 console.log(`Three real offline drawing flows passed: ${out}`);
}catch(error){if(page&&!page.isClosed()){console.log(await page.locator('body').innerText().catch(()=>''));await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});}throw error;}
finally{await disconnect();}
