import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/');await page.getByRole('button',{name:'300㎡ 办公企业',exact:true}).click();await expect(page.getByRole('img',{name:'点位与布线平面图'})).toBeVisible();});
test('drafts do not change quantities, navigation requires resolution, apply and cancel are explicit',async({page})=>{
 const n=await page.locator('[data-kind=ap]').count();await page.getByRole('button',{name:'需求与数量',exact:true}).click();await page.getByLabel('AP数量').fill(String(n+1));
 expect(await page.locator('[data-kind=ap]').count()).toBe(n);await page.getByRole('button',{name:'报价',exact:true}).click();await expect(page.getByRole('alert')).toContainText('未应用');
 await page.getByRole('button',{name:'取消修改',exact:true}).click();await page.getByRole('button',{name:'需求与数量',exact:true}).click();await page.getByLabel('AP数量').fill(String(n+1));await page.getByRole('button',{name:'应用配置',exact:true}).click();await expect(page.locator('[data-kind=ap]')).toHaveCount(n+1);
 await page.getByRole('button',{name:'撤销',exact:true}).click();await expect(page.locator('[data-kind=ap]')).toHaveCount(n);await page.getByRole('button',{name:'重做',exact:true}).click();await expect(page.locator('[data-kind=ap]')).toHaveCount(n+1);
});
test('ordinary taps never add devices; explicit move, lock and protected reduction',async({page})=>{
 const canvas=page.getByRole('img',{name:'点位与布线平面图'}),n=await page.locator('[data-kind=ap]').count();await canvas.click({position:{x:20,y:80}});expect(await page.locator('[data-kind=ap]').count()).toBe(n);
 const ap=page.locator('[data-kind=ap]').first(),id=await ap.getAttribute('data-id'),x=await ap.getAttribute('data-x');await ap.click();await page.getByLabel('点位X（米）').fill('10');await page.getByLabel('点位Y（米）').fill('6');await page.getByRole('button',{name:'应用位置',exact:true}).click();await expect(page.locator(`[data-id="${id}"]`)).toHaveAttribute('data-x','10');await page.getByRole('button',{name:'撤销',exact:true}).click();await expect(page.locator(`[data-id="${id}"]`)).toHaveAttribute('data-x',x!);
 await page.locator(`[data-id="${id}"]`).click();await page.getByRole('button',{name:'锁定点位',exact:true}).click();await page.getByRole('button',{name:'关闭属性',exact:true}).click();await page.getByRole('button',{name:'需求与数量',exact:true}).click();await page.getByLabel('AP数量').fill('0');await page.getByRole('button',{name:'应用配置',exact:true}).click();await expect(page.getByRole('alert')).toContainText('锁定');await expect(page.locator('[data-kind=ap]')).toHaveCount(n);
});
test('information layer hides visual clutter without removing priced or saved endpoints',async({page})=>{
 await expect(page.locator('[data-kind=information]')).toHaveCount(0);await page.getByRole('button',{name:'网口图层',exact:true}).click();await expect(page.locator('[data-kind=information]')).toHaveCount(20);await page.getByRole('button',{name:'网口图层',exact:true}).click();await expect(page.locator('[data-kind=information]')).toHaveCount(0);await page.getByRole('button',{name:'报价',exact:true}).click();await expect(page.locator('[data-bom-model=module-cat6]')).toContainText('20 套');
});
test('explicit drag is one engineering delta and undo, explicit add is not armed by panel navigation',async({page})=>{
 const ap=page.locator('[data-kind=ap]').first(),id=await ap.getAttribute('data-id'),before=Number(await ap.getAttribute('data-x'));
 await ap.click();await page.getByRole('button',{name:'拖动此点位',exact:true}).click();
 const handle=page.locator(`[data-id="${id}"] circle[r="14"]`),box=(await handle.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+22,box.y+box.height/2-12,{steps:5});await page.mouse.up();
 await expect(page.locator(`[data-id="${id}"]`)).not.toHaveAttribute('data-x',String(before));await page.getByRole('button',{name:'撤销',exact:true}).click();await expect(page.locator(`[data-id="${id}"]`)).toHaveAttribute('data-x',String(before));
 const n=await page.locator('[data-kind=ap]').count();await page.getByText('添加点位',{exact:true}).click();await page.getByRole('button',{name:'添加 AP',exact:true}).click();
 const svg=page.getByRole('img',{name:'点位与布线平面图'}),polygon=svg.locator('polygon').first();const room=(await polygon.boundingBox())!,canvas=(await svg.boundingBox())!;
 await svg.click({position:{x:room.x-canvas.x+room.width*.7,y:room.y-canvas.y+room.height*.7}});await expect(page.locator('[data-kind=ap]')).toHaveCount(n+1);await page.getByRole('button',{name:'撤销',exact:true}).click();await expect(page.locator('[data-kind=ap]')).toHaveCount(n);
});
test('returning from next-floor import keeps the acknowledged save revision',async({page})=>{
 await expect(page.getByLabel('保存状态')).toContainText('已保存');await page.getByRole('button',{name:'导入下一层',exact:true}).click();await page.getByRole('button',{name:'返回方案',exact:true}).click();await expect(page.getByLabel('保存状态')).toContainText('已保存');await expect(page.getByRole('alert')).toHaveCount(0);
});
test('the import screen routes system back to the existing plan instead of losing navigation',async({page})=>{
 await expect(page.getByLabel('保存状态')).toContainText('已保存');await page.getByRole('button',{name:'导入下一层',exact:true}).click();await expect(page.getByRole('button',{name:'返回方案',exact:true})).toBeVisible();await page.evaluate(()=>window.dispatchEvent(new Event('netatelier-back')));await expect(page.getByRole('img',{name:'点位与布线平面图'})).toBeVisible();
});
test('dragging an offset icon applies only the gesture delta, never its display leader offset',async({page})=>{
 const camera=page.locator('[data-kind=camera]').first(),id=await camera.getAttribute('data-id'),old={x:Number(await camera.getAttribute('data-x')),y:Number(await camera.getAttribute('data-y'))};await camera.click();await page.getByRole('button',{name:'拖动此点位',exact:true}).click();
 const handle=page.locator(`[data-id="${id}"] circle[r="14"]`),box=(await handle.boundingBox())!,scale=await page.getByRole('img',{name:'点位与布线平面图'}).locator('polygon').first().evaluate(node=>{const p=(node as SVGPolygonElement).points;return (p.getItem(1).x-p.getItem(0).x)/5;});
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+12,box.y+box.height/2+18,{steps:4});await page.mouse.up();
 expect(Number(await page.locator(`[data-id="${id}"]`).getAttribute('data-x'))).toBeCloseTo(old.x+12/scale,3);expect(Number(await page.locator(`[data-id="${id}"]`).getAttribute('data-y'))).toBeCloseTo(old.y+18/scale,3);
});
test('a manually locked shared path can be explicitly unlocked for later correction',async({page})=>{
 const segment=page.locator('[data-segment]').first();await segment.focus();await segment.press('Enter');await page.getByRole('button',{name:'应用路段移动',exact:true}).click();await segment.focus();await segment.press('Enter');await expect(page.getByRole('button',{name:'解锁关联线路',exact:true})).toBeVisible();await page.getByRole('button',{name:'解锁关联线路',exact:true}).click();await page.getByRole('button',{name:'应用路段移动',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);
});
