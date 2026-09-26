import {execFileSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {_android,expect} from '@playwright/test';
const serial=process.env.ANDROID_SERIAL;
if(!serial)throw new Error('Set ANDROID_SERIAL to the test emulator, never guess a device.');
const adb=(...args)=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:20000}).trim();
adb('shell','am','start','-W','-n','io.github.rewqasd.netatelier/.MainActivity');
const device=(await _android.devices()).find(device=>device.serial()===serial);
if(!device)throw new Error('Selected Android device is not available');
try{
  // Android's drawer animation replaces accessibility nodes after lookup.
  // Reacquire only stale nodes; all other failures remain test failures.
  const tapStable=async selector=>{
    for(let attempt=0;attempt<3;attempt++){
      try{return await device.tap(selector,{timeout:5000});}
      catch(error){if(!String(error).includes('StaleObjectException')||attempt===2)throw error;}
    }
  };
  const webview=await device.webView({pkg:'io.github.rewqasd.netatelier'});
  const page=await webview.page();
  await expect(page.getByRole('button',{name:'导入平面图',exact:true})).toBeVisible();
  if(process.argv.includes('--open-picker'))await page.getByRole('button',{name:'导入平面图',exact:true}).click();
  if(process.argv.includes('--pick-fixture')){
    await page.getByRole('button',{name:'导入平面图',exact:true}).click();
    await tapStable({pkg:'com.android.documentsui',desc:'Show roots'});
    await tapStable({pkg:'com.android.documentsui',res:'android:id/title',text:'Downloads'});
    await tapStable({pkg:'com.android.documentsui',text:'netatelier-clear.png'});
    await expect(page.getByRole('button',{name:'识别这一页',exact:true})).toBeEnabled();
  }
  if(process.argv.includes('--verify-ocr')){
    const image=page.locator('.recognition-result image');
    const oldImage=await image.count()?await image.getAttribute('href'):null;
    await page.getByRole('button',{name:'识别这一页',exact:true}).click();
    await expect(page.getByRole('button',{name:'识别这一页',exact:true})).toBeEnabled({timeout:40000});
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    if(oldImage)await expect(page.locator('.recognition-result image')).not.toHaveAttribute('href',oldImage);
    const words=page.getByRole('list',{name:'识别文字'});
    await expect(words).toContainText('厨房',{timeout:40000});
    await expect(words).toContainText('101');
    await expect(words).toContainText('Office');
    await words.scrollIntoViewIfNeeded();
    await expect(words).toBeInViewport();
    await mkdir('artifacts/android',{recursive:true});
    await device.screenshot({path:'artifacts/android/import-ocr.png'});
    console.log(await words.innerText());
    console.log('System-picked image -> native raster -> bundled OCR -> visible result verified');
  }
  if(process.argv.includes('--verify-picker-cancel')){
    const words=page.getByRole('list',{name:'识别文字'});
    const before=await words.innerText();
    await page.getByRole('button',{name:'导入平面图',exact:true}).click();
    await device.wait({pkg:'com.android.documentsui'});
    adb('shell','input','keyevent','4');
    await expect(page.getByRole('button',{name:'导入平面图',exact:true})).toBeEnabled();
    await expect(page.getByRole('status')).toHaveCount(0);
    if(await words.innerText()!==before)throw new Error('Cancelling picker changed the prior result');
    console.log('Actual system-picker cancellation preserves previous result');
  }
  if(process.argv.includes('--verify-correction-entry')){
    await page.getByRole('button',{name:'进入图纸校正'}).click({timeout:5000});
    await expect(page.getByRole('heading',{name:'图纸校正'})).toBeVisible();
    await expect(page.getByLabel('房间名称')).toHaveCount(4,{timeout:10000});
    await page.getByRole('img',{name:'原图与待确认几何'}).evaluate(svg=>svg.scrollIntoView({block:'center'}));
    await page.waitForFunction(()=>{const rect=document.querySelector('.correction-viewport')?.getBoundingClientRect();return !!rect&&rect.top>=0&&rect.bottom<=innerHeight;});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await device.screenshot({path:'artifacts/android/recognition-geometry.png'});
    console.log('Actual native OCR -> local geometry worker -> four-room correction entry verified');
  }
  console.log('Actual Android WebView import entry verified');
}finally{
  await device.close();
  // The pinned Android adapter can leave its driver instrumentation/socket alive
  // after closing the device. Stop only this test-owned driver, not the app/ADB.
  adb('shell','am','force-stop','com.microsoft.playwright.androiddriver');
}
