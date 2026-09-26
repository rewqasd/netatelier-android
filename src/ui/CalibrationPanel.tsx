import {useState} from 'react';
import type {Calibration,Vec2} from '../domain/model';
import {areaCalibration,calibrationIssues,knownLength} from '../recognition/calibration';
export function CalibrationPanel({boundary,marks,onMark,onApply,value}:{boundary:Vec2[];marks:Vec2[];onMark:()=>void;onApply:(c:Calibration)=>void;value:Calibration}){
  const [end,setEnd]=useState(200),[metres,setMetres]=useState(10),[area,setArea]=useState(300);
  return <details open className="correction-card"><summary>比例标尺 · {value.metersPerPixel?`100px ≈ ${(value.metersPerPixel*100).toFixed(2)}m`:'未设置'}</summary>
    <p className="muted">优先在原图上点两个已知距离端点，再填写实际米数；不会把图片像素直接当作米。</p>
    <button onClick={onMark}>在图上取标尺两点</button><p className="muted">{marks.length===2?`已选 (${marks[0].x.toFixed(0)},${marks[0].y.toFixed(0)}) → (${marks[1].x.toFixed(0)},${marks[1].y.toFixed(0)})`:'也可输入从像素原点沿X轴的已知终点。'}</p>
    <div className="control-row"><label>标尺终点X<input aria-label="标尺终点X" type="number" value={end} onChange={e=>setEnd(Number(e.target.value))}/></label><label>已知长度（米）<input aria-label="已知长度（米）" type="number" value={metres} onChange={e=>setMetres(Number(e.target.value))}/></label><button onClick={()=>onApply(knownLength(marks[0]??{x:0,y:0},marks[1]??{x:end,y:0},metres))}>应用长度标尺</button></div>
    <details><summary>仅有面积？近似缩放</summary><label>建筑面积（㎡）<input type="number" value={area} onChange={e=>setArea(Number(e.target.value))}/></label><button onClick={()=>onApply(areaCalibration(boundary,area))}>按面积近似缩放</button><p className="muted">不是实测标尺，所有工程量均需现场复核。</p></details>
    {calibrationIssues(value).map(i=><p className="muted" key={i.code}>{i.message}</p>)}
  </details>;
}
