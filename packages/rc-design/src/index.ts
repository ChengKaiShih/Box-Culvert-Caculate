import type {Project,Member} from '../../domain/src/index';
import {kgfCm2ToMPa,kNToN,kNmToNmm,mToMm} from '../../units/src/index';
import {rcRules} from '../../codes-tw/src/index';
export interface Demand {N:number;M:number;}
export interface RCResult {member:string;diameter:number;spacing:number|null;asPerFace:number;minimumPerFace:number;ratio:number;maxShear:number;status:string;notes:string[];}
/** Preserve concurrent N-M pairs via their convex hull; never combine independent envelope extremes. */
export function demandHull(points:Demand[]):Demand[]{
 const sorted=points.filter(p=>Number.isFinite(p.N)&&Number.isFinite(p.M)).sort((a,b)=>a.N-b.N||a.M-b.M);
 const unique=sorted.filter((p,i)=>!i||p.N!==sorted[i-1].N||p.M!==sorted[i-1].M);if(unique.length<=2)return unique;
 const cross=(o:Demand,a:Demand,b:Demand)=>(a.N-o.N)*(b.M-o.M)-(a.M-o.M)*(b.N-o.N);
 const lower:Demand[]=[],upper:Demand[]=[];for(const p of unique){while(lower.length>=2&&cross(lower.at(-2)!,lower.at(-1)!,p)<=0)lower.pop();lower.push(p);}for(const p of [...unique].reverse()){while(upper.length>=2&&cross(upper.at(-2)!,upper.at(-1)!,p)<=0)upper.pop();upper.push(p);}lower.pop();upper.pop();return [...lower,...upper];
}
/** Symmetric two-face singly-layer reinforcement, Whitney block; compression positive internally. */
export function interactionCurve(fc:number,fy:number,h:number,cover:number,db:number,as:number){
 const {concreteStrain:ec,steelE:Es,stressBlock:alpha}=rcRules,b=1000,y=[cover+db/2,h-cover-db/2],epsy=fy/Es;
 const curve:Array<{P:number;M:number}>= [{P:-rcRules.phiTension*2*as*fy,M:0}];
 const maxP=0.8*rcRules.phiCompression*(alpha*fc*(b*h-2*as)+2*as*fy);
 for(let i=0;i<=300;i++){
  const c=h*10**(-3+5*i/300),a=Math.min(h,rcRules.beta1(fc)*c),C=alpha*fc*b*a;
  let P=C,M=C*(h/2-a/2);
  for(const yy of y){const eps=ec*(1-yy/c),stress=Math.max(-fy,Math.min(fy,Es*eps)),F=as*(stress-(yy<a?alpha*fc:0));P+=F;M+=F*(h/2-yy);}
  const et=Math.max(0,ec*(y[1]/c-1)),phi=et>=epsy+0.003?0.9:et<=epsy?0.65:0.65+0.25*(et-epsy)/0.003;
  if(phi*P<=maxP)curve.push({P:phi*P,M:Math.max(0,phi*M)});
  else if(curve.at(-1)!.P<maxP){const prev=curve.at(-1)!,r=(maxP-prev.P)/(phi*P-prev.P);curve.push({P:maxP,M:prev.M+r*(phi*M-prev.M)});}
 }
 return curve.sort((a,b)=>a.P-b.P);
}
export function momentCapacity(curve:ReturnType<typeof interactionCurve>,P:number){
 if(P<curve[0].P||P>curve.at(-1)!.P)return 0;
 let lo=0,hi=curve.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(curve[mid].P<P)lo=mid;else hi=mid;}
 const a=curve[lo],b=curve[hi];return a.M+(b.M-a.M)*(P-a.P)/(b.P-a.P||1);
}
export function designMember(p:Project,member:Member,demands:Demand[],maxShear:number):RCResult{
 const h=mToMm(member.thickness),fc=kgfCm2ToMPa(p.material.fcKgfCm2),fy=kgfCm2ToMPa(p.material.fyKgfCm2),db=p.material.barDiameterMm;
 // Explicit provisional detailing floor; not a claim to satisfy each wall/slab minimum rule.
 const min=0.0018*1000*h;let best:RCResult|undefined;
 for(const spacing of [250,225,200,175,150,125,100,75]){
  const as=Math.PI*db**2/4*1000/spacing;if(as<min)continue;
  const curve=interactionCurve(fc,fy,h,p.material.coverMm,db,as);
  let ratio=0;for(const d of demands){const P=-kNToN(d.N),cap=momentCapacity(curve,P);const r=cap>0?Math.abs(kNmToNmm(d.M))/cap:Math.abs(d.N)+Math.abs(d.M)<1e-9?0:1e9;ratio=Math.max(ratio,r);}
  best={member:member.id,diameter:db,spacing,asPerFace:as,minimumPerFace:min,ratio,maxShear,status:ratio<=1?'N–M 斷面試算符合':'需加厚或調整配筋',notes:['對稱雙面等量配筋；每面面積 mm²/m。','初步每面均採 0.0018Ag（板 §7.6.1.1）；牆及溫縮細部仍須另核。','尚未判定剪力、裂縫、溫度收縮、錨定搭接、間距及倒角鋼筋細部合格。']};
  if(ratio<=1)break;
 }
 return best??{member:member.id,diameter:db,spacing:null,asPerFace:0,minimumPerFace:min,ratio:1e9,maxShear,status:'指定鋼筋無可行間距',notes:['需調整鋼筋或斷面']};
}
