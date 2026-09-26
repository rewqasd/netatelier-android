import {test,expect} from '@playwright/test';
test('third-party notices remain readable without external requests and returning preserves the home',async({page,baseURL})=>{
 const external:string[]=[];page.on('request',r=>{if(!r.url().startsWith(baseURL+'/')&&!r.url().startsWith('data:'))external.push(r.url());});
 await page.goto('/');await page.getByRole('button',{name:'隐私与第三方声明',exact:true}).click();
 await expect(page.getByRole('heading',{name:'隐私与第三方声明',exact:true})).toBeVisible();
 await page.getByLabel('声明文件').selectOption('npm/react-19.3.0/LICENSE');
 await expect(page.getByLabel('声明原文')).toContainText('MIT License');
 await expect(page.getByLabel('声明原文')).toContainText('Meta Platforms');
 await page.getByLabel('声明文件').selectOption('android/com.google.android.gms--play-services-mlkit-text-recognition-chinese--16.0.1/third_party_licenses.txt');
 await expect(page.getByLabel('声明原文')).toContainText('Apache License');
 await page.getByRole('button',{name:'返回首页',exact:true}).click();
 await expect(page.getByRole('button',{name:'400㎡ 餐厅',exact:true})).toBeVisible();expect(external).toEqual([]);
});
