import type {Project,Model,LoadVector} from '../../domain/src/index';
import {emptyLoad,elementGeometry,equivalentLoad} from '../../frame2d-solver/src/index';
import {geometry} from '../../geometry-engine/src/index';
import {lateralPressure,soilValues} from '../../soil-engine/src/index';
import {wheelPatches,wheelPoints,vehicleRules} from '../../vehicle-engine/src/index';
export function basicLoads(p:Project,model:Model){
 const DC=emptyLoad(model,'DC'),EV=emptyLoad(model,'EV'),EHmin=emptyLoad(model,'EH_min'),EHmax=emptyLoad(model,'EH_max'),DL=emptyLoad(model,'DL');
 const g=p.geometry,{height}=model,geo=geometry(p),gamma=p.material.concreteWeight;
 for(const e of model.elements){
  const {c,s}=elementGeometry(model,e);
  // Slab weights plus clear-height wall weights avoid joint-volume double counting.
  const weight=e.thickness*gamma*(e.kind==='wall'?g.clearHeight/height:1);
  DC.element[e.id]={qx:-s*weight,qy:-c*weight};
  if(e.kind==='top'){EV.element[e.id].qy=-soilValues(p).vertical*p.soil.cover;DL.element[e.id].qy=-p.soil.additionalDead;}
  if(e.member==='A1'||e.member==='A2'){
   const sign=e.member==='A1'?1:-1;
   for(const [load,variant] of [[EHmin,'min'],[EHmax,'max']] as const){const a=lateralPressure(p,model.nodes[e.i].y,height,variant),b=lateralPressure(p,model.nodes[e.j].y,height,variant);load.element[e.id]={qx:sign*c*a,qy:-sign*s*a,qxEnd:sign*c*b,qyEnd:-sign*s*b};}
  }
 }
 // Half-wall slab overhangs: resultant acts at the exterior-wall centerline; eccentric torsion not modeled.
 for(const node of model.nodes.filter(n=>n.master===undefined&&(n.x===0||n.x===model.width)&&(n.y===0||n.y===height))){
  DC.nodal[node.id*3+1]-=gamma*g.wall/2*(node.y===0?g.bottom:g.top);
  if(node.y===height){EV.nodal[node.id*3+1]-=soilValues(p).vertical*p.soil.cover*g.wall/2;DL.nodal[node.id*3+1]-=p.soil.additionalDead*g.wall/2;}
 }
 // Each opening has four triangular haunches; concentrate each at its corner master.
 for(const node of model.nodes.filter(n=>n.master===undefined&&model.wallX.includes(n.x)&&(n.y===0||n.y===height))){
  const sides=node.x===0||node.x===model.width?1:2;DC.nodal[node.id*3+1]-=sides*gamma*g.haunch**2/2;
 }
 return {DC,EV,EHmin,EHmax,DL,IW:waterLoads(p,model).net,area:geo.area};
}
export function liveLoad(p:Project,model:Model,position=p.vehicle.position,spacing=p.vehicle.rearSpacing,direction=1,plate=false){
 const LL=emptyLoad(model,'LL + IM');const patches=plate?[]:wheelPatches(p,position,spacing,direction);
 const points=plate||!vehicleRules(p).deep?wheelPoints(p,position,spacing,direction):[];
 for(const e of model.elements)if(e.kind==='top'){
  const x=model.nodes[e.i].x,L=elementGeometry(model,e).L;
  LL.element[e.id].patches=patches.map(p=>({a:Math.max(0,p.a-x),b:Math.min(L,p.b-x),qx:0,qy:-p.q})).filter(p=>p.b>p.a);
 }
 for(const point of points){
  const e=model.elements.find(e=>e.kind==='top'&&point.x>=model.nodes[e.i].x-1e-9&&point.x<=model.nodes[e.j].x+1e-9);
  if(e)(LL.element[e.id].points??=[]).push({x:Math.max(0,Math.min(elementGeometry(model,e).L,point.x-model.nodes[e.i].x)),px:0,py:-point.force});
 }
 return LL;
}
export function combine(model:Model,parts:Array<[LoadVector,number]>,label:string):LoadVector {
 const out=emptyLoad(model,label);
 for(const [load,factor] of parts){for(let i=0;i<out.nodal.length;i++)out.nodal[i]+=load.nodal[i]*factor;
  load.element.forEach((q,i)=>{const r=out.element[i];r.qxEnd=(r.qxEnd??0)+(q.qxEnd??q.qx)*factor;r.qyEnd=(r.qyEnd??0)+(q.qyEnd??q.qy)*factor;r.qx+=q.qx*factor;r.qy+=q.qy*factor;r.points=[...(r.points??[]),...(q.points??[]).map(p=>({...p,px:p.px*factor,py:p.py*factor}))];r.patches=[...(r.patches??[]),...(q.patches??[]).map(p=>({...p,qx:p.qx*factor,qy:p.qy*factor,qxEnd:(p.qxEnd??p.qx)*factor,qyEnd:(p.qyEnd??p.qy)*factor}))];});
 }return out;
}

export function resultant(model:Model,load:LoadVector){
 let fx=0,fy=0,mz=0;
 model.nodes.forEach(n=>{const x=load.nodal[3*n.id],y=load.nodal[3*n.id+1];fx+=x;fy+=y;mz+=n.x*y-n.y*x+load.nodal[3*n.id+2];});
 model.elements.forEach(e=>{const {L,c,s}=elementGeometry(model,e),f=equivalentLoad(load.element[e.id],L,e.rigid);[e.i,e.j].forEach((id,k)=>{const n=model.nodes[id],j=k*3,x=c*f[j]-s*f[j+1],y=s*f[j]+c*f[j+1];fx+=x;fy+=y;mz+=n.x*y-n.y*x+f[j+2];});});return {fx,fy,mz};
}
export function loadAudit(p:Project,model:Model){
 const g=p.geometry,geo=geometry(p),gamma=p.material.concreteWeight,loads=basicLoads(p,model),soil=soilValues(p),rules=vehicleRules(p);
 const parts=[{name:'頂板',weight:geo.outerWidth*g.top*gamma},{name:'底板',weight:geo.outerWidth*g.bottom*gamma},{name:'外牆 A1+A2',weight:2*g.wall*g.clearHeight*gamma},{name:'中隔牆',weight:(g.cells-1)*g.partition*g.clearHeight*gamma},{name:'倒角',weight:2*g.cells*g.haunch**2*gamma}];
 const geometric=geo.area*gamma,applied=-resultant(model,loads.DC).fy;
 const rows=[{name:'DC 自重',formula:'γc × Ac × 1m',value:geometric,unit:'kN / 1m 帶',force:applied},
 {name:'DL 附加靜載重',formula:'qDL × 1m',value:p.soil.additionalDead,unit:'kN/m',force:-resultant(model,loads.DL).fy},
 {name:'EV 垂直覆土',formula:`${soil.vertical} × ${p.soil.cover}`,value:soil.vertical*p.soil.cover,unit:'kPa',force:-resultant(model,loads.EV).fy}];
 const earth=(['min','max'] as const).map(variant=>{const top=lateralPressure(p,model.height,model.height,variant),bottom=lateralPressure(p,0,model.height,variant);return {variant,top,bottom,force:(top+bottom)*model.height/2};});
 return {parts,geometric,applied,difference:applied-geometric,rows,earth,rules};
}

/** Rectangular interior wet faces. Each cell contributes both walls independently. */
export function waterLoads(p:Project,model:Model){
 const gamma=9.80665,Hw=p.water.depth,floor=p.geometry.bottom/2;
 const sides:Array<{cell:number;member:string;sign:number;load:LoadVector}>=[],bottoms:LoadVector[]=[];
 for(let cell=0;cell<p.geometry.cells&&Hw>0;cell++){
  for(const [wall,sign] of [[cell,-1],[cell+1,1]]){
   const member=wall===0?'A1':wall===p.geometry.cells?'A2':`P${wall}`,load=emptyLoad(model,`IW cell ${cell+1} ${member}`);
   for(const e of model.elements.filter(e=>e.member===member)){
    const y=model.nodes[e.i].y,{L,c,s}=elementGeometry(model,e),a=Math.max(0,floor-y),b=Math.min(L,floor+Hw-y);
    if(b>a){const pa=gamma*(floor+Hw-y-a)*sign,pb=gamma*(floor+Hw-y-b)*sign;load.element[e.id].patches=[{a,b,qx:c*pa,qy:-s*pa,qxEnd:c*pb,qyEnd:-s*pb}];}
   }sides.push({cell:cell+1,member,sign,load});
  }
  const load=emptyLoad(model,`IW bottom ${cell+1}`),l=model.wallX[cell]+(cell===0?p.geometry.wall:p.geometry.partition)/2,r=l+p.geometry.clearWidth;
  for(const e of model.elements.filter(e=>e.member===`B${cell+1}`)){const x=model.nodes[e.i].x,L=elementGeometry(model,e).L,a=Math.max(0,l-x),b=Math.min(L,r-x);if(b>a)load.element[e.id].patches=[{a,b,qx:0,qy:-gamma*Hw}];}bottoms.push(load);
 }
 const net=combine(model,[...sides.map(s=>s.load),...bottoms].map(l=>[l,1]),'IW');
 return {net,sides,bottoms,gamma,Hw,bottomPressure:gamma*Hw,sideForce:gamma*Hw**2/2,aboveFloor:Hw/3,expectedDown:gamma*Hw*p.geometry.clearWidth*p.geometry.cells,resultant:resultant(model,net),notes:'倒角濕周水壓尚未獨立積分。採矩形淨孔垂直牆面與水平底板模型；各孔同水深。'};
}
