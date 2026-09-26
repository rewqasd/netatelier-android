import {useEffect,useRef,useState} from 'react';
import type {OcrText} from '../domain/model';
import type {DocumentHandle,PageRaster} from '../recognition/types';
import {LocalDocuments,OfflineOcr,localImageUrl,nativeRecognitionAvailable} from '../recognition/native';

export interface ImportedPage {raster:PageRaster;text:OcrText[]}
export function ImportPage({onRecognized}:{onRecognized?:(page:ImportedPage)=>void}){
  const [handle,setHandle]=useState<DocumentHandle>();
  const [page,setPage]=useState(0),[rotation,setRotation]=useState(0);
  const [stage,setStage]=useState(''),[error,setError]=useState('');
  const [result,setResult]=useState<ImportedPage>();
  const active=useRef<string|null>(null);
  useEffect(()=>()=>{const id=active.current;active.current=null;if(id){void LocalDocuments.cancel({requestId:id});void OfflineOcr.cancel({requestId:id});}},[]);
  function current(id:string){return active.current===id;}
  function finish(id:string){if(current(id)){active.current=null;setStage('');}}
  async function pick(){
    if(!nativeRecognitionAvailable()){setError('离线OCR使用安卓随包模型，请在安卓应用中导入；浏览器不模拟识别结果。');return;}
    const id=`pick-${crypto.randomUUID()}`;active.current=id;setError('');setStage('选择并校验本地文件…');
    try{
      const picked=await LocalDocuments.pickDocument({requestId:id});
      if(!current(id)||picked.cancelled)return;
      setHandle(picked.handle);setPage(0);setRotation(0);setResult(undefined);
    }catch(e){if(current(id))setError(e instanceof Error?e.message:'文件导入失败，请重新选择。');}
    finally{finish(id);}
  }
  async function recognize(){
    if(!handle)return;
    const id=`ocr-${crypto.randomUUID()}`;active.current=id;setError('');setStage('正在生成页面图片…');
    try{
      const raster=await LocalDocuments.renderPage({requestId:id,id:handle.id,page,rotation});
      if(!current(id))return;
      setStage('正在运行离线文字识别…');
      const {text}=await OfflineOcr.recognizeText({requestId:id,assetId:raster.document.assetId});
      if(!current(id))return;
      setResult({raster,text});
      if(text.length===0)setError('未识别到文字。可旋转后重试；后续校正仍需确认墙线和房间，不能把空结果套成模板。');
    }catch(e){if(current(id))setError(e instanceof Error?e.message:'本地识别失败，请尝试清晰图纸。');}
    finally{finish(id);}
  }
  function cancel(){
    const id=active.current;active.current=null;setStage('');setError('已取消本次处理，未应用到方案。');
    if(id){void LocalDocuments.cancel({requestId:id});void OfflineOcr.cancel({requestId:id});}
  }
  return <section className="import-panel" aria-label="导入与离线识别">
    <h2>从本地平面图开始</h2>
    <p className="muted">PNG / JPEG / PDF · 文件≤50MiB，图片≤2400万像素，PDF≤60页。图纸仅在手机本地处理。</p>
    <button className="primary" onClick={()=>void pick()} disabled={!!stage}>导入平面图</button>
    {handle&&<div className="import-controls">
      <p>已导入{handle.mime==='application/pdf'?` PDF，共${handle.pages}页`:'图片'}。先选页和方向，再识别。</p>
      <div className="control-row">
        <label>页面<select aria-label="页面" disabled={!!stage} value={page} onChange={e=>setPage(Number(e.target.value))}>{Array.from({length:handle.pages},(_,n)=><option key={n} value={n}>第{n+1}页</option>)}</select></label>
        <label>旋转<select aria-label="旋转" disabled={!!stage} value={rotation} onChange={e=>setRotation(Number(e.target.value))}>{[0,90,180,270].map(deg=><option key={deg} value={deg}>{deg}°</option>)}</select></label>
        <button onClick={()=>void recognize()} disabled={!!stage}>识别这一页</button>
      </div>
    </div>}
    {stage&&<div role="status" className="control-row"><span>{stage}</span><button onClick={cancel}>取消处理</button></div>}
    {error&&<p role="alert" className="notice">{error}</p>}
    {result&&<div className="recognition-result">
      <h3>文字识别结果 · {result.text.length}处</h3>
      <p className="muted">绿色框为实际OCR文字范围，不代表墙体或房间已确认。</p>
      <svg role="img" aria-label="原图和文字识别范围" viewBox={`0 0 ${result.raster.document.widthPx} ${result.raster.document.heightPx}`}>
        <image href={localImageUrl(result.raster.uri)} width={result.raster.document.widthPx} height={result.raster.document.heightPx}/>
        {result.text.map((word,index)=><rect key={index} x={word.boxPx.x} y={word.boxPx.y} width={word.boxPx.width} height={word.boxPx.height} fill="none" stroke="#14875f" strokeWidth={3}/>)}
      </svg>
      <ul aria-label="识别文字">{result.text.map((word,index)=><li key={index}>{word.text}</li>)}</ul>
      {onRecognized?<button className="primary" onClick={()=>onRecognized(result)}>进入图纸校正</button>:<p className="muted">下一步：墙线提取与图纸校正，开发中。</p>}
    </div>}
  </section>;
}
