import {useState} from 'react';
import type {Project,DerivedProject,ExportFormat} from '../domain/model';
import {renderExport,saveArtifact,exportImages} from '../export';
import {NativeProjectStore} from '../project/native';
import {nativeRecognitionAvailable} from '../recognition/native';
export function ExportPanel({project,derived,floorId,onClose,onBusy,onCheckpoint}:{project:Project;derived:DerivedProject;floorId:string;onClose:()=>void;onBusy:(busy:boolean)=>void;onCheckpoint:()=>Promise<Project>}){
 const [busy,setBusy]=useState(false),[result,setResult]=useState(''),[error,setError]=useState('');
 async function run(format:ExportFormat|'bundle',view:'floor'|'topology'='floor',share=false){
  setBusy(true);onBusy(true);setResult('正在本机生成…');setError('');
  try{let saved:{cancelled:boolean;uri?:string;systemPrint?:boolean};
   if(format==='bundle'){if(!nativeRecognitionAvailable())throw new Error('完整工程包请在 Android 应用中导出');const snapshot=await onCheckpoint();saved=await NativeProjectStore.exportBundle({id:snapshot.id,requestId:crypto.randomUUID()});}
   else{const target=format==='pdf'?project:{...project,floors:project.floors.filter(f=>f.id===floorId)},images=(format==='pdf'||(format==='svg'||format==='png')&&view==='floor')?await exportImages(target):{};const artifact=await renderExport(project,derived,format,{floorId,view,images});saved=await saveArtifact(artifact,share);}
   setResult(saved.cancelled?'已取消导出；工程未更改。':saved.systemPrint?saved.uri??'请核查保存位置':`已完成：${saved.uri??'请查看所选保存位置'}`);
  }catch(e){setError(e instanceof Error?e.message:String(e));setResult('');}finally{setBusy(false);onBusy(false);}
 }
 return <aside className="editor-panel export-panel" aria-label="导出选项"><h2>导出方案</h2><p>当前楼层：{project.floors.find(f=>f.id===floorId)?.name}。SVG/PNG 独立保存；PDF、报价和工程包包含全部楼层。</p><p>只导出已应用的数据。文件位置由系统选择器决定；取消不改变工程。</p>
 <div className="export-actions">{(['svg','png'] as const).map(format=><button key={format} disabled={busy} onClick={()=>void run(format)}>当前楼层 {format.toUpperCase()}</button>)}{(['svg','png'] as const).map(format=><button key={format} disabled={busy} onClick={()=>void run(format,'topology')}>全项目拓扑 {format.toUpperCase()}</button>)}<button disabled={busy} onClick={()=>void run('csv')}>全项目报价 CSV</button><button disabled={busy} onClick={()=>void run('pdf')}>全项目方案 PDF</button><p>PDF 将打开安卓系统打印，选择“保存为 PDF”、A4、全部页面，再选择保存位置。</p><button disabled={busy||!nativeRecognitionAvailable()} onClick={()=>void run('png','floor',true)}>分享当前楼层 PNG</button><button disabled={busy||!nativeRecognitionAvailable()} onClick={()=>void run('bundle')}>完整工程包（含原图）</button></div>
 {result&&<p role="status" className="export-result">{result}</p>}{error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={onClose}>关闭导出</button></aside>;
}
