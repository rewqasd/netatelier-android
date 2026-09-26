import {registerPlugin} from '@capacitor/core';
import type {Project,DerivedProject,ExportFormat,ExportArtifact} from '../domain/model';
import {floorSvg,topologySvg} from './svg';
import {quoteCsv} from './csv';
import {reportHtml} from './report';
import {assertEngineeringBounded} from '../domain/workload';
import {LocalDocuments,localImageUrl,nativeRecognitionAvailable} from '../recognition/native';

interface ExportBridge {
 renderReportPdf(options:{html:string;filename:string}):Promise<{systemPrint:true}>;
 saveArtifact(options:{base64?:string;token?:string;filename:string;mime:string}):Promise<{cancelled:boolean;uri?:string}>;
 shareArtifact(options:{base64:string;filename:string;mime:string}):Promise<{opened:boolean}>;
 cancel():Promise<void>;
}
export const NativeExport=registerPlugin<ExportBridge>('LocalExport');
export const safeFilename=(s:string)=>s.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(0,70)||'组网方案';
export async function exportImages(project:Project):Promise<Record<string,string>>{
 const images:Record<string,string>={};
 for(const f of project.floors)if(f.document&&!images[f.document.assetId]){
  if(!nativeRecognitionAvailable())throw new Error('本地导入原图请在 Android 应用中导出');
  const {uri}=await LocalDocuments.assetUri({assetId:f.document.assetId}),response=await fetch(localImageUrl(uri));if(!response.ok)throw new Error('原图读取失败');
  const blob=await response.blob();if(blob.size>20*1024*1024)throw new Error('导出原图超过20MiB，请缩小后重新导入');
  images[f.document.assetId]=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('原图读取失败'));reader.readAsDataURL(blob);});
 }
 return images;
}
export async function svgPng(svg:string):Promise<Uint8Array>{
 const xml=new DOMParser().parseFromString(svg,'image/svg+xml'),root=xml.documentElement,w=Number(root.getAttribute('width')),h=Number(root.getAttribute('height')),scale=1.5;
 if(xml.querySelector('parsererror')||!w||!h||w*h*scale*scale>24_000_000||Math.max(w,h)*scale>16384)throw new Error('图纸过大，PNG最多24MP；请使用 SVG 或分楼层导出');
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=Math.ceil(w*scale);canvas.height=Math.ceil(h*scale);const context=canvas.getContext('2d');if(!context)throw new Error('无法创建图像');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG生成失败')),'image/png'));canvas.width=0;canvas.height=0;return new Uint8Array(await blob.arrayBuffer());}
 finally{URL.revokeObjectURL(url);}
}
export async function renderExport(project:Project,derived:DerivedProject,format:ExportFormat,options:{floorId?:string;view?:'floor'|'topology';images?:Record<string,string>}={}):Promise<ExportArtifact>{
 assertEngineeringBounded(project);
 const base=safeFilename(project.name),floor=project.floors.find(f=>f.id===options.floorId)??project.floors[0];
 if(format==='csv')return {filename:`${base}-全项目报价.csv`,mime:'text/csv',content:quoteCsv(project,derived)};
 if(format==='pdf')return {filename:`${base}-全项目方案.pdf`,mime:'application/pdf',content:'',reportHtml:reportHtml(project,derived,options.images)};
 const topology=options.view==='topology',svg=topology?topologySvg(project,derived):floorSvg(project,floor.id,options.images),name=`${base}-${topology?'全项目拓扑':safeFilename(floor.name)+'-点位图'}`;
 return format==='png'?{filename:name+'.png',mime:'image/png',content:await svgPng(svg)}:{filename:name+'.svg',mime:'image/svg+xml',content:svg};
}
export function base64Content(value:string|Uint8Array){const bytes=typeof value==='string'?new TextEncoder().encode(value):value;let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
export async function saveArtifact(artifact:ExportArtifact,share=false){
 if(nativeRecognitionAvailable()){
  if(artifact.reportHtml){await NativeExport.renderReportPdf({html:artifact.reportHtml,filename:artifact.filename});return {cancelled:false,systemPrint:true,uri:'已返回应用。PDF 是否保存以系统操作为准，请在您选择的位置核查文件。'};}
  if(share){await NativeExport.shareArtifact({base64:base64Content(artifact.content),filename:artifact.filename,mime:artifact.mime});return {cancelled:false,uri:'已打开系统分享；是否发送由您选择'};}
  return NativeExport.saveArtifact({base64:base64Content(artifact.content),filename:artifact.filename,mime:artifact.mime});
 }
 if(artifact.reportHtml)throw new Error('整套 PDF 请在 Android 应用中生成；开发浏览器不冒充安卓打印验收。');
 const bytes=typeof artifact.content==='string'?artifact.content:Uint8Array.from(artifact.content),url=URL.createObjectURL(new Blob([bytes],{type:artifact.mime})),a=document.createElement('a');a.href=url;a.download=artifact.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);return {cancelled:false,uri:'浏览器下载：'+artifact.filename};
}
