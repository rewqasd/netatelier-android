import {it,expect} from 'vitest';
import {ProjectRepository} from '../../src/project/repository';
import {SaveQueue} from '../../src/project/transactions';
import {StoreTransport} from '../helpers/project-store';
import {quoteProject} from '../helpers/catalog';
it('validated project repository preserves coordinates, locks, radio, prices and image asset IDs through revisioned save/load',async()=>{
  const r=new ProjectRepository(new StoreTransport()),p=quoteProject(1);p.floors[0].devices[1].locked=true;p.floors[0].devices[1].wifi=5;p.priceOverrides.ap5=0;p.floors[0].document={assetId:'image.png',sourceAssetId:'original.pdf',mime:'image/png',widthPx:400,heightPx:300,page:1};
  const saved=await r.save(p);expect(saved.revision).toBe(1);expect((await r.load(p.id)).floors).toEqual(p.floors);expect((await r.load(p.id)).priceOverrides).toEqual({ap5:0});expect(p.revision).toBe(0);
});
it('conflicts and unknown schemas are errors and do not replace a valid saved project',async()=>{
  const transport=new StoreTransport(),r=new ProjectRepository(transport),p=quoteProject();await r.save(p);
  await expect(r.save({...p,name:'stale'})).rejects.toThrow('REVISION_CONFLICT');
  await expect(r.save({...p,schemaVersion:2} as never)).rejects.toThrow();expect((await r.load(p.id)).name).toBe(p.name);
  transport.files.set('broken',JSON.stringify({...p,schemaVersion:2}));await expect(r.load('broken')).rejects.toThrow();
});
it('delete requires affirmative confirmation and does not remove another project',async()=>{
  const r=new ProjectRepository(new StoreTransport()),p=quoteProject();await r.save(p);await r.save({...p,id:'second'});await expect(r.delete(p.id,false)).rejects.toThrow();expect(await r.list()).toHaveLength(2);await r.delete(p.id,true);expect(await r.list()).toHaveLength(1);expect((await r.load('second')).id).toBe('second');
});
it('queued rapid edits use the acknowledged revision in order rather than losing the latest edit',async()=>{
  const r=new ProjectRepository(new StoreTransport()),q=new SaveQueue(r),p=quoteProject();const [one,two]=await Promise.all([q.save({...p,name:'first'}),q.save({...p,name:'second'})]);expect(one.revision).toBe(1);expect(two.revision).toBe(2);expect((await r.load(p.id)).name).toBe('second');
});
