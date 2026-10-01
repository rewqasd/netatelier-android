import type {Draft,MeasuredScale} from './project-tools';
import {measuredAreas,scaleConsistency} from './project-tools';
export function ProjectProgress({original,draft,data,dirty}:{original:boolean;draft:Draft|null;data:Record<string,unknown>;dirty:boolean}){
 let area=false;try{area=!!draft&&!!measuredAreas(draft,(data.calibration as MeasuredScale)??null)}catch{}
 const verified=!!draft&&scaleConsistency(draft,(data.calibration as MeasuredScale)??{confirmed:false}).status==='verified';
 const stages=[['上传图纸',original?'原图已保存':'待保存','#team-upload'],['确认识别',!draft?'尚无草稿':verified?'双参考尺度已校验，待核实边界':'待核对尺寸、比例尺与边界','#team-review'],['生成方案',data.network?(dirty?'草案未保存':'已保存草案，待现场核实'):'待生成草案','#team-network']];
 const next=dirty?'当前有未保存的修改。请先点“保存人工校正”，再切换或采用历史结果。':!original?'请选择本地图纸，再点“保存原图（不调用识别）”。':!draft?'请点“查看历史识别结果”，对照原图预览。若没有可用历史结果，再考虑识别图纸（会调用模型并消耗额度）。':!verified?'请到“面积与尺度标定”在原图核对两条独立尺寸及其端点、单位，确认尺度一致性。':!data.network?'请到“下一步：生成组网草案”填写上网人数与有线点，核对边界后点“生成布点、拓扑与预算”。':'已有组网草案。请核实墙体、门洞、机柜位置和目录价格；当前不能直接作为施工设计。';
 return <section className="project-progress" aria-label="项目三步流程"><h3>上传、核对、生成</h3><ol>{stages.map(([title,status,href],i)=><li key={title}>{i<2||draft?<a href={href}>{i+1} · {title}</a>:<span aria-disabled="true">{i+1} · {title}</span>}<strong>{status}</strong></li>)}</ol><p aria-label="当前下一步">下一步：{next}</p><p aria-label="项目保存状态">{dirty?'有未保存内容':'当前项目内容已保存'} · 服务就绪不等于识别完成，识别草稿仍需人工核对。</p></section>
}
