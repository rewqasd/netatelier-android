import {test,expect} from '@playwright/test';
test('topology uses actual device IDs and returns to the same physical point',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'1000㎡ 健身房',exact:true}).click();const ap=page.locator('[data-kind=ap]').first(),id=await ap.getAttribute('data-id'),n=await page.locator('[data-kind=ap]').count();
 await page.getByRole('button',{name:'拓扑',exact:true}).click();await expect(page.locator('[data-topology-kind=ap]')).toHaveCount(n);await page.locator(`[data-topology-device="${id}"]`).click();await expect(page.locator(`[data-id="${id}"]`)).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('heading',{name:'点位属性'})).toBeVisible();
});
