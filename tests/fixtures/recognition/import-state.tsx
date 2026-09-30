// Synthetic native bridge responses test UI state only, not native OCR.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Capacitor,registerPlugin} from '@capacitor/core';
Capacitor.getPlatform=()=> 'android';
registerPlugin('LocalDocuments',{web:async()=>({
 pickDocument:async()=>({cancelled:false,handle:{id:'synthetic',mime:'application/pdf',pages:2}}),
 renderPage:async({page,rotation}:{page:number;rotation:number})=>({document:{assetId:`page-${page}-${rotation}`,widthPx:100,heightPx:100,page,rotation},uri:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='}),
 cancel:async()=>{},
})});
let calls=0;
registerPlugin('OfflineOcr',{web:async()=>({
 recognizeText:async()=>{if(++calls===2&&location.search.includes('failRetry'))throw new Error('synthetic retry failure');return {text:[{text:'synthetic',boxPx:{x:1,y:1,width:10,height:10}}]};},cancel:async()=>{},
})});
const {ImportPage}=await import('../../../src/ui/ImportPage');
createRoot(document.getElementById('root')!).render(<ImportPage onRecognized={()=>{}}/>);
