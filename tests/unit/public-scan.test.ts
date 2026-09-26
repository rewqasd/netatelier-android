import {it,expect} from 'vitest';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {scanPublicContent} from '../../scripts/scan-public-content.mjs';
function repo(run:(root:string,git:(...a:string[])=>string)=>void){const root=mkdtempSync(join(tmpdir(),'netatelier-scan-'));const git=(...a:string[])=>execFileSync('git',['-C',root,...a],{encoding:'utf8'});try{git('init','-q');git('config','user.name','Test');git('config','user.email','test@users.noreply.github.com');run(root,git);}finally{rmSync(root,{recursive:true,force:true});}}
it('rejects a tracked credential and private source path without mutating either',()=>repo((root,git)=>{
 const secret='gh'+'p_'+'x'.repeat(36),path=['','Users','private-person','project'].join('/');writeFileSync(join(root,'config.txt'),secret+'\n'+path);writeFileSync(join(root,'release.jks'),'key material');git('add','.');
 const issues=scanPublicContent({cwd:root,history:false});expect(issues.some(i=>i.reason.includes('credential'))).toBe(true);expect(issues.some(i=>i.reason.includes('private path'))).toBe(true);expect(issues.some(i=>i.path==='release.jks')).toBe(true);expect(git('status','--porcelain')).toContain('A  config.txt');
}));
it('finds credentials removed from the current tree but retained in publishable history',()=>repo((root,git)=>{
 writeFileSync(join(root,'old.txt'),'gh'+'p_'+'y'.repeat(36));git('add','.');git('commit','-qm','old');writeFileSync(join(root,'old.txt'),'now clean');git('add','.');git('commit','-qm','clean');
 expect(scanPublicContent({cwd:root,history:false})).toEqual([]);expect(scanPublicContent({cwd:root,history:true}).some(i=>i.reason.includes('credential'))).toBe(true);
}));
it('accepts a clean synthetic source tree and public noreply history',()=>repo((root,git)=>{
 writeFileSync(join(root,'README.md'),'Synthetic offline planner. No client plans.');git('add','.');git('commit','-qm','clean');expect(scanPublicContent({cwd:root,history:true})).toEqual([]);
}));
