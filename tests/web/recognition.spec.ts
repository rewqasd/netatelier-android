import {test,expect} from '@playwright/test';
test('real worker geometry, explicit correction and metric application',async({page})=>{
  await page.goto('/tests/fixtures/recognition/editor.html');
  await expect(page.getByRole('heading',{name:'图纸校正'})).toBeVisible();
  await expect(page.getByLabel('房间名称').first()).toHaveValue('厨房101');
  await expect(page.getByLabel('房间名称')).toHaveCount(2);
  await page.getByLabel('房间名称').first().fill('员工更衣室');
  await page.getByLabel('房间用途').first().selectOption('changing');
  for(const checkbox of await page.getByLabel('确认此房间').all())await checkbox.check();
  await page.locator('summary').filter({hasText:/^墙线 ·/}).click();
  await page.getByRole('button',{name:'确认当前墙线'}).click();
  await page.getByLabel('标尺终点X').fill('200');await page.getByLabel('已知长度（米）').fill('10');
  await page.getByRole('button',{name:'应用长度标尺'}).click();
  await page.getByRole('button',{name:'标记机柜',exact:true}).click();
  const svg=page.getByRole('img',{name:'原图与待确认几何'});const box=(await svg.boundingBox())!;
  await svg.click({position:{x:box.width*.25,y:box.height*.4}});
  await page.getByRole('button',{name:'标记宽带入口',exact:true}).click();await svg.click({position:{x:box.width*.15,y:box.height*.5}});
  await page.getByRole('button',{name:'确认并生成楼层'}).click();
  await expect(page.getByLabel('已应用楼层')).toContainText('changing');
  const floor=JSON.parse(await page.getByLabel('已应用楼层').innerText());
  expect(floor.calibration.metersPerPixel).toBe(.05);expect(floor.devices).toHaveLength(2);
  expect(floor.rooms[0].name).toBe('员工更衣室');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for(const kind of ['split','elbow','angled'])test(`inspect non-template overlay: ${kind}`,async({page})=>{
  await page.goto(`/tests/fixtures/recognition/editor.html?kind=${kind}`);
  await expect(page.getByLabel('房间名称')).toHaveCount(kind==='elbow'?1:2);
  await page.getByRole('img',{name:'原图与待确认几何'}).screenshot({path:`artifacts/recognition/${kind}-overlay.png`});
});
test('blank image is not turned into a template and a cancelled run cannot apply',async({page})=>{
  await page.goto('/tests/fixtures/recognition/editor.html?kind=blank');
  await expect(page.getByText('没有恢复出封闭房间',{exact:false})).toBeVisible();
  await expect(page.getByLabel('房间名称')).toHaveCount(0);
  await page.getByRole('button',{name:'确认并生成楼层'}).click();
  await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByLabel('已应用楼层')).toBeEmpty();
  await page.getByRole('button',{name:'返回导入'}).click();await expect(page.getByLabel('已应用楼层')).toHaveText('cancelled');
});
test('actual worker cancellation is bounded and a following request succeeds',async({page})=>{
  await page.goto('/tests/fixtures/recognition/editor.html');
  const result=await page.evaluate(async()=>{
    const {recognizeDocument}=await import('/src/recognition/recognize-document.ts');
    const {drawingFixture}=await import('/tests/helpers/drawings.ts');
    const controller=new AbortController();
    const cancelled=recognizeDocument(drawingFixture(),controller.signal).then(()=>false,error=>error.name==='AbortError');
    controller.abort();
    return {cancelled:await cancelled,rooms:(await recognizeDocument(drawingFixture('elbow'))).roomsPx.length};
  });
  expect(result).toEqual({cancelled:true,rooms:1});
});
test('large original drawings keep correction numbers readable on a phone',async({page})=>{
  await page.goto('/tests/fixtures/recognition/editor.html?large=1');
  await expect(page.getByLabel('房间名称')).toHaveCount(2);
  const sizes=await page.locator('.correction-viewport text').evaluateAll(nodes=>nodes.map(node=>{
    const text=node as SVGTextElement;return parseFloat(getComputedStyle(text).fontSize)*text.getScreenCTM()!.a;
  }));
  expect(sizes.every(size=>size>=11)).toBe(true);
});
