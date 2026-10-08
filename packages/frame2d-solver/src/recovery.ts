import type {ElementLoad,Model,LoadVector,Solution} from '../../domain/src/index';
import {elementGeometry,localStiffness,transform,equivalentLoad} from './index';
const positive=(x:number)=>Math.max(0,x);
/** Exact Euler–Bernoulli integration, including member-load particular deformation. */
export function elasticCurve(L:number,EI:number,f:number[],q:ElementLoad,vi:number,theta:number){
 const terms:Array<{a:number;c:number;n:number}>=[{a:0,c:-f[2]/(2*EI),n:2},{a:0,c:f[1]/(6*EI),n:3},{a:0,c:q.qy/(24*EI),n:4},{a:0,c:((q.qyEnd??q.qy)-q.qy)/(120*L*EI),n:5}];
 for(const p of q.patches??[]){const slope=((p.qyEnd??p.qy)-p.qy)/(p.b-p.a);terms.push({a:p.a,c:p.qy/(24*EI),n:4},{a:p.b,c:-(p.qyEnd??p.qy)/(24*EI),n:4},{a:p.a,c:slope/(120*EI),n:5},{a:p.b,c:-slope/(120*EI),n:5});}
 for(const p of q.points??[])terms.push({a:p.x,c:p.py/(6*EI),n:3});
 const value=(x:number)=>vi+theta*x+terms.reduce((s,t)=>s+t.c*positive(x-t.a)**t.n,0);
 const slope=(x:number)=>theta+terms.reduce((s,t)=>s+t.n*t.c*positive(x-t.a)**(t.n-1),0);
 const breaks=[...new Set([0,L,...terms.map(t=>t.a).filter(x=>x>0&&x<L)])].sort((a,b)=>a-b);
 const choose=(n:number,k:number)=>{let v=1;for(let i=1;i<=k;i++)v*= (n-i+1)/i;return v;};
 function extrema(chordSlope=0){const xs=[...breaks];for(let j=0;j<breaks.length-1;j++){const a=breaks[j],b=breaks[j+1],co=[theta-chordSlope,0,0,0,0];for(const t of terms)if(t.a<=a){for(let k=0;k<t.n;k++)co[k]+=t.c*t.n*choose(t.n-1,k)*(a-t.a)**(t.n-1-k);}xs.push(...polynomialRoots(co,0,b-a).map(x=>a+x));}return [...new Set(xs)];}
 return {value,slope,extrema};
}
/** Root isolation by derivative roots partitions a polynomial into monotonic intervals. */
export function polynomialRoots(coeff:number[],lo:number,hi:number):number[]{
 const c=[...coeff];while(c.length>1&&Math.abs(c.at(-1)!)<1e-20)c.pop();if(c.length<=1)return [];
 if(c.length===2){const x=-c[0]/c[1];return x>=lo&&x<=hi?[x]:[];}
 const at=(x:number)=>c.reduceRight((s,v)=>s*x+v,0),critical=polynomialRoots(c.slice(1).map((v,i)=>v*(i+1)),lo,hi),cuts=[lo,...critical,hi],out:number[]=[];
 const tolerance=1e-12*Math.max(1e-12,...c.map((v,i)=>Math.abs(v)*Math.max(1,Math.abs(lo),Math.abs(hi))**i));
 for(const x of cuts)if(Math.abs(at(x))<tolerance)out.push(x);
 for(let j=0;j<cuts.length-1;j++){let a=cuts[j],b=cuts[j+1],fa=at(a);if(fa*at(b)>=0)continue;for(let k=0;k<65;k++){const m=(a+b)/2,fm=at(m);if(fa*fm<=0)b=m;else{a=m;fa=fm;}}out.push((a+b)/2);}return out;
}
export function topDeflections(model:Model,solution:Solution,load:LoadVector,caseId:string){return model.members.filter(m=>m.kind==='top').map(m=>{
 const es=m.elements.map(i=>model.elements[i]),start=model.nodes[es[0].i],end=model.nodes[es.at(-1)!.j],L=end.x-start.x,ui=solution.u[3*start.id+1],uj=solution.u[3*end.id+1],chord=(uj-ui)/L;
 type Recovery={element:number;L:number;EI:number;xLocal:number;startX:number;vi:number;thetaI:number;supportVi:number;chordSlope:number;force:number[];load:ElementLoad;rigid:boolean};
 let down={value:0,x:0,recovery:null as Recovery|null},up={value:0,x:0,recovery:null as Recovery|null};const samples:Array<{x:number;delta:number}>=[];
 for(const e of es){const a=model.nodes[e.i],len=elementGeometry(model,e).L,curve=elasticCurve(len,e.E*e.I,solution.endForces[e.id],load.element[e.id],solution.u[e.i*3+1],solution.u[e.i*3+2]);
 const delta=(x:number)=>(e.rigid?solution.u[e.i*3+1]+solution.u[e.i*3+2]*x:curve.value(x))-ui-chord*(a.x-start.x+x);
 for(const x of e.rigid?[0,len]:curve.extrema(chord)){const v=delta(x),ratio=(a.x-start.x+x)/L;const recovery={element:e.id,L:len,EI:e.E*e.I,xLocal:x,startX:a.x-start.x,vi:solution.u[e.i*3+1],thetaI:solution.u[e.i*3+2],supportVi:ui,chordSlope:chord,force:solution.endForces[e.id],load:load.element[e.id],rigid:e.rigid};if(v < -1e-12 && v<down.value)down={value:v,x:ratio,recovery};if(v > 1e-12 && v>up.value)up={value:v,x:ratio,recovery};}
 for(let k=0;k<=20;k++)samples.push({x:(a.x-start.x+len*k/20)/L,delta:delta(len*k/20)*1000});
 }
 return {member:m.id,down:{mm:-down.value*1000,xL:down.x,case:down.value<0?caseId:'無向下撓度',recovery:down.recovery},up:{mm:up.value*1000,xL:up.x,case:up.value>0?caseId:'無向上撓度',recovery:up.recovery},E:es[0].E,Ig:es[0].I,EI:es[0].E*es[0].I,samples,notes:'毛斷面、線彈性、未考慮開裂；相對於兩端中心線剛接點連線；x/L 為中心線全跨比例。'};
 });}
export function engineeringDebug(model:Model,sol:Solution,load:LoadVector){
 const residual=Array(model.nodes.length*3).fill(0);
 const elements=model.elements.map(e=>{const {L,c,s}=elementGeometry(model,e),T=transform(c,s),dofs=[e.i*3,e.i*3+1,e.i*3+2,e.j*3,e.j*3+1,e.j*3+2],u=T.map(row=>row.reduce((sum,v,j)=>sum+v*sol.u[dofs[j]],0)),f=sol.endForces[e.id];for(let j=0;j<6;j++)residual[dofs[j]]+=T.reduce((sum,row,k)=>sum+row[j]*f[k],0);return {element:e.id,member:e.member,rigid:e.rigid,i:e.i,j:e.j,L,A:e.A,Ig:e.I,E:e.E,localDisplacements:u,localEndForces:f,localStiffness:e.rigid?null:localStiffness(e,L),transformation:T,equivalentNodalLoad:equivalentLoad(load.element[e.id],L,e.rigid),dofs,memberLoad:load.element[e.id]};});
 const joints=model.nodes.filter(n=>n.master===undefined).map(root=>{const sum=[0,0,0],external=[0,0,0],reaction=[0,0,0],internal=[0,0,0];for(const n of model.nodes.filter(n=>(n.master??n.id)===root.id)){const dx=n.x-root.x,dy=n.y-root.y;for(const [target,source] of [[internal,residual],[external,load.nodal],[reaction,sol.reactions]]){target[0]+=source[n.id*3];target[1]+=source[n.id*3+1];target[2]+=source[n.id*3+2]+dx*source[n.id*3+1]-dy*source[n.id*3];}}for(let k=0;k<3;k++)sum[k]=internal[k]-external[k]-reaction[k];return {node:root.id,x:root.x,y:root.y,memberForces:internal,external,reaction,residual:sum};});
 const members=model.members.map(m=>{const all=m.elements.map(i=>model.elements[i]),flex=all.filter(e=>!e.rigid);return {member:m.id,ends:([0,1] as const).map(side=>{const face=side?flex.at(-1)!:flex[0],node=side?face.j:face.i,joint=side?all.at(-1)!.j:all[0].i,faceForce=sol.endForces[face.id].slice(side*3,side*3+3),{c,s}=elementGeometry(model,face),n=model.nodes[node],j=model.nodes[joint],jointForce=[...faceForce];jointForce[2]+=(n.x-j.x)*(s*faceForce[0]+c*faceForce[1])-(n.y-j.y)*(c*faceForce[0]-s*faceForce[1]);
 // Subtract external loads on the associated rigid end; local rigid f = -equivalent load.
 for(const e of all.filter(e=>e.rigid&&(side?e.j===joint:e.i===joint))){const f=sol.endForces[e.id];for(const [id,k] of [[e.i,0],[e.j,3]]){const r=model.nodes[id];jointForce[0]+=f[k];jointForce[1]+=f[k+1];jointForce[2]+=f[k+2]+(r.x-j.x)*(s*f[k]+c*f[k+1])-(r.y-j.y)*(c*f[k]-s*f[k+1]);}}
 return {end:side?'j':'i',jointNode:joint,faceNode:node,jointDisplacements:[c*sol.u[3*joint]+s*sol.u[3*joint+1],-s*sol.u[3*joint]+c*sol.u[3*joint+1],sol.u[3*joint+2]],faceDisplacements:elements[face.id].localDisplacements.slice(side*3,side*3+3),faceForce,jointForce};})};});
 return {case:load.label,elements,members,joints,load,notes:'端力採節點施於構件之局部正向；Joint 為剛域載重及偏距平移後端力。節點平衡包含外加節點力、支承及剛域從屬節點。'};
}
