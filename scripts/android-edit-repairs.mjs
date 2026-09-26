// Actual Android WebView interactions for the final edit-repair regressions.
// The native store is read only for assertions; all engineering changes use UI.
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {_android,expect} from '@playwright/test';
const serial=process.env.ANDROID_SERIAL;if(!serial?.startsWith('emulator-'))throw new Error('Select a disposable emulator explicitly');
const pkg='io.github.rewqasd.netatelier',out=`artifacts/acceptance/edit-repairs-${Date.now()}`;
const adb=(...a)=>execFileSync('adb',['-s',serial,...a],{encoding:'utf8',timeout:30000}).trim();
let device,page;await mkdir(out,{recursive:true});
async function connect(){adb('shell','am','start','-W','-n',`${pkg}/.MainActivity`);device=(await _android.devices()).find(d=>d.serial()===serial);page=await(await device.webView({pkg})).page();page.setDefaultTimeout(15000);}
async function disconnect(){await device?.close();device=undefined;adb('shell','am','force-stop','com.microsoft.playwright.androiddriver');}
async function saved(){await expect(page.getByLabel('保存状态')).toContainText('已保存');}
async function snapshot(){await saved();return JSON.parse(await page.evaluate(async()=>{const {id}=await window.Capacitor.Plugins.MobileShell.getSelection();return (await window.Capacitor.Plugins.ProjectStore.load({id})).project;}));}
async function select(id){await page.locator(`[data-id="${id}"]`).click();}
try{
 await connect();await page.evaluate(()=>window.Capacitor.Plugins.MobileShell.setSelection({id:null}));await page.reload();
 await page.getByRole('button',{name:'300㎡ 办公企业',exact:true}).click();await saved();
 const segment=page.locator('[data-segment]').first();await segment.focus();await segment.press('Enter');await page.getByRole('button',{name:'应用路段移动',exact:true}).click();
 const locked=await snapshot(),f=locked.floors[0],wire=f.cables.find(c=>c.locked&&f.devices.some(d=>d.id===c.toId&&d.kind!=='information')),endpoint=f.devices.find(d=>d.id===wire.toId);
 await select(endpoint.id);await page.getByLabel('点位X（米）').fill(String(endpoint.positionM.x+.1));await page.getByRole('button',{name:'应用位置',exact:true}).click();await expect(page.getByRole('alert')).toContainText('关联线路已锁定');
 expect((await snapshot()).floors[0].cables).toEqual(f.cables);await page.getByRole('button',{name:'解锁关联线路并重算',exact:true}).click();
 await page.getByLabel('点位X（米）').fill(String(endpoint.positionM.x+.1));await page.getByRole('button',{name:'应用位置',exact:true}).click();await saved();
 const moved=await snapshot();expect(moved.floors[0].devices.find(d=>d.id===endpoint.id).positionM.x).toBeCloseTo(endpoint.positionM.x+.1,6);expect(moved.floors[0].cables.find(c=>c.id===wire.id).locked).toBe(false);
 await page.getByRole('button',{name:'关闭属性',exact:true}).click();
 const originalCamera=moved.floors[0].devices.filter(d=>d.kind==='camera'&&d.targetIds?.length).sort((a,b)=>b.positionM.y-a.positionM.y)[0],cameraCount=moved.floors[0].devices.filter(d=>d.kind==='camera').length;
 await page.getByText('添加点位',{exact:true}).click();await page.getByRole('button',{name:'添加监控',exact:true}).click();await expect(page.locator('.mode-banner')).toBeVisible();
 // Entering add mode changes the viewport height. Reacquire the true anchor
 // afterwards; stale screen coordinates near a boundary can land outside it.
 const anchor=await page.locator(`[data-id="${originalCamera.id}"] > circle`).boundingBox();await page.mouse.click(anchor.x+anchor.width/2,anchor.y+anchor.height/2);await expect(page.locator('[data-kind=camera]')).toHaveCount(cameraCount+1);await saved();
 const added=await snapshot(),newCamera=added.floors[0].devices.find(d=>d.kind==='camera'&&!moved.floors[0].devices.some(old=>old.id===d.id));expect(newCamera.directionRad).toBeUndefined();
 await select(newCamera.id);await page.getByLabel('主要监控目标').selectOption(originalCamera.targetIds[0]);await page.getByRole('button',{name:'应用监控目标',exact:true}).click();await saved();
 const aimed=await snapshot(),camera=aimed.floors[0].devices.find(d=>d.id===newCamera.id);expect(camera.targetIds).toContain(originalCamera.targetIds[0]);expect(camera.positionM).toEqual(newCamera.positionM);expect(Number.isFinite(camera.directionRad)).toBe(true);await page.screenshot({path:`${out}/camera-target.png`});
 await page.getByRole('button',{name:'关闭属性',exact:true}).click();await disconnect();adb('shell','am','force-stop',pkg);await connect();expect((await snapshot()).floors).toEqual(aimed.floors);
 await page.getByRole('button',{name:'返回项目列表'}).click();await page.getByRole('button',{name:'40间客房酒店',exact:true}).click();await saved();await page.getByLabel('当前楼层').selectOption({index:1});
 const hotel=await snapshot(),hf=hotel.floors[1],cab=hf.devices.find(d=>d.kind==='cabinet');await select(cab.id);if(cab.locked)await page.getByRole('button',{name:'解锁点位',exact:true}).click();
 await page.getByLabel('点位X（米）').fill(String(cab.positionM.x+.1));await page.getByRole('button',{name:'应用位置',exact:true}).click();await saved();
 const changed=await snapshot(),link=changed.backbones.find(b=>b.toFloorId===hf.id);expect(link.pointsM.at(-1)).toEqual({x:cab.positionM.x+.1,y:cab.positionM.y,z:hf.elevationM});expect(link.status).toBe('provisional');
 await page.getByRole('button',{name:'关闭属性',exact:true}).click();await page.locator('.issues-tray > summary').click();await page.getByRole('button',{name:'已核查此主干路径',exact:true}).first().click();await saved();expect((await snapshot()).backbones[0].status).toBe('confirmed');await page.screenshot({path:`${out}/hotel-repaired.png`});
 await writeFile(`${out}/result.json`,JSON.stringify({serial,lockedGeometryPreserved:true,explicitUnlockRepair:true,manualCameraAim:true,processRestartPreserved:true,hotelBackboneReconfirmed:true},null,2));console.log(`Native edit repairs passed: ${out}`);
}finally{await disconnect();}
