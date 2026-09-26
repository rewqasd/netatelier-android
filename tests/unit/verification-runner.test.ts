import {it,expect} from 'vitest';
import {mkdtempSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runChecks} from '../../scripts/verify.mjs';
it('executes real checks, records failure output, and never runs or labels remaining gates successful',()=>{
 const root=mkdtempSync(join(tmpdir(),'netatelier-verify-'));try{
  const result=runChecks({cwd:root,out:root,checks:[{name:'pass',command:process.execPath,args:['-e','console.log("first")']},{name:'fail',command:process.execPath,args:['-e','console.error("expected failure");process.exit(7)']},{name:'must-not-run',command:process.execPath,args:['-e','require("fs").writeFileSync("wrong","ran")']}]});
  expect(result.passed).toBe(false);expect(result.checks.map(c=>c.status)).toEqual([0,7]);expect(existsSync(join(root,'wrong'))).toBe(false);expect(readFileSync(join(root,'02-fail.log'),'utf8')).toContain('expected failure');expect(JSON.parse(readFileSync(join(root,'result.json'),'utf8')).passed).toBe(false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
