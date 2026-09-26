import {useEffect,useState} from 'react';
import index from '../../docs/licenses/index.json';
import {nativeRecognitionAvailable} from '../recognition/native';
import {MobileShell} from './mobile-shell';
const files=import.meta.glob<string>('../../docs/licenses/**/*',{query:'?raw',import:'default'});
const pageSize=20000;
export function NoticesPage({onClose}:{onClose:()=>void}){
 const [file,setFile]=useState('npm/react-19.3.0/LICENSE'),[text,setText]=useState(''),[error,setError]=useState(''),[part,setPart]=useState(0);
 useEffect(()=>{const abort=new AbortController();setText('');setError('');setPart(0);void(async()=>{try{const load=files[`../../docs/licenses/${file}`];if(!load)throw new Error('随包声明缺失');const original=await load(),bytes=new TextEncoder().encode(original),expected=index.files.find(f=>f.path===file);const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(!expected||bytes.byteLength!==expected.bytes||digest!==expected.sha256)throw new Error('声明文件校验失败');if(!abort.signal.aborted)setText(original);}catch(e){if(!abort.signal.aborted)setError(String(e));}})();return()=>abort.abort();},[file]);
 useEffect(()=>{const close=()=>onClose(),key=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};window.addEventListener('netatelier-back',close);window.addEventListener('keydown',key);if(nativeRecognitionAvailable())void MobileShell.configure({immersive:false,backEnabled:true});return()=>{window.removeEventListener('netatelier-back',close);window.removeEventListener('keydown',key);if(nativeRecognitionAvailable())void MobileShell.configure({immersive:false,backEnabled:false});};},[onClose]);
 const count=Math.max(1,Math.ceil(text.length/pageSize));
 return <main className="notices-page"><button onClick={onClose}>返回首页</button><h1>隐私与第三方声明</h1><p>图纸、识别和计算留在本机。本应用未申请互联网权限，不设账号、广告或云备份；卸载会删除应用私有数据，重要方案请先导出完整工程包。</p><p>OCR 使用随包 Google ML Kit 中文/拉丁模型。以上描述不表示第三方 SDK 不含遥测相关代码；其运行仍受本应用权限限制。外部商品链接由您决定是否在系统浏览器打开。</p><p>以下原文和依赖版本已随 APK 打包，可断网读取。声明快照：{index.snapshotDate}。本页不为应用原创代码另行授予开源许可。</p>
 <details><summary>依赖版本与许可索引</summary><ul>{index.npm.map(n=><li key={n.package}>{n.package} {n.version} · {n.license}</li>)}{index.maven.map(m=><li key={m.coordinate}>{m.coordinate} · {m.licenses.map(l=>l.name).join(' / ')||'见原文声明'}</li>)}</ul></details>
 <label>声明文件<select value={file} onChange={e=>setFile(e.target.value)}>{index.files.filter(f=>f.bytes>0).map(f=><option key={f.path} value={f.path}>{f.path}</option>)}</select></label>
 {error?<p role="alert">{error}</p>:<><p>原文分段显示 {part+1} / {count}，不省略正文；文件完整性按随包 SHA-256 校验。</p><div className="control-row"><button disabled={part===0} onClick={()=>setPart(part-1)}>上一段</button><button disabled={part+1>=count} onClick={()=>setPart(part+1)}>下一段</button></div><pre aria-label="声明原文">{text.slice(part*pageSize,(part+1)*pageSize)||'正在读取本地声明…'}</pre></>}
 </main>;
}
