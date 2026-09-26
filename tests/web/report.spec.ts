import {test,expect} from '@playwright/test';
import {createScene} from '../../src/scenes';
import {planFloor} from '../../src/planning/ap';
import {routeProject} from '../../src/planning/routing';
import {deriveProject} from '../../src/quote/derive';
import {catalog} from '../../src/catalog/models';
import {reportHtml} from '../../src/export/report';
import {floorSvg} from '../../src/export/svg';
test('point labels remain readable when a wall crosses the space behind them',async({page})=>{
 const p=createScene('office'),f=p.floors[0];
 f.devices=[{id:'label-ap',floorId:f.id,label:'测试 AP',kind:'ap',positionM:{x:10,y:7.5},source:'manual',locked:true}];f.cables=[];
 // 20x15m floor maps its centre to (600,380) at 620/15 px/m.
 // The wall passes through the label's padding, not through its glyphs.
 f.walls=[{...f.walls[0],from:{x:0,y:335*15/620},to:{x:20,y:335*15/620}}];
 const pixel=await page.evaluate(async svg=>{const image=new Image();image.src=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);return [...ctx.getImageData(582,405,1,1).data];},floorSvg(p,f.id));
 expect(pixel).toEqual([255,255,255,255]);
});
test('an imported image extending beyond calibrated rooms cannot paint over export headings or legends',async({page})=>{
 const p=createScene('office'),f=p.floors[0];
 // A large red original surrounds the calibrated geometry: red outside the map
 // would prove that image transforms are escaping the export artwork viewport.
 const source=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=2000;const ctx=c.getContext('2d')!;ctx.fillStyle='red';ctx.fillRect(0,0,2000,2000);return c.toDataURL();});
 f.document={assetId:'surrounding.png',mime:'image/png',page:0,widthPx:2000,heightPx:2000};
 f.calibration={kind:'known-length',originPx:{x:500,y:500},angleRad:0,metersPerPixel:.1};
 const pixels=await page.evaluate(async svg=>{const image=new Image();image.src=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);return [10,760].map(y=>[...ctx.getImageData(1190,y,1,1).data]);},floorSvg(p,f.id,{'surrounding.png':source}));
 expect(pixels).toEqual([[255,255,255,255],[255,255,255,255]]);
});
test('A4 report pages retain every floor and keep rows above their own footer',async({page})=>{
 for(const scene of ['restaurant','hotel'] as const){const p=createScene(scene);p.floors=p.floors.map(f=>planFloor(f,p.settings).floor);const project=routeProject(p).project;await page.setViewportSize({width:703,height:1100});await page.setContent(reportHtml(project,deriveProject(project,catalog)));await page.emulateMedia({media:'print'});
  const overlapping=await page.locator('section').evaluateAll(sections=>sections.flatMap((s,index)=>{const f=s.querySelector('footer')!.getBoundingClientRect();const children=[...s.children].filter(e=>!['HEADER','FOOTER'].includes(e.tagName));return children.filter(e=>e.getBoundingClientRect().bottom>f.top-2).map(e=>({page:index+1,element:e.tagName,bottom:e.getBoundingClientRect().bottom,footer:f.top}));}));expect(overlapping).toEqual([]);
  await expect(page.locator('[data-floor]')).toHaveCount(scene==='hotel'?4:1);
 }
});
