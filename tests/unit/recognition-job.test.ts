import {it,expect} from 'vitest';
import {LatestJob} from '../../src/recognition/draft';
it('cancelled or superseded geometry cannot replace the latest draft',async()=>{
  const jobs=new LatestJob();let resolveOld!:(v:number)=>void,oldSignal!:AbortSignal;
  const old=jobs.run(signal=>{oldSignal=signal;return new Promise<number>(resolve=>resolveOld=resolve);});
  expect(await jobs.run(async()=>2)).toBe(2);resolveOld(1);expect(await old).toBeUndefined();expect(oldSignal.aborted).toBe(true);
  let resolveCancelled!:(v:number)=>void;
  const pending=jobs.run(()=>new Promise<number>(resolve=>resolveCancelled=resolve));jobs.cancel();resolveCancelled(3);
  expect(await pending).toBeUndefined();
});
it('settling a superseded run keeps the current busy state',async()=>{
  const jobs=new LatestJob();let first!:(v:number)=>void,second!:(v:number)=>void;
  const old=jobs.run(()=>new Promise<number>(r=>first=r));
  const current=jobs.run(()=>new Promise<number>(r=>second=r));first(1);await old;
  expect(jobs.isRunning).toBe(true);second(2);await current;expect(jobs.isRunning).toBe(false);
});
