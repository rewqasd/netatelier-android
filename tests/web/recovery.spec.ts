import {test,expect} from '@playwright/test';
import {adversarialRoutes} from '../helpers/adversarial-projects';
test('bad previously selected engineering data returns home without deleting projects or reopening a blank editor',async({page})=>{
 const p=adversarialRoutes('length'),raw=JSON.stringify(p);
 await page.goto('/');await page.evaluate(({id,raw})=>{localStorage.setItem(`netatelier:project:${id}`,raw);localStorage.setItem('netatelier:last',id);},{id:p.id,raw});await page.reload();
 await expect(page.getByRole('button',{name:'400㎡ 餐厅',exact:true})).toBeVisible();await expect(page.getByRole('alert')).toContainText(/路径总长|计算上限/);
 expect(await page.evaluate(id=>localStorage.getItem(`netatelier:project:${id}`),p.id)).toBe(raw);expect(await page.evaluate(()=>localStorage.getItem('netatelier:last'))).toBeNull();
 await page.getByRole('button',{name:'400㎡ 餐厅',exact:true}).click();await expect(page.getByRole('img',{name:'点位与布线平面图'})).toBeVisible();
});
test('an unexpected editor render failure has a home escape and preserves the last saved project',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'300㎡ 办公企业',exact:true}).click();await expect(page.getByLabel('保存状态')).toContainText('已保存');
 const saved=await page.evaluate(()=>{const id=localStorage.getItem('netatelier:last')!;return {id,raw:localStorage.getItem(`netatelier:project:${id}`)};});
 // Fault injection at the rendering boundary, not a fake success path.
 // A reused Vite server appends its HMR timestamp. Match the module pathname,
 // not an exact URL which can silently skip the intended fault injection.
 let injected=false;
 await page.route(url=>url.pathname==='/src/ui/PlannerPage.tsx',route=>{injected=true;return route.fulfill({contentType:'application/javascript',body:'export function PlannerPage(){throw new Error("injected renderer failure")}'});});await page.reload();
 expect(injected).toBe(true);
 await expect(page.getByRole('alert')).toContainText('原项目已保留');await page.getByRole('button',{name:'返回首页',exact:true}).click();await expect(page.getByRole('button',{name:'300㎡ 办公企业',exact:true})).toBeVisible();
 expect(await page.evaluate(id=>localStorage.getItem(`netatelier:project:${id}`),saved.id)).toBe(saved.raw);expect(await page.evaluate(()=>localStorage.getItem('netatelier:last'))).toBeNull();
});
