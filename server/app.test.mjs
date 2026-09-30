import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app.mjs';

test('session, tenant ownership, revision, roles and persisted projects', async () => {
 const dbPath=join(mkdtempSync(join(tmpdir(),'team-test-')),'db.sqlite');
 const app=createApp({dbPath,allowedOrigin:'http://localhost:4318',vision:{recognize:async()=>({width:100,height:100,rooms:[],walls:[],warnings:[]})}});
 await app.store.createUser('a@example.test','a-secure-test-password');
 await app.store.createUser('b@example.test','b-secure-test-password');
 await app.store.createUser('c@example.test','c-secure-test-password');
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${app.server.address().port}`;
 async function req(path,method='GET',body,cookie,tenant,origin='http://localhost:4318') { const res=await fetch(base+path,{method,headers:{...(!['GET','HEAD'].includes(method)?{'Content-Type':'application/json'}:{}),...(origin?{Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...(tenant?{'X-Tenant-Id':tenant}:{})},body:['GET','HEAD'].includes(method)?undefined:JSON.stringify(body??{})});return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]}; }
 try {
 assert.equal((await req('/api/login','POST',{email:'a@example.test',password:'bad'})).status,401);
 const a=(await req('/api/login','POST',{email:'a@example.test',password:'a-secure-test-password'})).cookie;
 const b=(await req('/api/login','POST',{email:'b@example.test',password:'b-secure-test-password'})).cookie;
 const ta=(await req('/api/tenants','POST',{name:'A'},a)).body.tenant.id;
 const tb=(await req('/api/tenants','POST',{name:'B'},b)).body.tenant.id;
 const p=(await req('/api/projects','POST',{name:'Plan',data:{rooms:[]}},a,ta)).body.project;
 assert.equal((await req(`/api/projects/${p.id}`,'GET',undefined,b,tb)).status,404);
 assert.equal((await req('/api/projects','GET',undefined,b,ta)).status,403);
 assert.equal((await req(`/api/projects/${p.id}`,'PUT',{name:'Edit',expectedRevision:2},a,ta)).status,409);
 assert.equal((await req(`/api/projects/${p.id}`,'PUT',{name:'Edit',expectedRevision:1},a,ta)).body.project.revision,2);
 assert.equal((await req('/api/projects','POST',{name:'Forged',tenantId:tb},a,ta)).status,400);
 assert.equal((await req('/api/projects','POST',{name:'Invalid draft',data:{draft:{width:1}}},a,ta)).status,400);
 assert.equal((await req('/api/projects','POST',{name:'Bad'},a,ta,null)).status,403);
 assert.equal((await req('/api/projects','POST',{name:''},a,ta)).status,400);
 assert.equal((await req('/api/members','POST',{email:'b@example.test',role:'owner'},a,ta)).status,403);
 const job=(await req(`/api/projects/${p.id}/recognitions`,'POST',{mime:'image/png',imageBase64:'YWJj',consent:true},a,ta)).body.recognition;
 assert.equal((await req(`/api/projects/${p.id}/recognitions/${job.id}`,'GET',undefined,b,tb)).status,404);
 assert.equal((await req('/api/members','POST',{email:'b@example.test',role:'member'},a,ta)).status,201);
 assert.equal((await req('/api/members','POST',{email:'c@example.test',role:'admin'},b,ta)).status,403);
 assert.equal((await req('/api/members','POST',{email:'c@example.test',role:'admin'},a,ta)).status,201);
 const c=(await req('/api/login','POST',{email:'c@example.test',password:'c-secure-test-password'})).cookie;
 assert.equal((await req('/api/members','POST',{email:'a@example.test',role:'admin'},c,ta)).status,403);
 assert.equal((await req(`/api/projects/${p.id}`,'PUT',{name:'Member edit',expectedRevision:2},b,ta)).status,200);
 const second=(await req('/api/projects','POST',{name:'Other'},a,ta)).body.project;
 assert.equal((await req(`/api/projects/${second.id}/recognitions/${job.id}`,'GET',undefined,a,ta)).status,404);
 assert.equal((await req(`/api/projects/${second.id}`,'DELETE',undefined,b,tb)).status,404);
 assert.equal((await req(`/api/projects/${second.id}`,'DELETE',undefined,a,ta)).status,200);
 const aid=(await req('/api/me','GET',undefined,a)).body.user.id;
 assert.equal((await req(`/api/members/${aid}`,'DELETE',undefined,a,ta)).status,409);
 assert.equal((await req('/api/logout','POST',{},a)).status,200);
 assert.equal((await req('/api/me','GET',undefined,a)).status,401);
 } finally {app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.store.close();}
 const reopened=createApp({dbPath,allowedOrigin:'http://localhost:4318'});assert.equal(reopened.store.db.prepare('SELECT count(*) AS n FROM projects').get().n,1);reopened.store.close();
});

test('sessions expire and loopback origin and listen rules are enforced', async()=>{
 let time=1000;const app=createApp({dbPath:':memory:',allowedOrigin:'http://localhost:4318',now:()=>time,sessionTtlMs:10});
 await app.store.createUser('expiry@example.test','synthetic-test-password');
 assert.throws(()=>app.server.listen(0,'0.0.0.0'),/loopback/);
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 try{const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:'http://localhost:4318','Content-Type':'application/json'},body:JSON.stringify({email:'expiry@example.test',password:'synthetic-test-password'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);time+=11;assert.equal((await fetch(base+'/api/me',{headers:{Cookie:cookie}})).status,401);assert.equal((await fetch(base+'/api/login',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body:'{}'})).status,403);assert.equal((await fetch(base+'/api/login',{method:'POST',headers:{Origin:'http://localhost:4318','Content-Type':'text/plain'},body:'{}'})).status,415);assert.equal((await fetch(base+'/api/health')).status,200);}finally{app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.store.close();}
 assert.throws(()=>createApp({dbPath:':memory:',allowedOrigin:'https://evil.test'}),/loopback/);
});

test('recognition limits reject concurrent work before adapter and recover after failure',async()=>{
 let calls=0,time=1000;const pending=[];const app=createApp({dbPath:':memory:',now:()=>time,vision:{recognize:()=>{calls++;return new Promise((resolve,reject)=>pending.push({resolve,reject}));}}});
 for(const email of ['one@test.test','two@test.test','three@test.test'])await app.store.createUser(email,'synthetic-long-password');
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 const req=(path,body,cookie,tenant)=>fetch(base+path,{method:'POST',headers:{Origin:'http://localhost:4318','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(tenant?{'X-Tenant-Id':tenant}:{})},body:JSON.stringify(body)});
 try{
 const identities=[];for(const email of ['one@test.test','two@test.test','three@test.test']){const login=await req('/api/login',{email,password:'synthetic-long-password'});const cookie=login.headers.get('set-cookie').split(';')[0];const tenant=(await(await req('/api/tenants',{name:email},cookie)).json()).tenant.id;const project=(await(await req('/api/projects',{name:'Plan'},cookie,tenant)).json()).project.id;identities.push({cookie,tenant,project});}
 const recognize=({cookie,tenant,project})=>req(`/api/projects/${project}/recognitions`,{mime:'image/png',imageBase64:'YWJj',consent:true},cookie,tenant);
 const first=recognize(identities[0]);while(calls<1)await new Promise(r=>setTimeout(r,5));
 assert.equal(await Promise.race([recognize(identities[0]).then(r=>r.status),new Promise(r=>setTimeout(()=>r('adapter entered instead of rejecting'),100))]),429);assert.equal(calls,1);
 const second=recognize(identities[1]);while(calls<2)await new Promise(r=>setTimeout(r,5));
 assert.equal((await recognize(identities[2])).status,429);assert.equal(calls,2);
 pending[0].reject(new Error('synthetic failure'));assert.equal((await first).status,503);
 const third=recognize(identities[2]);while(calls<3)await new Promise(r=>setTimeout(r,5));
 const draft={width:100,height:100,rooms:[],walls:[],warnings:[]};pending[1].resolve(draft);pending[2].resolve(draft);assert.equal((await second).status,201);assert.equal((await third).status,201);
 for(let i=0;i<4;i++){const previous=calls;const work=recognize(identities[0]);while(calls===previous)await new Promise(r=>setTimeout(r,5));pending.at(-1).resolve(draft);assert.equal((await work).status,201);}
 const prior=calls;assert.equal((await recognize(identities[0])).status,429);assert.equal(calls,prior);time+=60001;const renewed=recognize(identities[0]);while(calls===prior)await new Promise(r=>setTimeout(r,5));pending.at(-1).resolve(draft);assert.equal((await renewed).status,201);
 }finally{for(const job of pending)job.reject(new Error('cleanup'));app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.store.close();}
});

test('configured endpoint exposes readiness and rejects oversized synthetic image before provider',async()=>{
 const {createVisionAdapter}=await import('./vision.mjs');let providerCalls=0;
 const app=createApp({dbPath:':memory:',allowedOrigin:'http://localhost:4318',vision:createVisionAdapter({enabled:true,apiKey:'synthetic-only'},{fetchImpl:async()=>{providerCalls++;throw Error('must not call')}})});
 await app.store.createUser('readiness@example.test','synthetic-test-password');await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${app.server.address().port}`;
 async function post(path,body,cookie,tenant){return fetch(base+path,{method:'POST',headers:{Origin:'http://localhost:4318','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(tenant?{'X-Tenant-Id':tenant}:{})},body:JSON.stringify(body)})}
 try{
 assert.equal((await (await fetch(base+'/api/health')).json()).vision.available,true);
 const login=await post('/api/login',{email:'readiness@example.test',password:'synthetic-test-password'});const cookie=login.headers.get('set-cookie').split(';')[0];
 const tenant=(await (await post('/api/tenants',{name:'Synthetic readiness'},cookie)).json()).tenant.id;
 const project=(await (await post('/api/projects',{name:'Synthetic'},cookie,tenant)).json()).project.id;
 const image=Buffer.from('89504e470d0a1a0a0000000d4948445200000961000000010806000000','hex');
 const rejected=await post(`/api/projects/${project}/recognitions`,{mime:'image/png',imageBase64:image.toString('base64'),consent:true},cookie,tenant);
 assert.equal(rejected.status,400);assert.equal((await rejected.json()).error,'VISION_IMAGE_INVALID');assert.equal(providerCalls,0);
 assert.equal(app.store.db.prepare('SELECT count(*) n FROM recognitions').get().n,0);
 }finally{app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.store.close()}
});
