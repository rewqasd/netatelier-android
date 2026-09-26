import {spawnSync,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export function runChecks({cwd,out,checks}){
 if(!checks.length)throw new Error('No verification commands provided');mkdirSync(out,{recursive:true});let commit=null;try{commit=execFileSync('git',['-C',cwd,'rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
 const result={startedAt:new Date().toISOString(),commit,passed:false,checks:[]};
 for(const [i,check] of checks.entries()){
  const started=Date.now(),run=spawnSync(check.command,check.args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024,timeout:15*60*1000}),status=run.status??1,log=`${String(i+1).padStart(2,'0')}-${check.name}.log`;
  writeFileSync(join(out,log),(run.stdout??'')+(run.stderr??'')+(run.error?String(run.error):''));result.checks.push({name:check.name,command:check.command,args:check.args,status,milliseconds:Date.now()-started,log});
  if(status!==0)break;
 }
 result.passed=result.checks.length===checks.length&&result.checks.every(c=>c.status===0);result.finishedAt=new Date().toISOString();writeFileSync(join(out,'result.json'),JSON.stringify(result,null,2));return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const android=process.argv.includes('--android');if(android&&!process.env.ANDROID_SERIAL?.startsWith('emulator-'))throw new Error('--android requires an explicit test emulator ANDROID_SERIAL');
 const checks=[['unit','test'],['types','run','typecheck'],['web','run','test:web'],['build','run','build']].map(([name,...args])=>({name,command:'npm',args}));
 if(android)checks.push({name:'native',command:'bash',args:['scripts/android-env.sh','test']});
 const out=`artifacts/verification/run-${Date.now()}`,result=runChecks({cwd:process.cwd(),out,checks});console.log(JSON.stringify({out,scope:android?'unit/type/web/build/native; actual-device acceptance is separate':'desktop-only; NOT Android acceptance',...result},null,2));if(!result.passed)process.exitCode=1;
}
