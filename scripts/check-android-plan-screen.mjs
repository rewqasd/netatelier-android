// Inspect real ADB pixels, not a CDP screenshot: the latter bypasses Android
// composition and previously missed repeated drawing tiles over the toolbar.
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export async function checkAndroidPlanScreen(png,{toolbar,canvas}){
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  const counts=await page.evaluate(async({data,toolbar,canvas})=>{
   const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
   const c=document.createElement('canvas');c.width=image.width;c.height=image.height;
   const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
   function count(b){
    if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<1||b.height<1||b.x<0||b.y<0||b.x+b.width>c.width||b.y+b.height>c.height)throw Error('Invalid native screen bounds');
    const pixels=ctx.getImageData(Math.ceil(b.x),Math.ceil(b.y),Math.floor(b.width),Math.floor(b.height)).data;let n=0;
    for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];if((r<100&&g>100&&g<185&&b>140)||(r>170&&g>70&&g<155&&b<115))n++;}
    return n;
   }
   return {toolbarDrawingPixels:count(toolbar),canvasDrawingPixels:count(canvas),width:c.width,height:c.height};
  },{data:Buffer.from(png).toString('base64'),toolbar,canvas});
  if(counts.toolbarDrawingPixels>4)throw Error(`Drawing leaked into native toolbar: ${JSON.stringify(counts)}`);
  if(counts.canvasDrawingPixels<30)throw Error(`Native plan is blank or not ready: ${JSON.stringify(counts)}`);
  return counts;
 }finally{await browser.close();}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(!process.argv[2]||!process.argv[3])throw Error('Usage: node scripts/check-android-plan-screen.mjs screenshot.png bounds.json');
 console.log(await checkAndroidPlanScreen(await readFile(process.argv[2]),JSON.parse(await readFile(process.argv[3],'utf8'))));
}
