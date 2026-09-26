import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const name of ['400㎡ 餐厅','300㎡ 办公企业','1000㎡ 健身房','40间客房酒店','200㎡ 零售门店'])test(`downloads self-contained applied SVG and exact CSV: ${name}`,async({page})=>{
 await page.goto('/');await page.getByRole('button',{name,exact:true}).click();await page.getByRole('button',{name:'导出方案',exact:true}).click();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'当前楼层 SVG',exact:true}).click();const file=await downloaded,svg=await readFile((await file.path())!,'utf8');
 expect(file.suggestedFilename()).toMatch(/\.svg$/);expect(await page.evaluate(s=>new DOMParser().parseFromString(s,'image/svg+xml').querySelector('parsererror')?.textContent,svg)).toBeUndefined();
 expect(svg).toContain('data-x-m=');const csvDownload=page.waitForEvent('download');await page.getByRole('button',{name:'全项目报价 CSV',exact:true}).click();const csv=await readFile((await (await csvDownload).path())!,'utf8');expect(csv).toContain('待核实估算');expect(csv).toContain('金额（元）');
 if(name.includes('酒店')){await page.getByRole('button',{name:'关闭导出',exact:true}).click();await page.getByLabel('当前楼层').selectOption({index:3});await page.getByRole('button',{name:'导出方案',exact:true}).click();const second=page.waitForEvent('download');await page.getByRole('button',{name:'当前楼层 SVG',exact:true}).click();const fourth=await readFile((await (await second).path())!,'utf8');expect(fourth).toContain('hotel-f4');expect(fourth).not.toContain('data-device="hotel-f1');}
});
test('PNG is a decodable raster, topology is separate, export never applies an unfinished draft',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'300㎡ 办公企业',exact:true}).click();await page.getByRole('button',{name:'需求与数量',exact:true}).click();await page.getByLabel('AP数量',{exact:true}).fill('2');await page.getByRole('button',{name:'导出方案',exact:true}).click();await expect(page.getByRole('alert')).toContainText('未应用');
 await page.getByRole('button',{name:'取消修改',exact:true}).click();await page.getByRole('button',{name:'导出方案',exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'当前楼层 PNG',exact:true}).click();const bytes=await readFile((await (await download).path())!);expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);expect(bytes.readUInt32BE(16)).toBeGreaterThanOrEqual(1800);
 const topology=page.waitForEvent('download');await page.getByRole('button',{name:'全项目拓扑 SVG',exact:true}).click();const svg=await readFile((await (await topology).path())!,'utf8');expect(svg).toContain('data-edge=');expect(svg).not.toContain('data-device=');
});
