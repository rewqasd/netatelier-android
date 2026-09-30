import { createStore } from './store.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export function hiddenPassword(prompt='Password (at least 12 characters): ') {
 if(!process.stdin.isTTY||!process.stdout.isTTY)throw new Error('Interactive terminal required');
 return new Promise((resolvePassword,reject)=>{let value='';process.stdout.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');const cleanup=()=>{process.stdin.setRawMode(false);process.stdin.pause();process.stdin.removeListener('data',receive);process.stdout.write('\n');};const receive=chunk=>{for(const character of chunk){if(character==='\u0003'||character==='\u0004'){cleanup();reject(new Error('Cancelled'));return;}if(character==='\r'||character==='\n'){cleanup();resolvePassword(value);return;}if(character==='\u007f'||character==='\b')value=value.slice(0,-1);else if(character>=' '&&value.length<1024)value+=character;}};process.stdin.on('data',receive);});
}
export async function main(args=process.argv.slice(2)) {
 if(args.length!==2||args[0]!=='create-user')throw new Error('Usage: node server/admin.mjs create-user email');
 const password=await hiddenPassword();const confirm=await hiddenPassword('Confirm password: ');if(password!==confirm)throw new Error('Passwords do not match');
 const store=createStore(process.env.TEAM_DB_PATH||'data/team.sqlite');try{await store.createUser(args[1],password);console.log('Account created.');}finally{store.close();}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))main().catch(()=>{console.error('Account creation failed. Check email, password requirements, or existing account.');process.exitCode=1;});
