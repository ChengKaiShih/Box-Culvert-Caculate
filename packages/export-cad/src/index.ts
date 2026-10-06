import type {Analysis} from '../../result-engine/src/index';
import {geometry} from '../../geometry-engine/src/index';
export function cadData(r:Analysis){
 const g=r.project.geometry,geo=geometry(r.project),h=g.haunch,y0=g.bottom/2,y1=geo.height-g.top/2;
 const openings=Array.from({length:g.cells},(_,i)=>{const x0=geo.wallX[i]+geo.widths[i]/2,x1=geo.wallX[i+1]-geo.widths[i+1]/2;return {id:`CELL${i+1}`,closed:true,points:[[x0+h,y0],[x1-h,y0],[x1,y0+h],[x1,y1-h],[x1-h,y1],[x0+h,y1],[x0,y1-h],[x0,y0+h]]};});
 return {schema:'box-culvert-cad/2',project:r.project,loadAudit:r.audit,balance:r.balance,groundSurfaceY:geo.height+g.top/2+r.project.soil.cover,units:'m',axis:{x:'縱向／沿行車方向',y:'向上',stripWidth:1},projectName:r.project.name,engineVersion:'2.0.0-alpha.1',status:'幾何與配筋試算資料，非施工詳圖',outline:{closed:true,points:[[-g.wall/2,-g.bottom/2],[geo.width+g.wall/2,-g.bottom/2],[geo.width+g.wall/2,geo.height+g.top/2],[-g.wall/2,geo.height+g.top/2]]},openings,members:r.model.members,nodes:r.model.nodes,reinforcement:r.rc,haunch:{shape:'1:1',size:g.haunch,reinforcementStatus:'未完成錨定、彎折及施工細部設計'},warnings:r.warnings};
}
