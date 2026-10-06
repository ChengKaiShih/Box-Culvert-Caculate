import type {Project,Model,LoadVector} from '../../domain/src/index';
import {emptyLoad,elementGeometry} from '../../frame2d-solver/src/index';
import {geometry} from '../../geometry-engine/src/index';
import {lateralPressure} from '../../soil-engine/src/index';
import {wheelPatches} from '../../vehicle-engine/src/index';
export function basicLoads(p:Project,model:Model){
 const DC=emptyLoad(model,'DC'),EV=emptyLoad(model,'EV'),EHmin=emptyLoad(model,'EH_min'),EHmax=emptyLoad(model,'EH_max'),LS=emptyLoad(model,'LS');
 const g=p.geometry,{height}=model,geo=geometry(p),gamma=p.material.concreteWeight;
 for(const e of model.elements){
  const {c,s}=elementGeometry(model,e);
  // Slab weights plus clear-height wall weights avoid joint-volume double counting.
  const weight=e.thickness*gamma*(e.kind==='wall'?g.clearHeight/height:1);
  DC.element[e.id]={qx:-s*weight,qy:-c*weight};
  if(e.kind==='top'){EV.element[e.id].qy=-p.soil.unitWeight*p.soil.cover;LS.element[e.id].qy=-p.soil.surcharge;}
  if(e.member==='A1'||e.member==='A2'){
   const sign=e.member==='A1'?1:-1;
   for(const [load,variant] of [[EHmin,'min'],[EHmax,'max']] as const){const a=lateralPressure(p,model.nodes[e.i].y,height,variant),b=lateralPressure(p,model.nodes[e.j].y,height,variant);load.element[e.id]={qx:sign*c*a,qy:-sign*s*a,qxEnd:sign*c*b,qyEnd:-sign*s*b};}
   LS.element[e.id]={qx:sign*c*p.soil.lateralK*p.soil.surcharge,qy:-sign*s*p.soil.lateralK*p.soil.surcharge};
  }
 }
 // Half-wall slab overhangs: resultant acts at the exterior-wall centerline; eccentric torsion not modeled.
 for(const node of model.nodes.filter(n=>n.master===undefined&&(n.x===0||n.x===model.width)&&(n.y===0||n.y===height))){
  DC.nodal[node.id*3+1]-=gamma*g.wall/2*(node.y===0?g.bottom:g.top);
  if(node.y===height){EV.nodal[node.id*3+1]-=p.soil.unitWeight*p.soil.cover*g.wall/2;LS.nodal[node.id*3+1]-=p.soil.surcharge*g.wall/2;}
 }
 // Each opening has four triangular haunches; concentrate each at its corner master.
 for(const node of model.nodes.filter(n=>n.master===undefined&&model.wallX.includes(n.x)&&(n.y===0||n.y===height))){
  const sides=node.x===0||node.x===model.width?1:2;DC.nodal[node.id*3+1]-=sides*gamma*g.haunch**2/2;
 }
 return {DC,EV,EHmin,EHmax,LS,area:geo.area};
}
export function liveLoad(p:Project,model:Model,position=p.vehicle.position,spacing=p.vehicle.rearSpacing,direction=1){
 const LL=emptyLoad(model,'LL + IM');const patches=wheelPatches(p,position,spacing,direction);
 for(const e of model.elements)if(e.kind==='top'){
  const x=model.nodes[e.i].x,L=elementGeometry(model,e).L;
  LL.element[e.id].patches=patches.map(p=>({a:Math.max(0,p.a-x),b:Math.min(L,p.b-x),qx:0,qy:-p.q})).filter(p=>p.b>p.a);
 }
 return LL;
}
export function combine(model:Model,parts:Array<[LoadVector,number]>,label:string):LoadVector {
 const out=emptyLoad(model,label);
 for(const [load,factor] of parts){for(let i=0;i<out.nodal.length;i++)out.nodal[i]+=load.nodal[i]*factor;
  load.element.forEach((q,i)=>{const r=out.element[i];r.qxEnd=(r.qxEnd??0)+(q.qxEnd??q.qx)*factor;r.qyEnd=(r.qyEnd??0)+(q.qyEnd??q.qy)*factor;r.qx+=q.qx*factor;r.qy+=q.qy*factor;r.patches=[...(r.patches??[]),...(q.patches??[]).map(p=>({...p,qx:p.qx*factor,qy:p.qy*factor}))];});
 }return out;
}
