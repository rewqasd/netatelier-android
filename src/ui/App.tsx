import {useEffect,useState} from 'react';
import {ImportPage,type ImportedPage} from './ImportPage';
import {RecognitionPage} from './RecognitionPage';
import type {Floor,Project,SceneId} from '../domain/model';
import {createScene} from '../scenes';
import {planFloor} from '../planning/ap';
import {routeProject} from '../planning/routing';
import {ProjectRepository} from '../project/repository';
import {BrowserProjectStore} from '../project/browser-store';
import {NativeProjectStore,importProjectBundle} from '../project/native';
import {nativeRecognitionAvailable} from '../recognition/native';
import {HomePage} from './HomePage';
import {PlannerPage} from './PlannerPage';
import {MobileShell} from './mobile-shell';
import {deriveProject} from '../quote/derive';
import {catalog} from '../catalog/models';
import {PlannerBoundary} from './PlannerBoundary';
const repository=new ProjectRepository(nativeRecognitionAvailable()?NativeProjectStore:new BrowserProjectStore(localStorage));
export function App() {
  const [imported,setImported]=useState<ImportedPage>(),[project,setProject]=useState<Project>(),[adding,setAdding]=useState<Project>(),[screen,setScreen]=useState<'home'|'import'|'planner'>('home'),[error,setError]=useState(''),[busy,setBusy]=useState(true);
  async function select(id:string|null){if(nativeRecognitionAvailable())await MobileShell.setSelection({id});else if(id)localStorage.setItem('netatelier:last',id);else localStorage.removeItem('netatelier:last');}
  async function open(p:Project){try{deriveProject(p,catalog);await select(p.id);setProject(p);setScreen('planner');}catch(e){setError('无法打开方案，原项目已保留：'+String(e));}}
  useEffect(()=>{let active=true;void(async()=>{try{const id=nativeRecognitionAvailable()?(await MobileShell.getSelection()).id:localStorage.getItem('netatelier:last');if(id){const p=await repository.load(id);deriveProject(p,catalog);if(active){setProject(p);setScreen('planner');if(repository.recovered)setError('上次保存异常，已恢复最近有效版本。请检查后重新保存。');}}}catch(e){await select(null).catch(()=>{});if(active)setError('无法恢复方案，原项目已保留：'+String(e));}finally{if(active)setBusy(false);}})();return()=>{active=false;};},[]);
  async function exit(){try{await select(null);if(nativeRecognitionAvailable())await MobileShell.configure({immersive:false,backEnabled:false});setScreen('home');setProject(undefined);}catch(e){setError(String(e));}}
  useEffect(()=>{
   if(screen!=='import')return;
   const back=()=>{if(imported)setImported(undefined);else if(adding){void open(adding);setAdding(undefined);}else setScreen('home');};
   const key=(event:KeyboardEvent)=>{if(event.key==='Escape')back();};
   window.addEventListener('netatelier-back',back);window.addEventListener('keydown',key);
   if(nativeRecognitionAvailable())void MobileShell.configure({immersive:false,backEnabled:true});
   return()=>{window.removeEventListener('netatelier-back',back);window.removeEventListener('keydown',key);if(nativeRecognitionAvailable())void MobileShell.configure({immersive:false,backEnabled:false});};
  },[screen,imported,adding]);
  async function load(id:string){setBusy(true);try{open(await repository.load(id));if(repository.recovered)setError('已恢复最近有效版本，请检查后保存。');}catch(e){setError(String(e));}finally{setBusy(false);}}
  function scene(id:SceneId){setBusy(true);setError('');setTimeout(()=>{try{const p=createScene(id);p.floors=p.floors.map(f=>planFloor(f,p.settings).floor);open(routeProject(p).project);}catch(e){setError(String(e));}finally{setBusy(false);}},20);}
  function confirmed(floor:Floor){try{const p=adding?structuredClone(adding):createScene('office');if(!adding){p.scene=undefined;p.name='新建图纸方案';p.floors=[];}floor.name=`导入楼层 · ${p.floors.length+1}层`;floor.elevationM=p.floors.length*3.2;p.floors.push(planFloor(floor,p.settings).floor);open(routeProject(p).project);setImported(undefined);setAdding(undefined);}catch(e){setError(String(e));}}
  async function bundle(){if(!nativeRecognitionAvailable()){setError('项目文件导入使用安卓系统文件选择器，请在APK中操作。');return;}setBusy(true);try{const p=await importProjectBundle();if(p)open(p);}catch(e){setError(String(e));}finally{setBusy(false);}}
  return <>{busy&&<div className="busy-overlay" role="status">正在读取并计算方案…</div>}{error&&<div className="global-notice" role="alert">{error}<button onClick={()=>setError('')}>关闭提示</button></div>}
   {screen==='planner'&&project?<PlannerBoundary key={project.id+':'+project.floors.length} onExit={()=>void exit()}><PlannerPage initial={project} repository={repository} onExit={()=>void exit()} onImport={p=>{setAdding(p);setScreen('import');}}/></PlannerBoundary>:screen==='import'?<main className="app-shell"><button onClick={()=>{if(adding){void open(adding);setAdding(undefined);}else setScreen('home');setImported(undefined);}}>返回{adding?'方案':'首页'}</button><h1>导入平面图</h1><div hidden={!!imported}><ImportPage onRecognized={setImported}/></div>{imported&&<RecognitionPage imported={imported} onCancel={()=>setImported(undefined)} onConfirm={confirmed}/>}</main>:<HomePage repository={repository} onScene={scene} onOpen={id=>void load(id)} onImport={()=>{setAdding(undefined);setScreen('import');}} onBundle={()=>void bundle()}/>}
  </>;
}
