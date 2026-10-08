import type {Project,Model,Trace} from '../../domain/src/index';
import {elementGeometry} from '../../frame2d-solver/src/index';
import {basicLoads,waterLoads,liveLoad} from '../../load-engine/src/index';
import {soilValues} from '../../soil-engine/src/index';
import {axles,vehicleRules} from '../../vehicle-engine/src/index';
export function calculationTrace(p:Project,model:Model):Trace[]{
 const out:Trace[]=[];
 const add=(stage:string,member:string,formula:string,substitution:string,result:unknown,unit:string,source:string,inputs:Record<string,unknown>={},notes='')=>out.push({stage,member,case:'未乘組合係數',formula,substitution,result,unit,source,inputs,notes,expression:formula,detail:`${substitution} = ${typeof result==='object'?JSON.stringify(result):result} ${unit}。${notes}`});
 for(const m of model.members){const e=model.elements[m.elements.find(i=>!model.elements[i].rigid)!],b=1,h=e.thickness,{L}=elementGeometry(model,e);add('斷面',m.id,'A = b h',`${b} × ${h}`,e.A,'m²','毛斷面幾何',{b,h});add('斷面',m.id,'Ig = b h³ / 12',`${b} × ${h}³ / 12`,e.I,'m⁴','毛斷面幾何',{b,h});
 for(const id of m.elements){const el=model.elements[id];if(el.rigid)continue;const length=elementGeometry(model,el).L,E=el.E,I=el.I,A=el.A;for(const [formula,substitution,result,unit] of [['EA/L',`${E} × ${A} / ${length}`,E*A/length,'kN/m'],['12EI/L³',`12 × ${E} × ${I} / ${length}³`,12*E*I/length**3,'kN/m'],['6EI/L²',`6 × ${E} × ${I} / ${length}²`,6*E*I/length**2,'kN'],['4EI/L',`4 × ${E} × ${I} / ${length}`,4*E*I/length,'kN·m'],['2EI/L',`2 × ${E} × ${I} / ${length}`,2*E*I/length,'kN·m']] as const)add('構件勁度',m.id,formula,substitution,result,unit,'Euler–Bernoulli 2D Frame',{element:id,E,I,A,L:length});}void L;
 }
 const loads=basicLoads(p,model),soil=soilValues(p);add('DC','全箱','W = γc Ac × 1m',`${p.material.concreteWeight} × ${loads.area} × 1`,p.material.concreteWeight*loads.area,'kN','實體斷面幾何',{area:loads.area,gamma:p.material.concreteWeight});
 add('EV','頂板','qEV = γv h',`${soil.vertical} × ${p.soil.cover}`,soil.vertical*p.soil.cover,'kPa','採用土壓模式',{gamma:soil.vertical,h:p.soil.cover});
 add('DL','頂板','q = qDL',`${p.soil.additionalDead}`,p.soil.additionalDead,'kPa','使用者輸入');
 for(const [variant,gamma] of [['min',soil.min],['max',soil.max]] as const){const ztop=p.soil.cover+p.geometry.top/2,zbottom=ztop+model.height,pt=gamma*ztop,pb=gamma*zbottom,H=model.height;add('EH',`A1 / A2 ${variant}`,'p = γeq z; P = (pt + pb) H / 2; y底 = H (pb + 2pt) / [3(pb + pt)]',`${gamma} × [${ztop}, ${zbottom}]; (${pt} + ${pb}) × ${H} / 2`,{ztop,zbottom,pt,pb,P:(pt+pb)*H/2,yFromBottom:pt+pb?H*(pb+2*pt)/(3*(pb+pt)):0},'m, kPa, kN',p.soil.source,{gamma,H});}
 const water=waterLoads(p,model);add('IW','各孔','pb = γw Hw; Pw = γw Hw²/2; y底 = Hw/3',`${water.gamma} × ${water.Hw}; ${water.gamma} × ${water.Hw}² / 2; ${water.Hw} / 3`,{bottomPressure:water.bottomPressure,sideForce:water.sideForce,aboveFloor:water.aboveFloor,net:water.resultant,expectedDown:water.expectedDown},'kPa, kN, m','靜水壓 p=γw z',{Hw:water.Hw,gamma:water.gamma},water.notes);
 add('LL','頂板','輪重 = 軸重/2; point = 輪重(1+I)/E; patch = 輪重(1+I)/(擴散長×分布寬)','採用目前車位與正向車輛',{vehicle:p.vehicle.type,axles:axles(p),wheelWeights:axles(p).map(a=>a.weight/2),rules:vehicleRules(p),position:p.vehicle.position,spacing:p.vehicle.rearSpacing,direction:1,applied:liveLoad(p,model)},'kN, m, kN/m','橋梁 §3.13、§4.3、§4.4',{...p.vehicle,h:p.soil.cover});
 const f=p.combination;add('Combination','全箱','a DC + b DL + c EV + d EH + e LL + f IW',`${f.dead} DC + ${f.additionalDead} DL + ${f.earthVertical} EV + ${f.earthHorizontal} EH + ${f.live} LL + ${f.water} IW`,f,'各項係數無因次',f.source,{...f});
 add('撓度','頂板','EI v″(x)=M(x); δ(x)=v(x)−[vi+(vj−vi)x/L]','桿端初值＋各載重 Macaulay 分段積分；δ′=0 分段多項式求根','Gross EI','mm', 'Euler–Bernoulli 梁理論',{},'毛斷面、線彈性、未考慮開裂；不作規範 PASS / FAIL。');
 return out;
}
