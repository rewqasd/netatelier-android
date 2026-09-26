import {expect,it} from 'vitest';
import {minimalProject} from '../helpers/projects';
import {validateProject} from '../../src/domain/schema';

it('preserves the original document and raster rotation across validation',()=>{
  const p=minimalProject();
  const doc={assetId:'raster-1.png',sourceAssetId:'source-1.pdf',mime:'image/png',widthPx:1600,heightPx:2400,page:2,rotationDeg:90};
  const input={...p,floors:[{...p.floors[0],document:doc}]};
  expect(validateProject(input).project?.floors[0].document).toEqual(doc);
  for(const change of [{sourceAssetId:'../private.pdf'},{rotationDeg:45}]){
    expect(validateProject({...p,floors:[{...p.floors[0],document:{...doc,...change}}]}).project).toBeUndefined();
  }
});
