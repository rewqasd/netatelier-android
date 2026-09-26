import {it,expect} from 'vitest';
import {assetIds,validateBundleManifest,type BundleManifest} from '../../src/project/bundle';
import {quoteProject} from '../helpers/catalog';
const p=()=>{const v=quoteProject();v.floors[0].document={assetId:'raster.png',sourceAssetId:'source.pdf',mime:'image/png',widthPx:400,heightPx:300,page:0};return v};
const manifest=():BundleManifest=>({format:'netatelier',version:1,project:'project.json',assets:[{id:'raster.png',path:'assets/raster.png',bytes:100,sha256:'a'.repeat(64)},{id:'source.pdf',path:'assets/source.pdf',bytes:200,sha256:'b'.repeat(64)}]});
it('portable manifest includes original and raster files, not host paths or base64 undo snapshots',()=>{
  expect(assetIds(p()).sort()).toEqual(['raster.png','source.pdf']);expect(validateBundleManifest(manifest(),p()).assets).toHaveLength(2);
});
it('unknown versions, archive paths, duplicate names, oversized manifests and missing references reject',()=>{
  for(const path of ['../outside','/absolute','assets/../escape','assets\\raster.png']){const m=manifest();m.assets[0].path=path;expect(()=>validateBundleManifest(m,p())).toThrow();}
  const m=manifest();m.assets.push(m.assets[0]);expect(()=>validateBundleManifest(m,p())).toThrow();
  expect(()=>validateBundleManifest({...manifest(),version:2},p())).toThrow();expect(()=>validateBundleManifest({...manifest(),assets:manifest().assets.slice(0,1)},p())).toThrow();
  const big=manifest();big.assets[0].bytes=129*1024*1024;expect(()=>validateBundleManifest(big,p())).toThrow();
});
