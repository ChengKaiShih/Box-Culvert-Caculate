import type {Element,ElementLoad,LoadVector,Model,Project,Solution,Station} from '../../domain/src/index';
type Matrix=number[][];
const zeros=(n:number,m=n):Matrix=>Array.from({length:n},()=>Array(m).fill(0));
const matvec=(a:Matrix,x:number[])=>a.map(row=>row.reduce((s,v,j)=>s+v*x[j],0));
function localStiffness(e:Element,L:number):Matrix {
 const a=e.E*e.A/L,b=12*e.E*e.I/L**3,c=6*e.E*e.I/L**2,d=4*e.E*e.I/L,h=d/2;
 return [[a,0,0,-a,0,0],[0,b,c,0,-b,c],[0,c,d,0,-c,h],[-a,0,0,a,0,0],[0,-b,-c,0,b,-c],[0,c,h,0,-c,d]];
}
export function elementGeometry(model:Model,e:Element){const a=model.nodes[e.i],b=model.nodes[e.j],L=Math.hypot(b.x-a.x,b.y-a.y);return {L,c:(b.x-a.x)/L,s:(b.y-a.y)/L};}
function transform(c:number,s:number):Matrix{return [[c,s,0,0,0,0],[-s,c,0,0,0,0],[0,0,1,0,0,0],[0,0,0,c,s,0],[0,0,0,-s,c,0],[0,0,0,0,0,1]];}
/** Exact integration for constant patch loads; 3-point Gauss integrates cubic shape functions. */
export function equivalentLoad(load:ElementLoad,L:number,rigid=false):number[]{
 const f=Array(6).fill(0);
 const patches=[{a:0,b:L,qx:load.qx,qy:load.qy,qxEnd:load.qxEnd,qyEnd:load.qyEnd},...(load.patches??[])];
 for(const p of patches){const a=Math.max(0,p.a),b=Math.min(L,p.b);if(b<=a)continue;
  const r=Math.sqrt(3/5);for(const [z,w] of [[-r,5/9],[0,8/9],[r,5/9]]){
   const x=(a+b)/2+z*(b-a)/2,t=x/L,weight=w*(b-a)/2;
   const n=rigid?[1-t,0,t,0]:[1-3*t*t+2*t**3,L*(t-2*t*t+t**3),3*t*t-2*t**3,L*(-t*t+t**3)];
   const qx=p.qx+('qxEnd' in p&&p.qxEnd!==undefined?(p.qxEnd-p.qx)*t:0),qy=p.qy+('qyEnd' in p&&p.qyEnd!==undefined?(p.qyEnd-p.qy)*t:0);
   f[0]+=qx*(1-t)*weight;f[3]+=qx*t*weight;
   f[1]+=qy*n[0]*weight;f[2]+=qy*n[1]*weight;f[4]+=qy*n[2]*weight;f[5]+=qy*n[3]*weight;
  }
 }
 for(const p of load.points??[]){if(p.x<0||p.x>L)continue;const t=p.x/L,n=rigid?[1-t,0,t,0]:[1-3*t*t+2*t**3,L*(t-2*t*t+t**3),3*t*t-2*t**3,L*(-t*t+t**3)];f[0]+=p.px*(1-t);f[3]+=p.px*t;f[1]+=p.py*n[0];f[2]+=p.py*n[1];f[4]+=p.py*n[2];f[5]+=p.py*n[3];}
 return f;
}
/** A factored model is reused for all vehicle positions; rigid offsets use exact kinematic constraints. */
export function prepareSolver(model:Model,support?:Project['soil']){
 const n=model.nodes.length*3,roots=model.nodes.filter(n=>n.master===undefined),rootIndex=new Map(roots.map((r,i)=>[r.id,i*3]));
 const maps:Array<Array<[number,number]>>=[];
 for(const node of model.nodes){const master=model.nodes[node.master??node.id],r=rootIndex.get(master.id)!;const dx=node.x-master.x,dy=node.y-master.y;maps.push([[r,1],[r+2,-dy]],[[r+1,1],[r+2,dx]],[[r+2,1]]);}
 const nr=roots.length*3,K=zeros(nr);const cache=model.elements.map(e=>{
  const {L,c,s}=elementGeometry(model,e),T=transform(c,s),k=e.rigid?zeros(6):localStiffness(e,L),dofs=[e.i*3,e.i*3+1,e.i*3+2,e.j*3,e.j*3+1,e.j*3+2];
  const B=zeros(6,nr);for(let a=0;a<6;a++)for(let b=0;b<6;b++)for(const [idx,w] of maps[dofs[b]])B[a][idx]+=T[a][b]*w;
  const active=Array.from(new Set(dofs.flatMap(d=>maps[d].map(([r])=>r))));
  if(!e.rigid)for(const a of active)for(const b of active){let v=0;for(let i=0;i<6;i++)for(let j=0;j<6;j++)v+=B[i][a]*k[i][j]*B[j][b];K[a][b]+=v;}
  return {L,T,k,dofs,B,active};
 });
 const springs=Array(n).fill(0),fixed=new Set<number>();
 if(support){
  const ids=model.bottomNodes,first=model.nodes[ids[0]];fixed.add(rootIndex.get(first.master??first.id)!);
  if(support.support==='rigid')for(const id of ids){const node=model.nodes[id],r=rootIndex.get(node.master??node.id)!;fixed.add(r+1);if(node.master!==undefined)fixed.add(r+2);}
  else for(let i=0;i<ids.length;i++){
   const x=model.nodes[ids[i]].x,left=i?x-model.nodes[ids[i-1]].x:0,right=i<ids.length-1?model.nodes[ids[i+1]].x-x:0;
   const k=support.ks*(left+right)/2,dof=ids[i]*3+1;springs[dof]=k;
   for(const [a,wa] of maps[dof])for(const [b,wb] of maps[dof])K[a][b]+=k*wa*wb;
  }
 }
 function factor(constrained:number[]=[]){
  for(const d of constrained){const entries=maps[d].filter(([,w])=>w!==0);if(entries.length!==1)throw new Error('測試拘束不可指定剛域從屬節點');fixed.add(entries[0][0]);}
  const free=Array.from({length:nr},(_,i)=>i).filter(i=>!fixed.has(i));
  const scale=free.map(i=>Math.sqrt(K[i][i]));if(scale.some(s=>!Number.isFinite(s)||s<=0))throw new Error('模型不穩定：自由度缺乏勁度或支承');
  const C=zeros(free.length);
  for(let i=0;i<free.length;i++)for(let j=0;j<=i;j++){let s=K[free[i]][free[j]]/scale[i]/scale[j];for(let k=0;k<j;k++)s-=C[i][k]*C[j][k];if(i===j){if(s<1e-12)throw new Error('模型奇異或支承不足');C[i][j]=Math.sqrt(s);}else C[i][j]=s/C[j][j];}
  return (load:LoadVector):Solution=>{
   if(load.nodal.length!==n||load.element.length!==model.elements.length)throw new Error('載重與模型尺寸不符');
   const F=[...load.nodal];const localLoads=cache.map((a,i)=>equivalentLoad(load.element[i],a.L,model.elements[i].rigid));
   cache.forEach((a,i)=>{for(let j=0;j<6;j++)for(let k=0;k<6;k++)F[a.dofs[j]]+=a.T[k][j]*localLoads[i][k];});
   if(F.some(v=>!Number.isFinite(v)))throw new Error('載重包含非有限數值');
   const Fr=Array(nr).fill(0);for(let i=0;i<n;i++)for(const [a,w] of maps[i])Fr[a]+=w*F[i];
   const y=Array(free.length).fill(0),z=Array(free.length).fill(0),ur=Array(nr).fill(0);
   for(let i=0;i<free.length;i++){let s=Fr[free[i]]/scale[i];for(let j=0;j<i;j++)s-=C[i][j]*y[j];y[i]=s/C[i][i];}
   for(let i=free.length-1;i>=0;i--){let s=y[i];for(let j=i+1;j<free.length;j++)s-=C[j][i]*z[j];z[i]=s/C[i][i];ur[free[i]]=z[i]/scale[i];}
   const u=maps.map(row=>row.reduce((s,[i,w])=>s+w*ur[i],0)),res=matvec(K,ur).map((v,i)=>v-Fr[i]);
   const reactions=u.map((v,i)=>-springs[i]*v);for(const root of roots){const r=rootIndex.get(root.id)!;for(let k=0;k<3;k++)if(fixed.has(r+k))reactions[root.id*3+k]+=res[r+k];}
   const endForces=cache.map((a,i)=>matvec(a.k,matvec(a.T,a.dofs.map(d=>u[d]))).map((v,j)=>v-localLoads[i][j]));
   const stations:Station[]=[];
   cache.forEach((a,i)=>{
    const e=model.elements[i];if(e.rigid)return;
    const f=endForces[i],q=load.element[i],breaks=[0,a.L,...(q.points??[]).map(p=>p.x),...(q.patches??[]).flatMap(p=>[Math.max(0,p.a),Math.min(a.L,p.b)])].sort((a,b)=>a-b);
    const cut=(x:number,left=false)=>{
     const dx=((q.qxEnd??q.qx)-q.qx)/a.L,dy=((q.qyEnd??q.qy)-q.qy)/a.L;
     let N=-f[0]-q.qx*x-dx*x*x/2,V=f[1]+q.qy*x+dy*x*x/2,M=-f[2]+f[1]*x+q.qy*x*x/2+dy*x**3/6;
     for(const p of q.patches??[]){const l=Math.max(0,Math.min(x,p.b)-p.a);if(l>0){N-=p.qx*l;V+=p.qy*l;M+=p.qy*l*(x-p.a-l/2);}}
     for(const p of q.points??[]){if(x>p.x||(!left&&x===p.x)){N-=p.px;V+=p.py;M+=p.py*(x-p.x);}}
     return {element:i,member:e.member,x,N,V,M};
    };
    const xs=[0,a.L/4,a.L/2,3*a.L/4,a.L,...breaks];
    for(let j=0;j<breaks.length-1;j++){const l=breaks[j],r=breaks[j+1],mid=(l+r)/2,slope=((q.qyEnd??q.qy)-q.qy)/a.L,w=q.qy+slope*l+(q.patches??[]).filter(p=>mid>p.a&&mid<p.b).reduce((s,p)=>s+p.qy,0),vl=cut(l).V;const roots:number[]=[];if(Math.abs(slope)<1e-12){if(Math.abs(w)>1e-12)roots.push(-vl/w);}else{const D=w*w-2*slope*vl;if(D>=0)roots.push((-w+Math.sqrt(D))/slope,(-w-Math.sqrt(D))/slope);}for(const dx of roots){const x=l+dx;if(x>l&&x<r)xs.push(x);}}
    for(const x of [...new Set(xs)].sort((a,b)=>a-b)){stations.push(cut(x));if((q.points??[]).some(p=>p.x===x))stations.push(cut(x,true));}
   });
   return {u,reactions,stations,endForces,residual:Math.max(0,...free.map(i=>Math.abs(res[i])))/Math.max(1,...Fr.map(Math.abs))};
  };
 }
 return {factor};
}
export function emptyLoad(model:Model,label=''):LoadVector{return {label,nodal:Array(model.nodes.length*3).fill(0),element:model.elements.map(()=>({qx:0,qy:0}))};}
