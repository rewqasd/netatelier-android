import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
export function checkPdfPagination(path){
 const text=execFileSync('pdftotext',['-layout',path,'-'],{encoding:'utf8'});
 const pages=text.split('\f');if(!pages.at(-1).trim())pages.pop();
 for(const [index,page] of pages.entries()){
  const footer=page.match(/组网工坊 0\.1\.0[^\n]*?\s(\d+)\s*\/\s*(\d+)\s*$/m);
  assert.ok(footer,`Physical page ${index+1} has no footer (overflow or blank page)`);
  assert.equal(Number(footer[1]),index+1,`Physical page ${index+1} has an incorrect page number`);
  assert.equal(Number(footer[2]),pages.length,`Physical page ${index+1} has an incorrect total page count`);
 }
 return pages.length;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){for(const path of process.argv.slice(2))console.log(`${path}: ${checkPdfPagination(path)} physical pages and matching footers`);}
