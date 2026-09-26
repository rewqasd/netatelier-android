import {useState} from 'react';
import type {Floor,Project,ProjectEdit} from '../domain/model';
import {catalog} from '../catalog/models';
export function DeviceConfigPanel({project,floor,onApply,onCancel,onDirty}:{project:Project;floor:Floor;onApply:(edits:ProjectEdit[])=>void;onCancel:()=>void;onDirty:()=>void}){
 const [counts,setCounts]=useState({ap:floor.devices.filter(d=>d.kind==='ap').length,camera:floor.devices.filter(d=>d.kind==='camera').length,information:floor.devices.filter(d=>d.kind==='information'&&!d.businessId).length});
 const [wifi,setWifi]=useState<5|6>(floor.wifi??project.settings.wifi),[model,setModel]=useState(floor.apModelId??''),[demand,setDemand]=useState({...floor.demand}),[settings,setSettings]=useState({...project.settings});
 const countLabels={ap:'AP数量',camera:'摄像头数量',information:'固定网口数量'},demandLabels={employees:'员工人数',visitors:'顾客或住客人数',concurrentUsers:'同时联网人数',terminals:'预计终端数',wiredPoints:'需求网口数'};
 return <aside className="editor-panel" aria-label="需求配置"><header><h2>需求与数量</h2><p>本层参数 · 修改后点击应用，不会自动购买备选设备。</p></header>
  <div className="fields">{Object.entries(counts).map(([key,value])=><label key={key}>{countLabels[key as keyof typeof counts]}<input type="number" min="0" max="128" value={value} onChange={e=>{onDirty();setCounts({...counts,[key]:Number(e.target.value)});}}/></label>)}
  <label>无线代际<select value={wifi} onChange={e=>{onDirty();setWifi(Number(e.target.value) as 5|6);setModel('');}}><option value="6">Wi-Fi 6</option><option value="5">Wi-Fi 5</option></select></label>
  <label>AP型号<select value={model} onChange={e=>{onDirty();setModel(e.target.value);}}><option value="">自动匹配安装形态</option>{catalog.filter(c=>c.category==='ap'&&c.specs.wifi===wifi).map(c=><option key={c.id} value={c.id}>{c.model}</option>)}</select></label>
  {Object.entries(demand).map(([key,value])=><label key={key}>{demandLabels[key as keyof typeof demand]}<input type="number" min="0" value={value} onChange={e=>{onDirty();setDemand({...demand,[key]:Number(e.target.value)});}}/></label>)}
  <label>宽带（Mbps）<input type="number" min="1" value={settings.bandwidthMbps} onChange={e=>{onDirty();setSettings({...settings,bandwidthMbps:Number(e.target.value)});}}/></label>
  <label>保留录像（天）<input type="number" min="1" value={settings.retentionDays} onChange={e=>{onDirty();setSettings({...settings,retentionDays:Number(e.target.value)});}}/></label>
  <label>录像码率（Mbps/路）<input type="number" min=".1" step=".1" value={settings.bitrateMbps} onChange={e=>{onDirty();setSettings({...settings,bitrateMbps:Number(e.target.value)});}}/></label>
  <label>线材采购<select value={settings.cablePurchase} onChange={e=>{onDirty();setSettings({...settings,cablePurchase:e.target.value as 'box'|'metre'});}}><option value="box">整箱采购 · 按连续裁切计箱</option><option value="metre">按米采购</option></select></label>
  <label className="check"><input type="checkbox" checked={settings.monitoring} onChange={e=>{onDirty();setSettings({...settings,monitoring:e.target.checked});}}/>启用监控与录像</label></div>
  <p className="muted">人数是经营规模，在线人数和终端数用于容量校验，不直接相加。关闭监控会移出监控费用，但保留手工点位供恢复。</p>
  <footer className="panel-actions"><button onClick={onCancel}>取消修改</button><button className="primary" onClick={()=>onApply([{type:'settings',settings},{type:'floor',floor:{...floor,demand}},{type:'configure',floorId:floor.id,counts,wifi,modelId:model||undefined}])}>应用配置</button></footer>
 </aside>;
}
