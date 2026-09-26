import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,statSync,realpathSync,mkdirSync,openSync,closeSync} from 'node:fs';
import {join,relative,isAbsolute,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {scanPublicContent} from './scan-public-content.mjs';
const git=(cwd,...a)=>execFileSync('git',['-C',cwd,...a],{encoding:'utf8'}).trim();
const digest=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
export function assertReleaseReady({cwd,configPath}){
 cwd=realpathSync(cwd);
 if(git(cwd,'status','--porcelain'))throw new Error('Release requires a clean committed source tree (dirty/untracked files found)');
 const commit=git(cwd,'rev-parse','HEAD');
 const privateFile=path=>{try{if(!isAbsolute(path))throw new Error();const resolved=realpathSync(path),rel=relative(cwd,resolved),info=statSync(resolved);if((!rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))&&!isAbsolute(rel))||!info.isFile()||(info.mode&0o077)!==0)throw new Error();return resolved;}catch{throw new Error('Signing configuration and key/password files must exist outside the repository with owner-only permissions');}};
 let config;try{config=JSON.parse(readFileSync(privateFile(configPath),'utf8'));}catch(e){throw new Error('Invalid signing configuration: '+e.message);}
 if(!config||!['keystore','alias','storePasswordFile','keyPasswordFile'].every(k=>typeof config[k]==='string'&&config[k]))throw new Error('Incomplete signing configuration');
 for(const key of ['keystore','storePasswordFile','keyPasswordFile'])config[key]=privateFile(config[key]);
 if(!/^[A-Za-z0-9_.-]+$/.test(config.alias))throw new Error('Invalid signing alias');
 const findings=scanPublicContent({cwd,history:true});if(findings.length)throw new Error('Public-content safety check failed: '+JSON.stringify(findings));
 return {commit,config};
}
export function assertApkIdentity({badging,permissions,manifestTree},expected){
 const packageName=badging.match(/package: name='([^']+)'/)?.[1],versionName=badging.match(/versionName='([^']+)'/)?.[1],versionCode=Number(badging.match(/versionCode='(\d+)'/)?.[1]),minSdk=Number(badging.match(/sdkVersion:'(\d+)'/)?.[1]);
 if(packageName!==expected.packageName||versionName!==expected.versionName||versionCode!==expected.versionCode||minSdk!==expected.minSdk)throw new Error('APK package/version/minSdk identity mismatch');
 if(/android:debuggable[^\n]*=(?:\(type 0x12\))?0x(?:ffffffff|1)\b/.test(manifestTree)||/application-debuggable/.test(badging))throw new Error('Release APK must not be debuggable');
 if(!/android:allowBackup[^\n]*=\(type 0x12\)0x0\b/.test(manifestTree))throw new Error('Release APK must explicitly disable automatic backup');
 const used=[...permissions.matchAll(/uses-permission(?:-sdk-\d+)?: name='([^']+)'/g)].map(m=>m[1]);
 if(used.some(p=>p!==expected.packageName+'.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'))throw new Error('Unexpected release permission: '+used.join(','));
 return {packageName,versionName,versionCode,minSdk,permissions:used,debuggable:false,allowBackup:false};
}
export function verifyArtifact(path,sha256){if(!/^[a-f0-9]{64}$/.test(sha256)||digest(path)!==sha256)throw new Error('APK hash/digest mismatch');}
export function buildRelease({cwd,configPath}){
 const {commit,config}=assertReleaseReady({cwd,configPath}),sdk=process.env.ANDROID_HOME,jdk=process.env.JAVA_HOME;
 if(!sdk||!jdk)throw new Error('Set ANDROID_HOME and JAVA_HOME (JDK21) explicitly');
 const version=JSON.parse(readFileSync(join(cwd,'package.json'),'utf8')).version;if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Expected plain semantic version');
 const tools=join(sdk,'build-tools','36.0.0'),out=join(cwd,'artifacts','releases',`${version}-${commit.slice(0,12)}-${Date.now()}`);mkdirSync(out,{recursive:true});
 const log=join(out,'build.log'),fd=openSync(log,'a'),env={...process.env,PATH:join(jdk,'bin')+':'+process.env.PATH};
 const run=(command,args,workdir=cwd)=>execFileSync(command,args,{cwd:workdir,env,stdio:['ignore',fd,fd],timeout:15*60*1000});
 try{
  run('npm',['run','build']);run(join(cwd,'node_modules','.bin','cap'),['sync','android']);run('./gradlew',['--no-daemon',':app:assembleRelease'],join(cwd,'android'));
  const aligned=join(out,'aligned-unsigned.apk'),apkName=`netatelier-${version}-verification.apk`,apk=join(out,apkName);
  run(join(tools,'zipalign'),['-P','16','4',join(cwd,'android/app/build/outputs/apk/release/app-release-unsigned.apk'),aligned]);
  run(join(tools,'apksigner'),['sign','--ks',config.keystore,'--ks-key-alias',config.alias,'--ks-pass','file:'+config.storePasswordFile,'--key-pass','file:'+config.keyPasswordFile,'--v4-signing-enabled','false','--out',apk,aligned]);
  const command=(name,args)=>execFileSync(join(tools,name),args,{cwd,env,encoding:'utf8',maxBuffer:4*1024*1024});
  const signature=command('apksigner',['verify','--verbose','--print-certs',apk]);writeFileSync(join(out,'signature.txt'),signature);
  command('zipalign',['-c','-P','16','4',apk]);
  const identity=assertApkIdentity({badging:command('aapt',['dump','badging',apk]),permissions:command('aapt',['dump','permissions',apk]),manifestTree:command('aapt',['dump','xmltree',apk,'AndroidManifest.xml'])},{packageName:'io.github.rewqasd.netatelier',versionName:version,versionCode:1,minSdk:26});
  if(git(cwd,'status','--porcelain')||git(cwd,'rev-parse','HEAD')!==commit)throw new Error('Source changed during release build');
  const certificateSha256=signature.match(/certificate SHA-256 digest: ([a-f0-9]{64})/)?.[1];if(!certificateSha256)throw new Error('Verified certificate digest missing');
  const manifest={...identity,sourceCommit:commit,sourceTree:git(cwd,'rev-parse','HEAD^{tree}'),apk:apkName,bytes:statSync(apk).size,sha256:digest(apk),certificateSha256,builtAt:new Date().toISOString(),purpose:'offline verification prerelease; not a construction design certification'};
  verifyArtifact(apk,manifest.sha256);writeFileSync(join(out,'release-manifest.json'),JSON.stringify(manifest,null,2));writeFileSync(join(out,'SHA256SUMS'),`${manifest.sha256}  ${apkName}\n`);return {out,manifest};
 }finally{closeSync(fd);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const configPath=process.argv[2];if(!configPath)throw new Error('Usage: node scripts/release.mjs /absolute/private/signing.json');console.log(JSON.stringify(buildRelease({cwd:process.cwd(),configPath:resolve(configPath)}),null,2));}
