import {execFileSync} from 'node:child_process';
import {_android,expect} from '@playwright/test';
const serial=process.env.ANDROID_SERIAL;if(!serial)throw new Error('Set ANDROID_SERIAL');
const pkg='io.github.rewqasd.netatelier',adb=(...args)=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:20000}).trim();
const priorRotation=adb('shell','settings','get','system','user_rotation'),priorAuto=adb('shell','settings','get','system','accelerometer_rotation'),size=adb('shell','wm','size'),density=adb('shell','wm','density');
const overrideSize=/Override size: (\S+)/.exec(size)?.[1],overrideDensity=/Override density: (\S+)/.exec(density)?.[1];
let device;
try{
 adb('shell','am','start','-W','-n',`${pkg}/.MainActivity`);device=(await _android.devices()).find(d=>d.serial()===serial);if(!device)throw new Error('Device unavailable');const page=await(await device.webView({pkg})).page();await expect(page.getByRole('img',{name:'点位与布线平面图'})).toBeVisible();
 const id=await page.locator('[data-kind=ap]').first().getAttribute('data-id'),before=await page.locator(`[data-id="${id}"]`).getAttribute('data-x');
 const cdp=await page.context().newCDPSession(page),rect=await page.getByRole('img',{name:'点位与布线平面图'}).boundingBox(),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
 const room=page.locator('.canvas-stage polygon').first(),width=(await room.boundingBox()).width;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx-35,y:cy},{id:2,x:cx+35,y:cy}]});
 for(let n=0;n<5;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx-40-n*10,y:cy},{id:2,x:cx+40+n*10,y:cy}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(async()=>(await room.boundingBox()).width).toBeGreaterThan(width*1.4);await expect(page.locator(`[data-id="${id}"]`)).toHaveAttribute('data-x',before);await page.getByRole('button',{name:'适应画布',exact:true}).click();
 adb('shell','settings','put','system','accelerometer_rotation','0');adb('shell','settings','put','system','user_rotation','1');await expect.poll(()=>page.evaluate(()=>innerWidth>innerHeight)).toBe(true);await page.screenshot({path:'artifacts/android/planner-office-landscape.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 adb('shell','settings','put','system','user_rotation','0');adb('shell','wm','size','1600x2560');adb('shell','wm','density','240');await expect.poll(()=>page.evaluate(()=>innerWidth)).toBeGreaterThan(900);await page.screenshot({path:'artifacts/android/planner-office-tablet.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator(`[data-id="${id}"]`)).toHaveAttribute('data-x',before);
 console.log('Actual Android WebView two-finger zoom preserves engineering position; phone landscape and tablet layout/overflow verified.');
}finally{
 adb('shell','wm','size',overrideSize??'reset');adb('shell','wm','density',overrideDensity??'reset');adb('shell','settings','put','system','user_rotation',priorRotation);adb('shell','settings','put','system','accelerometer_rotation',priorAuto);
 if(device)await device.close();adb('shell','am','force-stop','com.microsoft.playwright.androiddriver');
}
