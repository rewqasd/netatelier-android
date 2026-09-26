import type {RecognitionDraft} from '../domain/model';
import type {PixelInput} from './image-pipeline';
export function recognizeDocument(input:PixelInput,signal?:AbortSignal):Promise<RecognitionDraft>{
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new DOMException('已取消','AbortError'));return;}
    const worker=new Worker(new URL('./recognition.worker.ts',import.meta.url),{type:'module'});
    const cleanup=()=>{worker.terminate();signal?.removeEventListener('abort',cancel);};
    const cancel=()=>{cleanup();reject(new DOMException('已取消','AbortError'));};
    signal?.addEventListener('abort',cancel,{once:true});
    worker.onmessage=event=>{cleanup();if(event.data.error)reject(new Error(event.data.error));else resolve(event.data.draft);};
    worker.onerror=event=>{cleanup();reject(new Error(event.message||'图形处理线程失败'));};
    worker.postMessage(input,[input.pixels.buffer]);
  });
}
export async function readRaster(url:string,signal:AbortSignal):Promise<Uint8ClampedArray>{
  const image=new Image();
  await new Promise<void>((resolve,reject)=>{
    const cancel=()=>{image.src='';cleanup();reject(new DOMException('已取消','AbortError'));};
    const cleanup=()=>{image.onload=null;image.onerror=null;signal.removeEventListener('abort',cancel);};
    if(signal.aborted){reject(new DOMException('已取消','AbortError'));return;}
    signal.addEventListener('abort',cancel,{once:true});
    image.onload=()=>{cleanup();resolve();};image.onerror=()=>{cleanup();reject(new Error('无法读取本地原图'));};image.src=url;
  });
  if(signal.aborted)throw new DOMException('已取消','AbortError');
  if(image.naturalWidth>2400||image.naturalHeight>2400)throw new Error('识别图片超过2400px上限');
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('无法创建本地图像处理画布');
  context.drawImage(image,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;canvas.width=canvas.height=1;return pixels;
}
