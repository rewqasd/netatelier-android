import {test,expect} from '@playwright/test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Real local app/store/session/API; only the external model is replaced by a synthetic response.
test('real private server account, team, project, correction, persistence and logout',async({page})=>{
 const {createApp}=await import('../../server/app.mjs');
 const port=Number(process.env.NETATELIER_TEAM_LIVE_PORT??4318);
 const dir=mkdtempSync(join(tmpdir(),'netatelier-ui-live-'));
 const {createVisionAdapter}=await import('../../server/vision.mjs');
 let modelCalls=0;
 const vision=createVisionAdapter({enabled:true,apiKey:'synthetic-test-key'},{fetchImpl:async()=>{modelCalls++;return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({width:100,height:100,rooms:[{name:'合成房间',use:'office',polygon:[{x:1,y:1},{x:80,y:1},{x:80,y:80}]}],walls:[],warnings:['合成测试待确认']})}}]}));}});
 const app=createApp({dbPath:join(dir,'team.sqlite'),allowedOrigin:`http://127.0.0.1:${port}`,vision});
 await app.store.createUser('synthetic@example.test','synthetic-ui-test-password');
 await new Promise<void>(resolve=>app.server.listen(port,'127.0.0.1',resolve));
 try{
  await page.goto(`http://127.0.0.1:${port}`);
  await page.getByLabel('邮箱',{exact:true}).fill('synthetic@example.test');
  await page.getByLabel('密码',{exact:true}).fill('synthetic-ui-test-password');
  await page.getByRole('button',{name:'登录',exact:true}).click();
  await page.getByLabel('新团队名称').fill('合成内测团队');
  await page.getByRole('button',{name:'创建团队'}).click();
  await page.getByLabel('项目名称',{exact:true}).fill('合成项目');
  await page.getByRole('button',{name:'创建项目'}).click();
  await expect(page.getByLabel('编辑项目名称')).toHaveValue('合成项目');
  await page.getByLabel('图纸文件').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAA5klEQVR4nO3SsREAIAwDMWD/ncMK+V6qXf35zsxh5y13iNV4ViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYgViBWIFYg1tn7z/EDxbGcl84AAAAASUVORK5CYII=','base64')});
  await expect(page.getByRole('button',{name:'识别图纸',exact:true})).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'识别图纸',exact:true}).click();
  await expect(page.getByLabel('房间 1 名称')).toHaveValue('合成房间');
  expect(modelCalls).toBe(1);
  await page.getByLabel('房间 1 名称').fill('人工校正合成房间');
  await page.getByLabel('编辑项目名称').fill('已保存合成项目');
  await page.getByRole('button',{name:'保存人工校正'}).click();
  await expect(page.getByText('版本 3',{exact:true})).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name:'已保存合成项目',exact:true}).click();
  await expect(page.getByLabel('编辑项目名称')).toHaveValue('已保存合成项目');
  await expect(page.getByLabel('房间 1 名称')).toHaveValue('人工校正合成房间');
  await page.getByRole('button',{name:'退出登录'}).click();
  await expect(page.getByRole('heading',{name:'登录团队账号'})).toBeVisible();
  const result=await page.request.get(`http://127.0.0.1:${port}/api/me`);expect(result.status()).toBe(401);
 }finally{app.server.closeAllConnections();await new Promise<void>(resolve=>app.server.close(resolve));app.store.close();rmSync(dir,{recursive:true,force:true});}
});
