import {test,expect} from '@playwright/test';
for(const name of ['400㎡ 餐厅','300㎡ 办公企业','1000㎡ 健身房','40间客房酒店','200㎡ 零售门店'])test(`scene opens an editable plan: ${name}`,async({page})=>{
 await page.goto('/');await page.getByRole('button',{name,exact:true}).click();
 await expect(page.getByRole('img',{name:'点位与布线平面图'})).toBeVisible();
 await expect(page.locator('[data-kind=ap]')).not.toHaveCount(0);await expect(page.locator('[data-kind=camera]')).not.toHaveCount(0);
 await expect(page.getByLabel('保存状态')).toContainText('已保存');
 if(name.includes('酒店')){await expect(page.getByLabel('当前楼层').locator('option')).toHaveCount(4);const first=await page.locator('[data-kind=ap]').first().getAttribute('data-id');await page.getByLabel('当前楼层').selectOption({index:3});expect(await page.locator('[data-kind=ap]').first().getAttribute('data-id')).not.toBe(first);await expect(page.getByLabel('楼层范围')).toContainText('全楼1600');}
 for(const width of [390,844,1024]){await page.setViewportSize({width,height:width===844?390:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByRole('button',{name:'全屏画布',exact:true}).click();await expect(page.getByRole('button',{name:'退出全屏',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'保存',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'全屏画布',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('img',{name:'点位与布线平面图'})).toBeVisible();
});
test('short landscape uses the available canvas height instead of shrinking the drawing to a tiny thumbnail',async({page})=>{
 await page.setViewportSize({width:844,height:390});await page.goto('/');await page.getByRole('button',{name:'300㎡ 办公企业',exact:true}).click();const svg=page.getByRole('img',{name:'点位与布线平面图'});await expect(svg).toBeVisible();const size=await svg.boundingBox();const coverage=await svg.locator('polygon').evaluateAll(nodes=>{const boxes=nodes.map(n=>n.getBoundingClientRect());return Math.max(...boxes.map(b=>b.bottom))-Math.min(...boxes.map(b=>b.top));});expect(coverage).toBeGreaterThan(size!.height*.72);
});
