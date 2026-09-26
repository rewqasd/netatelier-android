import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export function scanPublicContent({cwd,history=true}){
 const git=(...a)=>execFileSync('git',['-C',cwd,...a],{encoding:'utf8',maxBuffer:32*1024*1024});
 const findings=[],seen=new Set();
 const report=(path,reason)=>{const key=path+':'+reason;if(!seen.has(key)){seen.add(key);findings.push({path,reason});}};
 const check=(path,bytes)=>{
  if(/(?:^|\/)(?:\.env(?:\..*)?|local\.properties)$|\.(?:jks|keystore|p12|pem|apk|aab|netatelier)$/i.test(path))report(path,'private or generated file must not be published');
  if(bytes.length>8*1024*1024)report(path,'oversized tracked file requires review');
  const text=bytes.toString('utf8');
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}|\bAKIA[A-Z0-9]{16}\b/.test(text))report(path,'credential-like content');
  if(/\/(?:Users|home)\/[A-Za-z0-9._-]+\//.test(text))report(path,'personal absolute private path');
 };
 for(const path of git('ls-files','-z').split('\0').filter(Boolean)){const full=join(cwd,path);try{if(lstatSync(full).isSymbolicLink()){report(path,'tracked symbolic link requires target review');continue;}check(path,readFileSync(full));}catch{report(path,'tracked file missing or unreadable');}}
 if(history){
  for(const line of git('log','--format=%h %ae %ce','HEAD').trim().split('\n'))if(/@[^\s]+\.lan\b|@localhost\b/.test(line))report('git history','private machine identity in '+line.split(' ')[0]);
  for(const entry of git('rev-list','--objects','HEAD').trim().split('\n')){const at=entry.indexOf(' ');if(at<0)continue;const oid=entry.slice(0,at),path=entry.slice(at+1);if(git('cat-file','-t',oid).trim()!=='blob')continue;check(`history/${path}`,execFileSync('git',['-C',cwd,'cat-file','blob',oid],{maxBuffer:32*1024*1024}));}
 }
 return findings;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const findings=scanPublicContent({cwd:process.cwd(),history:!process.argv.includes('--worktree-only')});console.log(JSON.stringify({scope:process.argv.includes('--worktree-only')?'tracked worktree only; NOT publication history approval':'tracked worktree and HEAD ancestry',findings},null,2));if(findings.length)process.exitCode=1;}
