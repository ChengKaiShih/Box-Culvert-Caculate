import type {Project} from '../../../packages/domain/src/index';
import type {Analysis} from '../../../packages/result-engine/src/index';
import {geometry} from '../../../packages/geometry-engine/src/index';
import {axles} from '../../../packages/vehicle-engine/src/index';
export type ViewMode='geometry'|'M'|'V'|'N'|'deformation';
export default function Viewer({project:p,result,mode}:{project:Project;result:Analysis|null;mode:ViewMode}){
 let geo:ReturnType<typeof geometry>;try{geo=geometry(p);}catch{return <div className="empty">請修正左側輸入，預覽將自動更新。</div>;}
 const g=p.geometry,{width,height,wallX,widths}=geo,scale=Math.min(920/(geo.outerWidth+1),265/(geo.outerHeight+1)),ox=(1100-width*scale)/2,oy=355;
 const X=(x:number)=>ox+x*scale,Y=(y:number)=>oy-y*scale;
 const line=(points:number[][])=>points.map(([x,y],i)=>`${i?'L':'M'}${X(x)},${Y(y)}`).join(' ');
 const maxForce=result&&['M','V','N'].includes(mode)?Math.max(1,...result.manual.stations.map(s=>Math.abs(s[mode as 'M'|'V'|'N']))):1;
 const maxU=result?Math.max(1e-9,...result.manual.u.filter((_,i)=>i%3!==2).map(Math.abs)):1;
 const factor=0.4/maxU;
 return <svg className="viewer" viewBox="0 0 1100 440" role="img" aria-label={`箱涵${g.cells}孔縱向斷面，${mode}視圖`}>
  <defs><pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#d4ded7"/></pattern><pattern id="concrete" width="13" height="13" patternUnits="userSpaceOnUse"><path d="M0 13L13 0" stroke="#9eafa6" strokeWidth=".45"/></pattern><marker id="arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="#b2813c"/></marker><marker id="dim" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse"><path d="M6 0L0 3L6 6" fill="#81928a"/></marker></defs>
  <rect width="1100" height="440" fill="url(#grid)"/>
  <text x="26" y="28" className="svg-label">SECTION 01 / 縱向斷面・沿行車方向</text>
  <text x="1074" y="28" textAnchor="end" className="svg-label">尺寸 m · 分析帶寬 1 m</text>
  <rect x={X(-g.wall/2)} y={Y(height+g.top/2)} width={geo.outerWidth*scale} height={geo.outerHeight*scale} fill="#c3cec6" stroke="#536e60" strokeWidth="1.5"/>
  <rect x={X(-g.wall/2)} y={Y(height+g.top/2)} width={geo.outerWidth*scale} height={geo.outerHeight*scale} fill="url(#concrete)"/>
  {Array.from({length:g.cells},(_,i)=>{const l=wallX[i]+widths[i]/2,r=wallX[i+1]-widths[i+1]/2,b=g.bottom/2,t=height-g.top/2,h=g.haunch;return <g key={i}><path d={line([[l+h,b],[r-h,b],[r,b+h],[r,t-h],[r-h,t],[l+h,t],[l,t-h],[l,b+h]])+' Z'} fill="#f7f9f5" stroke="#536e60" strokeWidth="1.4"/><text x={X((l+r)/2)} y={Y(height/2)-5} textAnchor="middle" className="cell-label">{String(i+1).padStart(2,'0')}</text><text x={X((l+r)/2)} y={Y(height/2)+17} textAnchor="middle" className="svg-label">{g.clearWidth.toFixed(2)} × {g.clearHeight.toFixed(2)}</text><text x={X((l+r)/2)} y={Y(height)+4} textAnchor="middle" className="member-label">T{i+1}</text><text x={X((l+r)/2)} y={Y(0)+4} textAnchor="middle" className="member-label">B{i+1}</text></g>;})}
  {wallX.map((x,i)=><g key={i}><text x={X(x)} y={Y(height)-g.top*scale/2-15} textAnchor="middle" className="member-label">{i===0?'A1':i===g.cells?'A2':`P${i}`}</text></g>)}
  {mode==='geometry'&&Array.from({length:Math.max(5,g.cells*4)},(_,i)=>{const x=width*(i+0.5)/Math.max(5,g.cells*4);return <path key={i} d={`M${X(x)},${Y(height+g.top/2)-45}v30`} stroke="#b2813c" strokeWidth="1.2" markerEnd="url(#arrow)"/>;})}
  {mode==='geometry'&&axles(p).filter(a=>a.x>=0&&a.x<=width).map((a,i)=><g key={i}><path d={`M${X(a.x)},${Y(height+g.top/2)-78}v47`} stroke="#163f3b" strokeWidth="2"/><circle cx={X(a.x)} cy={Y(height+g.top/2)-80} r="5" fill="#163f3b"/><text x={X(a.x)+8} y={Y(height+g.top/2)-63} className="svg-label">{a.weight/2} kN/輪</text></g>)}
  {result&&['M','V','N'].includes(mode)&&result.model.elements.filter(e=>!e.rigid).map(e=>{const a=result.model.nodes[e.i],b=result.model.nodes[e.j],L=Math.hypot(b.x-a.x,b.y-a.y),nx=-(b.y-a.y)/L,ny=(b.x-a.x)/L;const samples=result.manual.stations.filter(s=>s.element===e.id);const points=samples.map(s=>{const d=s[mode as 'M'|'V'|'N']/maxForce*0.6;return [a.x+(b.x-a.x)*s.x/L+nx*d,a.y+(b.y-a.y)*s.x/L+ny*d];});return <g key={e.id}><path d={line([[a.x,a.y],...points,[b.x,b.y]])+' Z'} fill="#347c8b" fillOpacity=".16"/><path d={line(points)} fill="none" stroke="#206779" strokeWidth="2"/></g>;})}
  {result&&mode==='deformation'&&result.model.elements.map(e=>{const a=result.model.nodes[e.i],b=result.model.nodes[e.j],u=result.manual.u;return <path key={e.id} d={line([[a.x+u[a.id*3]*factor,a.y+u[a.id*3+1]*factor],[b.x+u[b.id*3]*factor,b.y+u[b.id*3+1]*factor]])} stroke="#b06146" strokeWidth="2" fill="none"/>;})}
  {Array.from({length:g.cells*3+1},(_,i)=>{const x=width*i/(g.cells*3),y=Y(-g.bottom/2)+3;return <g key={i}>{p.soil.support==='winkler'?<path d={`M${X(x)},${y}v4l-3 4l6 4l-6 4l6 4l-3 4v4`} fill="none" stroke="#899a8d"/>:<path d={`M${X(x)},${y}l-5 9h10Z`} fill="none" stroke="#899a8d"/>}</g>;})}
  <path d={`M${X(-g.wall/2)},408H${X(width+g.wall/2)}`} stroke="#81928a" markerStart="url(#dim)" markerEnd="url(#dim)"/><text x="550" y="430" textAnchor="middle" className="svg-label">總寬 {geo.outerWidth.toFixed(2)} m　／　{p.soil.support==='winkler'?`Winkler・ks ${p.soil.ks.toLocaleString()} kN/m³`:'Rigid Base・剛性基底'}</text>
  {mode==='deformation'&&<text x="25" y="410" className="svg-label">節點位移連線 ×{factor.toFixed(0)}</text>}
 </svg>;
}
