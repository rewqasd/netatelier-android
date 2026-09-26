import type {Catalog,SceneId} from '../domain/model';
export function recommendations(scene:SceneId,catalog:Catalog):Catalog{return catalog.filter(m=>m.category==='optional'&&String(m.specs.scenes??'').split(',').includes(scene))}
