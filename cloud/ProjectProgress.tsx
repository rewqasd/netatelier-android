import type {Draft,MeasuredScale} from './project-tools';
import {measuredAreas} from './project-tools';
export function ProjectProgress({original,draft,data,dirty}:{original:boolean;draft:Draft|null;data:Record<string,unknown>;dirty:boolean}){
 let area=false;try{area=!!draft&&!!measuredAreas(draft,(data.calibration as MeasuredScale)??null)}catch{}
 const stages=[['原图',original?'已保存':'待保存','#team-original'],['识别草稿',draft?(dirty?'当前草稿未保存':'已保存，待人工核对'):'尚无草稿','#team-history'],['面积',area?'尺度已确认，待核实边界':'待标定米单位与长度','#team-area'],['组网',data.network?(dirty?'草案未保存':'已保存草案，待现场核实'):'待生成草案','#team-network']];
 const next=dirty?'当前有未保存的修改。请先点“保存人工校正”，再切换或采用历史结果。':!original?'请选择本地图纸，再点“保存原图（不调用识别）”。':!draft?'请点“查看历史识别结果”，对照原图预览。若没有可用历史结果，再考虑识别图纸（会调用模型并消耗额度）。':!area?'请到“面积与尺度标定”填写两端坐标、已知长度（米）及依据，核对后勾选确认。':!data.network?'请到“下一步：生成组网草案”填写上网人数与有线点，核对边界后点“生成布点、拓扑与预算”。':'已有组网草案。请核实墙体、门洞、机柜位置和目录价格；当前不能直接作为施工设计。';
 return <section className="project-progress" aria-label="项目四阶段"><h3>当前做到哪一步</h3><ol>{stages.map(([title,status,href],i)=><li key={title}>{i<2||draft?<a href={href}>{i+1} · {title}</a>:<span aria-disabled="true">{i+1} · {title}</span>}<strong>{status}</strong></li>)}</ol><p aria-label="当前下一步">下一步：{next}</p><p aria-label="项目保存状态">{dirty?'有未保存内容':'当前项目内容已保存'} · 服务就绪不等于识别完成，识别草稿仍需人工核对。</p></section>
}
