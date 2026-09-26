import {useEffect,useMemo,useRef,useState} from 'react';
import type {Project,ProjectEdit,SharedSegment,Vec2} from '../domain/model';
import {ProjectHistory} from '../planning/history';
import {routeProject} from '../planning/routing';
import {moveSharedSegment} from '../planning/shared-routes';
import {deriveProject} from '../quote/derive';
import {catalog} from '../catalog/models';
import {polygonArea} from '../domain/geometry';
import {SaveQueue} from '../project/transactions';
import type {ProjectRepository} from '../project/repository';
import {FloorplanCanvas,type CanvasMode} from './FloorplanCanvas';
import {DeviceConfigPanel} from './DeviceConfigPanel';
import {Inspector} from './Inspector';
import {QuotePanel} from './QuotePanel';
import {TopologyPage} from './TopologyPage';
import {MobileShell} from './mobile-shell';
import {nativeRecognitionAvailable} from '../recognition/native';
import {ExportPanel} from './ExportPanel';

export function PlannerPage({initial,repository,onExit,onImport}:{initial:Project;repository:ProjectRepository;onExit:()=>void;onImport:(p:Project)=>void}){
 const [history]=useState(()=>new ProjectHistory(initial)),[queue]=useState(()=>new SaveQueue(repository)),[project,setProject]=useState(initial),[floorId,setFloorId]=useState(initial.floors[0].id);
 const [tab,setTab]=useState<'plan'|'quote'|'topology'>('plan'),[panel,setPanel]=useState<'config'|'inspector'|'export'|undefined>(),[selected,setSelected]=useState<string>(),[mode,setMode]=useState<CanvasMode>('pan'),[fullscreen,setFullscreen]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('尚未保存'),[segment,setSegment]=useState<SharedSegment>(),[shift,setShift]=useState({x:0,y:0}),[exportBusy,setExportBusy]=useState(false);
 const saveToken=useRef(0),floor=project.floors.find(f=>f.id===floorId)??project.floors[0],derived=useMemo(()=>deriveProject(project,catalog),[project]);
 const device=floor.devices.find(d=>d.id===selected),blocking=derived.issues.filter(i=>i.severity==='blocking');
 function save(snapshot:Project){const token=++saveToken.current;setStatus('正在保存…');void queue.save(snapshot).then(()=>{if(token===saveToken.current)setStatus('已保存到本机');}).catch(e=>{if(token===saveToken.current){setStatus('保存失败');setError(String(e));}});}
 useEffect(()=>{save(initial);},[]);
 useEffect(()=>{if(nativeRecognitionAvailable())void MobileShell.configure({immersive:fullscreen,backEnabled:true}).catch(e=>setError(String(e)));return()=>{if(nativeRecognitionAvailable())void MobileShell.configure({immersive:false,backEnabled:false});};},[fullscreen]);
 function guard(){if(exportBusy){setError('正在导出，请完成或取消系统文件选择。');return false;}if(dirty){setError('有未应用修改，请先应用或取消修改。');return false;}setError('');return true;}
 function apply(edits:ProjectEdit[],route=false){try{if(edits.length){history.transact(edits,route?p=>routeProject(p).project:undefined);const next=history.current;setProject(next);save(next);}setDirty(false);setError('');return true;}catch(e){setError(e instanceof Error?e.message:String(e));return false;}}
 function navigate(next:typeof tab){if(guard()){setTab(next);setPanel(undefined);setSegment(undefined);setMode('pan');}}
 function undo(redo=false){if(!guard())return;if(redo)history.redo();else history.undo();const next=history.current;setProject(next);save(next);setPanel(undefined);setSelected(undefined);setSegment(undefined);}
 function closePanel(){if(guard()){setPanel(undefined);setSegment(undefined);setMode('pan');}}
 const back=useRef(()=>{});back.current=()=>{if(exportBusy){setError('正在导出，请等待本地生成完成。');return;}if(fullscreen){setFullscreen(false);return;}if(dirty){setError('有未应用修改，请先应用或取消修改。');return;}if(panel||segment){closePanel();return;}if(tab!=='plan'){setTab('plan');return;}if(status==='保存失败'||status==='正在保存…'){setError('请先完成保存或重试，避免丢失修改。');return;}onExit();};
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.key==='Escape')back.current();};window.addEventListener('keydown',handler);const native=()=>back.current();window.addEventListener('netatelier-back',native);return()=>{window.removeEventListener('keydown',handler);window.removeEventListener('netatelier-back',native);};},[]);
 function point(p:Vec2){if(!guard())return;if(mode==='move'&&device){apply([{type:'move-device',floorId:floor.id,id:device.id,positionM:p}],true);setMode('pan');return;}if(mode.startsWith('add-')){const kind=mode.slice(4) as 'ap'|'camera'|'information',ok=apply([{type:'add-device',floorId:floor.id,device:{id:`d-${crypto.randomUUID()}`,floorId:floor.id,kind,label:kind==='ap'?'手工AP':kind==='camera'?'手工摄像头':'手工网口',positionM:p,locked:false,source:'manual',...(kind==='ap'?{wifi:floor.wifi??project.settings.wifi,mount:'ceiling' as const}:{}),reason:'显式添加的手工点位；请核对安装条件。'}}],true);if(ok)setMode('pan');}}
 function importFloor(){if(!guard())return;setStatus('正在保存…');void queue.save(project).then(saved=>onImport(saved)).catch(e=>{setStatus('保存失败');setError(String(e));});}
 return <main className={`planner-shell ${fullscreen?'immersive':''}`}>
  <header className="planner-header"><button aria-label="返回项目列表" onClick={()=>back.current()}>‹</button><div><strong>{project.name}</strong><small aria-label="保存状态">{status}</small></div><button onClick={()=>{if(guard())save(project);}}>保存</button></header>
  <div className="plan-toolbar">
   {fullscreen&&<><button onClick={()=>setFullscreen(false)}>退出全屏</button><button onClick={()=>{if(guard())save(project);}}>保存</button></>}
   <label><span className="sr-only">当前楼层</span><select value={floor.id} onChange={e=>{if(guard()){setFloorId(e.target.value);setSelected(undefined);setPanel(undefined);setSegment(undefined);setMode('pan');}}}>{project.floors.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
   <button onClick={()=>{if(guard()){setPanel(panel==='config'?undefined:'config');setSegment(undefined);}}}>需求与数量</button><button disabled={!history.canUndo} onClick={()=>undo()}>撤销</button><button disabled={!history.canRedo} onClick={()=>undo(true)}>重做</button>
   {!fullscreen&&<button onClick={()=>{if(guard()){setTab('plan');setFullscreen(true);}}}>全屏画布</button>}
   <button onClick={()=>{if(guard()){setPanel('export');setSegment(undefined);}}}>导出方案</button>
  </div>
  <p className="floor-scope" aria-label="楼层范围">本层 {Math.round(polygonArea(floor.boundary))}㎡ · 全楼{Math.round(project.floors.reduce((n,f)=>n+polygonArea(f.boundary),0))}㎡ · {floor.devices.filter(d=>d.kind==='ap').length} AP / {project.settings.monitoring?floor.devices.filter(d=>d.kind==='camera').length:0} 监控</p>
  {error&&<div className="error-banner" role="alert">{error}<button onClick={()=>setError('')}>收起提示</button></div>}
  <div className="planner-workspace">
  {tab==='plan'?<div className="plan-view"><div className="drawing-tools"><button aria-pressed={mode==='pan'} onClick={()=>setMode('pan')}>浏览 / 平移</button><details><summary>添加点位</summary><div className="add-menu">{(['ap','camera','information'] as const).map(k=><button key={k} onClick={()=>{if(guard()){setMode(`add-${k}`);setPanel(undefined);setSegment(undefined);}}}>{k==='ap'?'添加 AP':k==='camera'?'添加监控':'添加网口'}</button>)}</div></details><button onClick={importFloor}>导入下一层</button></div>
   {mode!=='pan'&&<div className="mode-banner">{mode==='move'?'拖动选中图标，松开后重算线路':'在图内点按一次添加；按“浏览 / 平移”退出'}</div>}
   <FloorplanCanvas floor={floor} monitoring={project.settings.monitoring} selected={selected} mode={mode} onSelect={id=>{if(guard()){setSelected(id);setPanel('inspector');setSegment(undefined);}}} onPoint={point} onSegment={s=>{if(guard()){setSegment(s);setPanel(undefined);setShift({x:0,y:0});}}}/>
  </div>:tab==='quote'?<QuotePanel project={project} derived={derived} floor={floor} onApply={apply} onDirty={()=>setDirty(true)}/>:<TopologyPage project={project} derived={derived} onLocate={(f,d)=>{if(guard()){setFloorId(f);setSelected(d);setTab('plan');setPanel('inspector');}}}/>}
  {panel==='config'&&<DeviceConfigPanel key={floor.id} project={project} floor={floor} onDirty={()=>setDirty(true)} onCancel={()=>{setPanel(undefined);setDirty(false);setError('');}} onApply={edits=>{if(apply(edits,true))setPanel(undefined);}}/>}
  {panel==='inspector'&&device&&<Inspector device={device} floor={floor} onDirty={()=>setDirty(true)} onApply={apply} onClose={()=>{setDirty(false);setError('');setPanel(undefined);setMode('pan');}} onMove={()=>{setPanel(undefined);setMode('move');}}/>}
  {panel==='export'&&<ExportPanel project={project} derived={derived} floorId={floor.id} onClose={closePanel} onBusy={setExportBusy} onCheckpoint={()=>queue.save(project)}/>}
  {segment&&<aside className="editor-panel">
   <h2>共用路段 · {segment.cableIds.length}根独立线</h2>
   <p>{segment.cableIds.map(id=>floor.devices.find(d=>d.id===floor.cables.find(c=>c.id===id)?.toId)?.label).join('、')}</p>
   <p>移动会同步调整这些线路并锁定路径，端点不移动。穿墙位置仍列为待确认。</p>
   {segment.cableIds.some(id=>floor.cables.find(c=>c.id===id)?.locked)&&<button onClick={()=>{if(!guard())return;apply(segment.cableIds.flatMap(id=>{const cable=floor.cables.find(c=>c.id===id);return cable?.locked?[{type:'route' as const,floorId:floor.id,cable:{...cable,locked:false}}]:[];}));}}>解锁关联线路</button>}
   <div className="fields"><label>横移（米）<input type="number" step=".1" value={shift.x} onChange={e=>{setDirty(true);setShift({...shift,x:Number(e.target.value)});}}/></label><label>纵移（米）<input type="number" step=".1" value={shift.y} onChange={e=>{setDirty(true);setShift({...shift,y:Number(e.target.value)});}}/></label></div>
   <button onClick={()=>{try{const next=moveSharedSegment(floor,segment,shift);next.cables.forEach(c=>{if(segment.cableIds.includes(c.id))c.locked=true;});if(apply([{type:'floor',floor:next}]))setSegment(undefined);}catch(e){setError(String(e));}}}>应用路段移动</button>
   <button onClick={()=>{setSegment(undefined);setDirty(false);}}>取消路段修改</button>
  </aside>}
  </div>
  <details className="issues-tray"><summary>{blocking.length?`${blocking.length}项需要确认`:'规划说明与检查'} · {derived.issues.length}项</summary>{derived.issues.map((i,n)=><p key={`${i.code}-${n}`}><strong>{i.severity==='blocking'?'待确认':'说明'}</strong> {i.message}</p>)}{(project.backbones??[]).map(link=><div key={link.id}><p>{project.floors.find(f=>f.id===link.fromFloorId)?.name} → {project.floors.find(f=>f.id===link.toFloorId)?.name} · {link.medium==='fiber'?'光纤主干':'铜缆主干'} · {link.status}</p><p>请先核查实际竖井、楼高与机柜端点。本按钮只确认现有假设路径。</p><button disabled={link.status==='confirmed'} onClick={()=>{if(guard())apply([{type:'backbone',link:{...link,status:'confirmed'}}]);}}>已核查此主干路径</button></div>)}</details>
  <nav className="bottom-nav" aria-label="方案结果"><button aria-current={tab==='plan'?'page':undefined} onClick={()=>navigate('plan')}>平面图</button><button aria-current={tab==='quote'?'page':undefined} onClick={()=>navigate('quote')}>报价</button><button aria-current={tab==='topology'?'page':undefined} onClick={()=>navigate('topology')}>拓扑</button></nav>
 </main>;
}
