import {extractGeometry,type PixelInput} from './image-pipeline';
self.onmessage=(event:MessageEvent<PixelInput>)=>{
  try{self.postMessage({draft:extractGeometry(event.data)});}
  catch(error){self.postMessage({error:error instanceof Error?error.message:'图形处理失败'});}
};
