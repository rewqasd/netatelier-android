import {test,expect} from '@playwright/test';
import {quoteProject} from '../helpers/catalog';
test('endpoint inspector repairs a disconnected locked route after reopen',async({page})=>{
 const p=quoteProject(1),f=p.floors[0];f.cables[0].locked=true;f.cables[0].status='disconnected';f.cables[0].pointsM=[];
 await page.goto('/');await page.evaluate(p=>{localStorage.setItem(`netatelier:project:${p.id}`,JSON.stringify(p));localStorage.setItem('netatelier:last',p.id)},p);await page.reload();
 await page.locator('[data-id=ap0]').click();await page.getByRole('button',{name:'解锁关联线路并重算',exact:true}).click();await expect(page.getByLabel('保存状态')).toContainText('已保存');
 const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem(`netatelier:project:${id}`)!),p.id);expect(saved.floors[0].cables[0].locked).toBe(false);expect(saved.floors[0].cables[0].pointsM.length).toBeGreaterThan(1);
 await page.reload();await expect(page.locator('[data-segment]')).not.toHaveCount(0);
});
test('manual camera inspector applies a viewing target and persists it without moving the symbol',async({page})=>{
 const p=quoteProject(0,1),f=p.floors[0];f.targets=[{id:'aim',roomId:'r1',at:{x:8,y:5},kind:'public',weight:1,confirmed:true}];
 await page.goto('/');await page.evaluate(p=>{localStorage.setItem(`netatelier:project:${p.id}`,JSON.stringify(p));localStorage.setItem('netatelier:last',p.id)},p);await page.reload();
 await page.locator('[data-id=camera0]').click();await page.getByLabel('主要监控目标').selectOption('aim');await page.getByRole('button',{name:'应用监控目标',exact:true}).click();await expect(page.getByLabel('保存状态')).toContainText('已保存');
 const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem(`netatelier:project:${id}`)!),p.id);expect(saved.floors[0].devices[1].directionRad).toBe(0);expect(saved.floors[0].devices[1].positionM).toEqual({x:5,y:5});expect(saved.floors[0].devices[1].targetIds).toContain('aim');
 await page.reload();await page.locator('[data-id=camera0]').click();await expect(page.getByText('监控目标：营业区域',{exact:false})).toBeVisible();
});
