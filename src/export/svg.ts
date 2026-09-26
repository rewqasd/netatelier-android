import type {Project,DerivedProject,Vec2,Device} from '../domain/model';
import {displayMarkers,roomLabel} from '../ui/display-layout';
import {bundleCables} from '../planning/shared-routes';
export const escapeXml=(value:string):string=>value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export const kindName=(kind:Device['kind'])=>({ap:'AP',camera:'监控',information:'网口',cabinet:'机柜',wan:'入户'})[kind];
const root=(width:number,height:number,body:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="sans-serif"><rect width="100%" height="100%" fill="#fff"/>${body}</svg>`;
const text=(x:number,y:number,s:string,size=16)=>`<text x="${x}" y="${y}" font-size="${size}" fill="#243e32">${escapeXml(s)}</text>`;
export function floorSvg(project:Project,floorId:string,images:Record<string,string>={},legend=true):string{
 const f=project.floors.find(f=>f.id===floorId);if(!f)throw new Error('导出楼层不存在');
 const devices=f.devices.filter(d=>project.settings.monitoring||d.kind!=='camera'),xs=f.boundary.map(p=>p.x),ys=f.boundary.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY,scale=Math.min(1080/Math.max(.01,w),620/Math.max(.01,h));
 const off={x:600-(minX+w/2)*scale,y:380-(minY+h/2)*scale},screen=(p:Vec2)=>({x:off.x+p.x*scale,y:off.y+p.y*scale}),points=(ps:Vec2[])=>ps.map(p=>{const v=screen(p);return `${v.x},${v.y}`;}).join(' ');
 const markers=displayMarkers(devices.map(d=>({id:d.id,at:screen(d.positionM)})),1200,750);
 let body=text(36,32,`${project.name} / ${f.name}`,22)+text(36,58,`组网工坊 0.1.0 · ${project.updatedAt.slice(0,10)} · ${f.calibration.kind==='known-length'?'已按已知长度校准':f.calibration.kind==='demo'?'演示尺寸':'比例待核实'}`,13);
 if(f.document){const src=images[f.document.assetId];if(!src||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(src))throw new Error('导出原图缺失或不是内嵌本地图片，请重新导入');if(!f.calibration.metersPerPixel)throw new Error('原图比例尚未校准');body+=`<svg x="24" y="68" width="1152" height="680" overflow="hidden"><image href="${src}" width="${f.document.widthPx}" height="${f.document.heightPx}" opacity=".45" transform="translate(${off.x-24} ${off.y-68}) scale(${scale}) rotate(${f.calibration.angleRad*180/Math.PI}) scale(${f.calibration.metersPerPixel}) translate(${-f.calibration.originPx.x} ${-f.calibration.originPx.y})"/></svg>`;}
 for(const [index,r] of f.rooms.entries()){const label=roomLabel(r.polygon.map(screen),r.name,markers.map(m=>m.at),index);body+=`<polygon points="${points(r.polygon)}" fill="${['guest','toilet','shower','changing'].includes(r.use)?'#e9edeb':f.document?'#ffffff66':'#f8faf9'}" stroke="#9aaba0"/>`;
  label.lines.forEach((line,i)=>{body+=`<text x="${label.at.x}" y="${label.at.y-(label.lines.length-1)*6.5+4+i*13}" text-anchor="middle" font-size="11" fill="#476052">${escapeXml(line)}</text>`;});}
 for(const wall of f.walls){const a=screen(wall.from),b=screen(wall.to);body+=`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#4a6153" stroke-width="2"/>`;}
 for(const o of f.openings){const p=screen(o.at);body+=`<circle cx="${p.x}" cy="${p.y}" r="4" fill="white" stroke="${o.confirmed?'#688978':'#b38227'}"/>`;}
 for(const s of bundleCables(f.cables.filter(c=>devices.some(d=>d.id===c.toId)),devices)){const a=screen(s.from),b=screen(s.to),mixed=s.kinds.includes('ap')&&s.kinds.includes('camera'),color=s.kinds.includes('camera')?'#cd784f':s.kinds.includes('ap')?'#3485ac':'#85968a',path=`x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke-width="${s.cableIds.length>1?3:1.4}"`;body+=`<g data-cables="${escapeXml(s.cableIds.join(' '))}"><line ${path} stroke="${color}"/>${mixed?`<line ${path} stroke="#3485ac" stroke-dasharray="8 8"/>`:''}</g>`;}
 for(const m of markers){const d=devices.find(d=>d.id===m.id)!,label=`${kindName(d.kind)}${devices.filter(v=>v.kind===d.kind).indexOf(d)+1}`;
  const glyph=d.kind==='ap'?'<path d="M-8 -3 Q0 -11 8 -3 M-5 1 Q0 -4 5 1 M-2 5 Q0 2 2 5"/>':d.kind==='camera'?'<path d="M-8 0 A8 8 0 0 1 8 0Z M-6 2 Q0 11 6 2"/><circle cy="3" r="2"/>':d.kind==='cabinet'?'<rect x="-6" y="-9" width="12" height="18"/><path d="M-3 -4H3 M-3 1H3 M-3 5H3"/>':'<rect x="-6" y="-6" width="12" height="12"/>';
  body+=`<g data-device="${escapeXml(d.id)}" data-x-m="${d.positionM.x}" data-y-m="${d.positionM.y}"><title>${escapeXml(d.label)}</title><line x1="${m.anchor.x}" y1="${m.anchor.y}" x2="${m.at.x}" y2="${m.at.y}" stroke="#90a298"/><circle cx="${m.anchor.x}" cy="${m.anchor.y}" r="2" fill="#243e32"/><g transform="translate(${m.at.x} ${m.at.y})"><circle r="14" fill="white" stroke="${d.kind==='camera'?'#cd784f':'#3485ac'}" stroke-width="2"/><g fill="none" stroke="#243e32" stroke-width="1.5">${glyph}</g><rect x="${-(label.length*10+8)/2}" y="17" width="${label.length*10+8}" height="18" rx="3" fill="white"/><text y="29" text-anchor="middle" font-size="12" fill="#243e32">${label}</text></g></g>`;
 }
 body+=text(36,777,'蓝色 Wi-Fi / 橙色监控 / 灰色网口；蓝橙交替为共用线槽，仍按独立线缆计量。',16)+text(36,802,'细引线仅避让图标；小圆点为真实工程位置。房间编号与点位明细见下方。',14);
 const legends=[...f.rooms.map((r,i)=>`R${i+1} · ${r.name}`),...devices.map(d=>`${kindName(d.kind)}${devices.filter(v=>v.kind===d.kind).indexOf(d)+1} · ${d.label} (${d.positionM.x.toFixed(2)}, ${d.positionM.y.toFixed(2)})m`)];
 if(legend)legends.forEach((line,i)=>{body+=text(36+(i%2)*570,840+Math.floor(i/2)*24,line,13);});
 return root(1200,legend?870+Math.ceil(legends.length/2)*24:824,body);
}
/** Layout alone; identifiers, edges and port labels are supplied by the applied derived graph. */
export function topologySvg(project:Project,derived:DerivedProject):string{
 const graph=derived.topology,depth=new Map(graph.nodes.map(n=>[n.id,0]));
 for(let pass=0;pass<8;pass++)for(const e of graph.edges)depth.set(e.to,Math.max(depth.get(e.to)??0,Math.min(7,(depth.get(e.from)??0)+1)));
 const rows=new Map<number,number>(),positions=new Map(graph.nodes.map(n=>{const level=depth.get(n.id)??0,row=rows.get(level)??0;rows.set(level,row+1);return [n.id,{x:30+level*300,y:110+row*105}] as const;}));
 let body=text(30,36,`${project.name} · 网络组网拓扑`,24)+text(30,64,'组网工坊 0.1.0 · 与报价共用设备及端口分配 · '+project.updatedAt.slice(0,10),14);
 for(const e of graph.edges){const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)continue;body+=`<g data-edge="${escapeXml(e.id)}"><path d="M${a.x+240} ${a.y+34}H${a.x+260}V${b.y+34}H${b.x}" fill="none" stroke="#829b8d"/>${text(b.x-48,b.y+8,e.label,11)}</g>`;}
 for(const n of graph.nodes){const p=positions.get(n.id)!;body+=`<g data-node="${escapeXml(n.id)}"><rect x="${p.x}" y="${p.y}" width="240" height="78" rx="7" fill="${n.deviceId?'#fff':'#e9f1ec'}" stroke="#739381"/>${[...n.label.matchAll(/.{1,21}/gu)].slice(0,2).map((line,i)=>text(p.x+10,p.y+21+i*18,line[0],12)).join('')}${text(p.x+10,p.y+65,project.floors.find(f=>f.id===n.floorId)?.name??'项目核心',11)}<title>${escapeXml(n.label)}</title></g>`;}
 return root(300+Math.max(0,...depth.values())*300,140+Math.max(1,...rows.values())*105,body);
}
