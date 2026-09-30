import {test,expect} from '@playwright/test';
for(const control of ['页面','旋转'])test(`changing ${control} invalidates previous OCR before correction`,async({page})=>{
 await page.goto('/tests/fixtures/recognition/import-state.html');
 await page.getByRole('button',{name:'导入平面图'}).click();
 await page.getByRole('button',{name:'识别这一页'}).click();
 await expect(page.getByRole('button',{name:'进入图纸校正'})).toBeVisible();
 await page.getByLabel(control,{exact:true}).selectOption(control==='页面'?'1':'90');
 await expect(page.getByRole('button',{name:'进入图纸校正'})).toHaveCount(0);
 await page.getByRole('button',{name:'识别这一页'}).click();
 await expect(page.getByRole('button',{name:'进入图纸校正'})).toBeVisible();
});
test('failed retry cannot apply an earlier OCR result',async({page})=>{
 await page.goto('/tests/fixtures/recognition/import-state.html?failRetry=1');
 await page.getByRole('button',{name:'导入平面图'}).click();
 await page.getByRole('button',{name:'识别这一页'}).click();
 await expect(page.getByRole('button',{name:'进入图纸校正'})).toBeVisible();
 await page.getByRole('button',{name:'识别这一页'}).click();
 await expect(page.getByRole('alert')).toContainText('synthetic retry failure');
 await expect(page.getByRole('button',{name:'进入图纸校正'})).toHaveCount(0);
 await page.getByRole('button',{name:'识别这一页'}).click();
 await expect(page.getByRole('button',{name:'进入图纸校正'})).toBeVisible();
});
