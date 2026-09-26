import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/acceptance/inputs';await mkdir(out,{recursive:true});
const browser=await chromium.launch();try{
 const page=await browser.newPage();
 for(const [name,rotation,quality] of [['clear-plan',0,1],['dimension-plan',0,1],['low-quality-plan',90,.35]]){
  const svg=await readFile(`tests/fixtures/recognition/${name}.svg`,'utf8');
  const url=await page.evaluate(async({svg,rotation,quality})=>{const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));await image.decode();const c=document.createElement('canvas');c.width=rotation?image.height:image.width;c.height=rotation?image.width:image.height;const ctx=c.getContext('2d');if(rotation){ctx.translate(c.width,0);ctx.rotate(Math.PI/2);}ctx.filter=quality<1?'blur(1.1px)':'none';ctx.drawImage(image,0,0);return c.toDataURL(quality<1?'image/jpeg':'image/png',quality);},{svg,rotation,quality});
  await writeFile(`${out}/${name}.${quality<1?'jpg':'png'}`,Buffer.from(url.split(',')[1],'base64'));
 }
 const diagram=await readFile('tests/fixtures/recognition/dimension-plan.svg','utf8');
 await page.setContent(`<style>@page{size:1500px 1000px;margin:0}body{margin:0}svg{display:block;width:1500px;height:1000px}.cover{width:1500px;height:1000px;break-after:page;display:grid;place-items:center;font:48px sans-serif}</style><div class="cover">原创验收图 / 第二页为平面图</div>${diagram}`);
 await page.pdf({path:`${out}/dimension-plan.pdf`,preferCSSPageSize:true,printBackground:true});
 console.log('Three original drawings rasterized; the dimensioned drawing is also a two-page PDF. These are synthetic test inputs, not client drawings.');
}finally{await browser.close();}
