// Test-only component host: deterministic OCR boxes exercise correction, not native OCR.
// Not imported by the application's Vite entry and not shipped in the APK.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {RecognitionPage} from '../../../src/ui/RecognitionPage';
import {drawingFixture} from '../../helpers/drawings';
import '../../../src/ui/styles.css';
const kind=new URLSearchParams(location.search).get('kind')??'split';
const input=drawingFixture(kind as 'split');
const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
canvas.getContext('2d')!.putImageData(new ImageData(input.pixels,320,240),0,0);
if(new URLSearchParams(location.search).has('large')){
  const enlarged=document.createElement('canvas');enlarged.width=1280;enlarged.height=960;enlarged.getContext('2d')!.drawImage(canvas,0,0,1280,960);
  canvas.width=1280;canvas.height=960;canvas.getContext('2d')!.drawImage(enlarged,0,0);
  input.document.widthPx=1280;input.document.heightPx=960;input.text=input.text.map(t=>({...t,boxPx:{x:t.boxPx.x*4,y:t.boxPx.y*4,width:t.boxPx.width*4,height:t.boxPx.height*4}}));
}
function Host(){const [saved,setSaved]=useState('');return <main className="app-shell"><RecognitionPage imported={{raster:{document:input.document,uri:canvas.toDataURL()},text:input.text}} onConfirm={floor=>setSaved(JSON.stringify(floor))} onCancel={()=>setSaved('cancelled')}/><output aria-label="已应用楼层">{saved}</output></main>;}
createRoot(document.getElementById('root')!).render(<Host/>);
