import {useState} from 'react';
import {basicLoads,liveLoad} from '../../../packages/load-engine/src/index';
import {generateModel} from '../../../packages/model-generator/src/index';
import {vehicleRules,wheelPatches} from '../../../packages/vehicle-engine/src/index';
import type {Project} from '../../../packages/domain/src/index';
import type {Analysis} from '../../../packages/result-engine/src/index';
import {geometry} from '../../../packages/geometry-engine/src/index';
import {axles} from '../../../packages/vehicle-engine/src/index';
export type ViewMode='geometry'|'M'|'V'|'N'|'deformation';
export default function Viewer({project:p,result,mode}:{project:Project;result:Analysis|null;mode:ViewMode}){
 const [dimensions,setDimensions]=useState(true),[load,setLoad]=useState('EV');
 let geo:ReturnType<typeof geometry>;try{geo=geometry(p);}catch{return <div className="empty">請修正左側輸入，預覽將自動更新。</div>;}
 const g=p.geometry,{width,height,wallX,widths}=geo,scale=Math.min(780/(geo.outerWidth+2),330/(geo.outerHeight+p.soil.cover+1)),ox=(1100-width*scale)/2,oy=490;
 const X=(x:number)=>ox+x*scale,Y=(y:number)=>oy-y*scale;
 const line=(points:number[][])=>points.map(([x,y],i)=>`${i?'L':'M'}${X(x)},${Y(y)}`).join(' ');
 const maxForce=result&&['M','V','N'].includes(mode)?Math.max(1,...result.manual.stations.map(s=>Math.abs(s[mode as 'M'|'V'|'N']))):1;
 const maxU=result?Math.max(1e-9,...result.manual.u.filter((_,i)=>i%3!==2).map(Math.abs)):1;
 const factor=0.4/maxU;
 const model=result?.model??generateModel(p),base=basicLoads(p,model),rules=vehicleRules(p);
 const selected=load==='IW'?base.IW:load==='LL'?liveLoad(p,model):load==='EHmin'?base.EHmin:load==='EHmax'?base.EHmax:load==='DC'?base.DC:load==='DL'?base.DL:base.EV;
 const distributed=model.elements.flatMap(e=>{const a=model.nodes[e.i],b=model.nodes[e.j],L=Math.hypot(b.x-a.x,b.y-a.y),c=(b.x-a.x)/L,t=(b.y-a.y)/L,q=selected.element[e.id];return [0.15,0.5,0.85].map(f=>{const qx=q.qx+((q.qxEnd??q.qx)-q.qx)*f,qy=q.qy+((q.qyEnd??q.qy)-q.qy)*f;return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,fx:c*qx-t*qy,fy:t*qx+c*qy};});});
 const nodal=model.nodes.map(n=>({x:n.x,y:n.y,fx:selected.nodal[n.id*3],fy:selected.nodal[n.id*3+1]}));
 const patches=load==='LL'?wheelPatches(p):[];
 const vectors=load==='reaction'&&result?model.nodes.map(n=>({x:n.x,y:n.y,fx:result.manual.reactions[n.id*3],fy:result.manual.reactions[n.id*3+1]})):[...distributed,...nodal,...patches.flatMap(q=>[0.1,0.5,0.9].map(f=>({x:q.a+(q.b-q.a)*f,y:height+g.top/2,fx:0,fy:-q.q}))),...model.elements.flatMap(e=>(selected.element[e.id].points??[]).map(q=>({x:model.nodes[e.i].x+q.x,y:height+g.top/2,fx:q.px,fy:q.py})))];
 const nonzero=vectors.filter(v=>Math.hypot(v.fx,v.fy)>1e-8&&v.x>=-g.wall/2&&v.x<=width+g.wall/2),maxLoad=Math.max(1,...nonzero.map(v=>Math.hypot(v.fx,v.fy)));
 const dim=(x1:number,y1:number,x2:number,y2:number,label:string)=>{const a=X(x1),b=Y(y1),c=X(x2),d=Y(y2);return <g><path d={`M${a},${b}L${c},${d}`} stroke="#536e60" markerStart="url(#dim)" markerEnd="url(#dim)"/><text x={(a+c)/2+(x1===x2?10:0)} y={(b+d)/2-7} textAnchor={x1===x2?'start':'middle'} className="svg-label" paintOrder="stroke" stroke="#f7f9f5" strokeWidth="4">{label}</text></g>;};
 return <><div className="viewer-tools"><label><input type="checkbox" checked={dimensions} onChange={e=>setDimensions(e.target.checked)}/>尺寸標註</label><label>載重／反力 <select value={load} onChange={e=>setLoad(e.target.value)}><option value="none">隱藏</option><option value="DC">DC 自重</option><option value="DL">DL 附加靜載重</option><option value="EV">EV 覆土</option><option value="EHmin">EH 最小／自訂</option><option value="EHmax">EH 最大／自訂</option><option value="LL">LL 車載</option>{p.water.depth>0&&<option value="IW">IW 內部水壓</option>}<option value="reaction" disabled={!result}>組合支承反力</option></select></label></div><svg className="viewer" viewBox="0 0 1100 640" role="img" aria-label={`箱涵${g.cells}孔縱向斷面，${mode}視圖`}>
  <defs><pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#d4ded7"/></pattern><pattern id="concrete" width="13" height="13" patternUnits="userSpaceOnUse"><path d="M0 13L13 0" stroke="#9eafa6" strokeWidth=".45"/></pattern><marker id="arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="#b2813c"/></marker><marker id="dim" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse"><path d="M6 0L0 3L6 6" fill="#81928a"/></marker></defs>
  <rect width="1100" height="640" fill="url(#grid)"/>
  <text x="26" y="28" className="svg-label">SECTION 01 / 縱向斷面・沿行車方向</text>
  <text x="1074" y="28" textAnchor="end" className="svg-label">尺寸 m · 分析帶寬 1 m</text>
  <rect x={X(-g.wall/2)-30} y={Y(height+g.top/2+p.soil.cover)} width={geo.outerWidth*scale+60} height={p.soil.cover*scale} fill="#d9c69d" opacity=".4"/>
  <path d={`M${X(-g.wall/2)-35},${Y(height+g.top/2+p.soil.cover)}H${X(width+g.wall/2)+35}`} stroke="#97754b" strokeWidth="2"/>
  <text x={X(-g.wall/2)-30} y={Y(height+g.top/2+p.soil.cover)-8} className="svg-label">地表線　A1 → A2 行車方向</text>
  <rect x={X(-g.wall/2)} y={Y(height+g.top/2)} width={geo.outerWidth*scale} height={geo.outerHeight*scale} fill="#c3cec6" stroke="#536e60" strokeWidth="1.5"/>
  <rect x={X(-g.wall/2)} y={Y(height+g.top/2)} width={geo.outerWidth*scale} height={geo.outerHeight*scale} fill="url(#concrete)"/>
  {Array.from({length:g.cells},(_,i)=>{const l=wallX[i]+widths[i]/2,r=wallX[i+1]-widths[i+1]/2,b=g.bottom/2,t=height-g.top/2,h=g.haunch;return <g key={i}><path d={line([[l+h,b],[r-h,b],[r,b+h],[r,t-h],[r-h,t],[l+h,t],[l,t-h],[l,b+h]])+' Z'} fill="#f7f9f5" stroke="#536e60" strokeWidth="1.4"/><text x={X((l+r)/2)} y={Y(height/2)-5} textAnchor="middle" className="cell-label">{String(i+1).padStart(2,'0')}</text><text x={X((l+r)/2)} y={Y(height/2)+17} textAnchor="middle" className="svg-label">{dimensions?'':`${g.clearWidth.toFixed(2)} × ${g.clearHeight.toFixed(2)}`}</text><text x={X((l+r)/2)} y={Y(height)+4} textAnchor="middle" className="member-label">T{i+1}</text><text x={X((l+r)/2)} y={Y(0)+4} textAnchor="middle" className="member-label">B{i+1}</text></g>;})}
  {mode==='geometry'&&p.water.depth>0&&Array.from({length:g.cells},(_,i)=>{const l=wallX[i]+widths[i]/2,r=l+g.clearWidth,b=g.bottom/2,h=p.water.depth,waterY=b+h;return <g key={`water-${i}`} aria-label={`IW 孔 ${i+1}`}><rect x={X(l)} y={Y(waterY)} width={(r-l)*scale} height={h*scale} fill="#65c3e3" opacity=".18"/><path d={`M${X(l)},${Y(waterY)}H${X(r)}`} stroke="#167aa5" strokeDasharray="6 4"/><text x={X((l+r)/2)} y={Y(waterY)-5} textAnchor="middle" className="svg-label">Hw = {h.toFixed(2)} m</text>{load==='IW'&&<>{[l,r].map((x,k)=><g key={k}><path d={`M${X(x)},${Y(waterY)}L${X(x)+(k?-35:35)},${Y(b)}L${X(x)},${Y(b)}Z`} fill="#319ac5" opacity=".25"/>{[.2,.5,.8].map(f=><path key={f} d={`M${X(x)+(k?-35:35)*f},${Y(waterY-h*f)}L${X(x)},${Y(waterY-h*f)}`} stroke="#167aa5" markerEnd="url(#arrow)"/>)}</g>)}{[.2,.5,.8].map(f=><path key={f} d={`M${X(l+(r-l)*f)},${Y(b)-28}L${X(l+(r-l)*f)},${Y(b)}`} stroke="#167aa5" markerEnd="url(#arrow)"/>)}</>}</g>;})}
  {wallX.map((x,i)=><g key={i}><text x={X(x)} y={Y(height)-g.top*scale/2-15} textAnchor="middle" className="member-label">{i===0?'A1':i===g.cells?'A2':`P${i}`}</text></g>)}
  {mode==='geometry'&&load!=='none'&&nonzero.map((v,i)=>{const dx=v.fx/maxLoad*48,dy=-v.fy/maxLoad*48;return <g key={i}><path d={`M${X(v.x)-dx},${Y(v.y)-dy}L${X(v.x)},${Y(v.y)}`} stroke={load==='reaction'?'#216c88':'#b2813c'} strokeWidth="1.6" markerEnd="url(#arrow)"/>{(i===0||i===nonzero.length-1||load==='reaction')&&<text x={X(v.x)-dx+3} y={Y(v.y)-dy-5} className="svg-label">{Math.hypot(v.fx,v.fy).toFixed(2)}</text>}</g>;})}
  {mode==='geometry'&&load==='LL'&&!rules.ignored&&axles(p).filter(a=>a.x>=0&&a.x<=width).map((a,i)=><g key={i}><circle cx={X(a.x)} cy={Y(height+g.top/2+p.soil.cover)-20} r="6" fill="#163f3b"/><path d={`M${X(a.x)-13},${Y(height+g.top/2+p.soil.cover)-30}h26`} stroke="#163f3b" strokeWidth="3"/><text x={X(a.x)} y={Y(height+g.top/2+p.soil.cover)-42} textAnchor="middle" className="svg-label">{a.weight/2} kN/輪 →</text>{rules.deep&&<path d={`M${X(a.x)},${Y(height+g.top/2+p.soil.cover)}L${X(a.x-rules.length/2)},${Y(height+g.top/2)}H${X(a.x+rules.length/2)}Z`} fill="#d9ae62" opacity=".2"/>}</g>)}
  {dimensions&&<>
   {dim(-g.wall/2,-g.bottom/2-0.9,width+g.wall/2,-g.bottom/2-0.9,`總外寬 ${geo.outerWidth.toFixed(2)} m`)}
   {dim(width+g.wall/2+1.6,-g.bottom/2,width+g.wall/2+1.6,height+g.top/2,`總高 ${geo.outerHeight.toFixed(2)}`)}
   {dim(-g.wall/2-0.7,height+g.top/2,-g.wall/2-0.7,height+g.top/2+p.soil.cover,`覆土 h=${p.soil.cover.toFixed(2)}`)}
   {wallX.slice(0,-1).map((x,i)=>{const l=x+widths[i]/2,r=wallX[i+1]-widths[i+1]/2;return <g key={i}>{dim(l,height*0.35,r,height*0.35,`淨寬 ${g.clearWidth.toFixed(2)}`)}{i===0&&dim(l+g.clearWidth*0.2,g.bottom/2,l+g.clearWidth*0.2,height-g.top/2,`淨高 ${g.clearHeight.toFixed(2)}`)}</g>;})}
   {dim(g.wall/2,-g.bottom/2-0.45,width-g.wall/2,-g.bottom/2-0.45,`${g.cells===1?'S':'L'}=${(g.cells===1?rules.S:rules.L).toFixed(2)} m（端支承內面）`)}
   <text x="30" y="590" className="svg-label">頂板 {g.top}m　底板 {g.bottom}m　A1/A2 厚 {g.wall}m　{g.cells>1?`中隔牆厚 ${g.partition}m`:''}　倒角 {g.haunch}×{g.haunch}m</text>
   <path d={`M${X(width/2)},${Y(height)}L${X(width/2)+40},${Y(height)-25}`} stroke="#536e60"/><text x={X(width/2)+45} y={Y(height)-25} className="svg-label">頂板厚 {g.top}</text>
   <path d={`M${X(width/2)},${Y(0)}l35 22`} stroke="#536e60"/><text x={X(width/2)+40} y={Y(0)+22} className="svg-label">底板厚 {g.bottom}</text>
   <path d={`M${X(0)},${Y(height/2)}h-55`} stroke="#536e60"/><text x={X(0)-60} y={Y(height/2)-8} textAnchor="end" className="svg-label">A1 厚 {g.wall}</text>
   <path d={`M${X(width)},${Y(height/2)}h50`} stroke="#536e60"/><text x={X(width)+55} y={Y(height/2)-8} className="svg-label">A2 厚 {g.wall}</text>
   {wallX.slice(1,-1).map((x,i)=><g key={i}><path d={`M${X(x)},${Y(height*0.65)}l25 -15`} stroke="#536e60"/><text x={X(x)+28} y={Y(height*0.65)-15} className="svg-label">P{i+1} 厚 {g.partition}</text></g>)}
   <path d={`M${X(g.wall/2+g.haunch/2)},${Y(height-g.top/2-g.haunch/2)}l25 20`} stroke="#536e60"/><text x={X(g.wall/2+g.haunch/2)+30} y={Y(height-g.top/2-g.haunch/2)+20} className="svg-label">倒角 {g.haunch}×{g.haunch}</text>
  </>}
  {result&&['M','V','N'].includes(mode)&&result.model.elements.filter(e=>!e.rigid).map(e=>{const a=result.model.nodes[e.i],b=result.model.nodes[e.j],L=Math.hypot(b.x-a.x,b.y-a.y),nx=-(b.y-a.y)/L,ny=(b.x-a.x)/L;const samples=result.manual.stations.filter(s=>s.element===e.id);const points=samples.map(s=>{const d=s[mode as 'M'|'V'|'N']/maxForce*0.6;return [a.x+(b.x-a.x)*s.x/L+nx*d,a.y+(b.y-a.y)*s.x/L+ny*d];});return <g key={e.id}><path d={line([[a.x,a.y],...points,[b.x,b.y]])+' Z'} fill="#347c8b" fillOpacity=".16"/><path d={line(points)} fill="none" stroke="#206779" strokeWidth="2"/></g>;})}
  {result&&mode==='deformation'&&result.model.elements.map(e=>{const a=result.model.nodes[e.i],b=result.model.nodes[e.j],u=result.manual.u;return <path key={e.id} d={line([[a.x+u[a.id*3]*factor,a.y+u[a.id*3+1]*factor],[b.x+u[b.id*3]*factor,b.y+u[b.id*3+1]*factor]])} stroke="#b06146" strokeWidth="2" fill="none"/>;})}
  {Array.from({length:g.cells*3+1},(_,i)=>{const x=width*i/(g.cells*3),y=Y(-g.bottom/2)+3;return <g key={i}>{p.soil.support==='winkler'?<path d={`M${X(x)},${y}v4l-3 4l6 4l-6 4l6 4l-3 4v4`} fill="none" stroke="#899a8d"/>:<path d={`M${X(x)},${y}l-5 9h10Z`} fill="none" stroke="#899a8d"/>}</g>;})}
  <text x="30" y="608" className="svg-label">{load==='reaction'?'組合反力 kN；箭頭依絕對值比例':'基本載重（未乘組合係數）；分布力 kN/m、集中力 kN；箭頭於本圖依最大值縮放'}</text>
  <text x="30" y="630" className="svg-label">{load==='LL'?`${rules.reason}；I=${rules.impact}；E=${rules.E.toFixed(3)}m；擴散邊長=${rules.length.toFixed(3)}m`:'側壓依牆中心線高度等效，實際外廓與交接區載重待人工覆核'}</text>
  {mode==='deformation'&&<text x="25" y="410" className="svg-label">節點位移連線 ×{factor.toFixed(0)}</text>}
 </svg></>;
}
