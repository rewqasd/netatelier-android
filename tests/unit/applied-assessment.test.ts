import {it,expect} from 'vitest';
import {quoteProject,fixtureCatalog} from '../helpers/catalog';
import {deriveProject} from '../../src/quote/derive';
it('applied low AP counts and unserved camera targets remain visible in all derived results without generating replacements',()=>{
 const p=quoteProject(1);p.floors[0].demand.concurrentUsers=99;const saved=JSON.stringify(p);
 expect(deriveProject(p,fixtureCatalog()).issues.some(i=>i.code==='AP_CAPACITY')).toBe(true);expect(JSON.stringify(p)).toBe(saved);
 p.floors[0].targets=[{id:'target-unseen',roomId:p.floors[0].rooms[0].id,at:{x:2,y:2},kind:'entrance',weight:2,confirmed:true}];p.settings.monitoring=true;
 expect(deriveProject(p,fixtureCatalog()).issues.some(i=>i.code==='UNCOVERED_TARGET')).toBe(true);
});
