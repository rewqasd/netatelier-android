import {useEffect,useState} from 'react';
import type {SceneId} from '../domain/model';
import type {ProjectRepository} from '../project/repository';
import {sceneMeta} from '../scenes';
import {NoticesPage} from './NoticesPage';
export function HomePage({repository,onScene,onOpen,onImport,onBundle}:{repository:ProjectRepository;onScene:(id:SceneId)=>void;onOpen:(id:string)=>void;onImport:()=>void;onBundle:()=>void}){
 const [projects,setProjects]=useState<Awaited<ReturnType<ProjectRepository['list']>>>([]),[deleting,setDeleting]=useState(''),[error,setError]=useState('');
 const [notices,setNotices]=useState(false);
 useEffect(()=>{void repository.list().then(setProjects).catch(e=>setError(String(e)));},[repository]);
 if(notices)return <NoticesPage onClose={()=>setNotices(false)}/>;
 return <main className="home-page"><header className="brand-header"><span className="brand-mark">网</span><span>组网工坊<small>NETATELIER · 离线规划</small></span></header><section className="home-intro"><p className="eyebrow">图纸 / 点位 / 预算</p><h1>把网络方案<br/>落在一张图上。</h1><p>从已有平面图开始，或选择一个典型场景。所有图纸留在本机。</p><button className="primary" onClick={onImport}>导入平面图</button><button onClick={onBundle}>导入项目备份</button></section>
 <section className="scene-section"><div className="section-heading"><h2>从典型场景开始</h2><span>可修改的演示假设</span></div><div className="scene-list">{sceneMeta.map((m,index)=><button key={m.id} className="scene-button" aria-label={m.name} onClick={()=>onScene(m.id)}><span className="scene-number">0{index+1}</span><span><strong>{m.name}</strong><small>{m.summary}</small></span><span aria-hidden="true">↗</span></button>)}</div></section>
 <section className="saved-section"><h2>我的项目</h2>{projects.length===0?<p className="muted">尚无项目。应用后的修改自动保存在本机；重要方案请另导出备份。</p>:projects.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(p=><article key={p.id} className="saved-project"><button onClick={()=>onOpen(p.id)} disabled={p.corrupt}>{p.name}<small>{p.corrupt?'文件损坏，请从备份恢复':p.recovered?'已恢复最近有效版本':`保存版本 ${p.revision}`}</small></button><button onClick={()=>setDeleting(p.id)}>删除</button>{deleting===p.id&&<div className="notice"><p>只删除本机项目记录，不删除原图或其他项目。此操作不可撤销。</p><button onClick={()=>setDeleting('')}>保留项目</button><button className="danger" onClick={()=>void repository.delete(p.id,true).then(()=>repository.list()).then(result=>{setProjects(result);setDeleting('');}).catch(e=>setError(String(e)))}>确认删除</button></div>}</article>)}</section>
 {error&&<p role="alert">{error}</p>}<footer>初步勘察与预算工具 · 现场覆盖、施工路径和采购价须复核<br/><button onClick={()=>setNotices(true)}>隐私与第三方声明</button></footer></main>;
}
