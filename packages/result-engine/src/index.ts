import {topDeflections,engineeringDebug} from '../../frame2d-solver/src/recovery';
import {calculationTrace} from './trace';
import {waterLoads} from '../../load-engine/src/index';
import {validateProject,type Project,type Model,type Solution,type Trace,type LoadVector} from '../../domain/src/index';
import {generateModel} from '../../model-generator/src/index';
import {prepareSolver} from '../../frame2d-solver/src/index';
import {basicLoads,liveLoad,combine,loadAudit,resultant} from '../../load-engine/src/index';
import {scanConfigurations,impact,vehicleRules} from '../../vehicle-engine/src/index';
import {demandHull,designMember,type Demand,type RCResult} from '../../rc-design/src/index';
import {assumptions,codeRegister} from '../../codes-tw/src/index';
import {soilSource,soilValues} from '../../soil-engine/src/index';
export interface Extremum {value:number;caseId:string;position:number;spacing:number;direction:number;element:number;x:number;N:number;M:number;}
export interface MemberEnvelope {member:string;Mmin:Extremum;Mmax:Extremum;Vmin:Extremum;Vmax:Extremum;Nmin:Extremum;Nmax:Extremum;}
export interface Analysis {system:ReturnType<ReturnType<typeof prepareSolver>['system']>;deflections:ReturnType<typeof topDeflections>;debug:ReturnType<typeof engineeringDebug>;water:ReturnType<typeof waterLoads>;project:Project;model:Model;manual:Solution;envelope:MemberEnvelope[];rc:RCResult[];trace:Trace[];warnings:string[];cases:number;maxResidual:number;minVerticalReaction:number;mode:'manual'|'envelope';durationMs:number;audit:ReturnType<typeof loadAudit>;balance:{fx:number;fy:number;mz:number};liveComparison:{member:string;fill:number;plate:number;adopted:number}[];}
export function analyze(project:Project,mode:'manual'|'envelope'='manual',progress?:(done:number,total:number)=>void):Analysis {
 validateProject(project);const p=structuredClone(project),start=performance.now(),model=generateModel(p),solver=prepareSolver(model,p.soil),solve=solver.factor(),loads=basicLoads(p,model),f=p.combination;
 const permanent=(variant:'min'|'max')=>combine(model,[[loads.DC,f.dead],[loads.EV,f.earthVertical],[variant==='min'?loads.EHmin:loads.EHmax,f.earthHorizontal],[loads.DL,f.additionalDead],[loads.IW,f.water]],`EH_${variant}`);
 const min=permanent('min'),max=permanent('max');
 const variants=p.soil.mode==='code'?(['min','max'] as const):(['max'] as const);
 const compare=new Map<string,{fill:number;plate:number}>();
 const manualLoad=combine(model,[[max,1],[liveLoad(p,model),f.live]],'手動位置 · EH_max');const manual=solve(manualLoad);
 const configs=mode==='envelope'?scanConfigurations(p,model):[{position:p.vehicle.position,spacing:p.vehicle.rearSpacing,direction:1}];
 const envelope=new Map<string,MemberEnvelope>(),demand=new Map(model.members.map(m=>[m.id,[] as Demand[]]));let maxResidual=manual.residual,minVerticalReaction=0,cases=0;
 const deflections=topDeflections(model,manual,manualLoad,manualLoad.label);
 const process=(solution:Solution,caseId:string,position:number,spacing:number,direction:number,load:LoadVector)=>{
  for(const row of topDeflections(model,solution,load,`${caseId}; x=${position}; 軸距=${spacing}; 方向=${direction}`)){const target=deflections.find(d=>d.member===row.member)!;if(row.down.mm>target.down.mm)target.down=row.down;if(row.up.mm>target.up.mm)target.up=row.up;}
  maxResidual=Math.max(maxResidual,solution.residual);minVerticalReaction=Math.min(minVerticalReaction,...model.bottomNodes.map(i=>solution.reactions[i*3+1]));
  for(const s of solution.stations){
   const ext=(value:number):Extremum=>({value,caseId,position,spacing,direction,element:s.element,x:s.x,N:s.N,M:s.M});
   let row=envelope.get(s.member);if(!row){row={member:s.member,Mmin:ext(s.M),Mmax:ext(s.M),Vmin:ext(s.V),Vmax:ext(s.V),Nmin:ext(s.N),Nmax:ext(s.N)};envelope.set(s.member,row);}
   for(const key of ['M','V','N'] as const){if(s[key]<row[`${key}min`].value)row[`${key}min`]=ext(s[key]);if(s[key]>row[`${key}max`].value)row[`${key}max`]=ext(s[key]);}
   demand.get(s.member)!.push({N:s.N,M:s.M});
  }cases++;
 };
 // Always include live-load-absent cases; beneficial live load must not erase dead-load extremes.
 for(const variant of variants)process(solve(variant==='min'?min:max),`無車 EH_${variant}`,0,0,0,variant==='min'?min:max);
 for(let i=0;i<configs.length;i++){
  const cfg=configs[i],LL=liveLoad(p,model,cfg.position,cfg.spacing,cfg.direction);
  for(const variant of variants){const label=`${i+1} / EH_${variant}`;const load=combine(model,[[variant==='min'?min:max,1],[LL,f.live]],label);process(solve(load),label,cfg.position,cfg.spacing,cfg.direction,load);}
  if(vehicleRules(p).deep&&!vehicleRules(p).ignored){
   for(const [key,load] of [['fill',LL],['plate',liveLoad(p,model,cfg.position,cfg.spacing,cfg.direction,true)]] as const){
    const sol=solve(load);for(const station of sol.stations)if(station.member.startsWith('T')){const row=compare.get(station.member)??{fill:0,plate:0};row[key]=Math.max(row[key],Math.abs(station.M));compare.set(station.member,row);}
   }
  }
  if(i%25===0)progress?.(i+1,configs.length);
  if(i%50===49)for(const [id,ds] of demand)demand.set(id,demandHull(ds));
 }
 const rows=model.members.map(m=>envelope.get(m.id)!);
 const rc=model.members.map(m=>{const e=envelope.get(m.id)!;return designMember(p,m,demandHull(demand.get(m.id)!),Math.max(Math.abs(e.Vmin.value),Math.abs(e.Vmax.value)));});
 const warnings=[...assumptions];
 if(minVerticalReaction<-1e-6)warnings.unshift(`地盤出現拉力反力 ${minVerticalReaction.toFixed(2)} kN：本結果含離地風險，不能據以完成配筋設計。`);
 warnings.unshift('§4.3／§4.4 比較表為頂板活載絕對彎矩比較，未以此折減整體剛架內力或 RC 需求；完整逐截面正負彎矩採用仍待覆核。');
 if(p.soil.mode==='active')warnings.unshift('自訂土壓採主動狀態；使用者須確認牆體位移及設計依據。');
 if(p.soil.support==='rigid')warnings.unshift('Rigid Base：底板節點垂直位移拘束，角隅剛域另拘束轉角；不是均勻地盤反力假設。');
 if(maxResidual>1e-7)warnings.unshift('求解殘差偏大，請檢查模型與參數。');
 const trace:Trace[]=[
 {stage:'版本',expression:'schemaVersion = 3',detail:`${mode} / ${cases} 工況；${model.nodes.length} 節點、${model.elements.length} 桿件`,source:'Project JSON v3'},
 {stage:'單位',expression:'1 kgf/cm² = 0.0980665 MPa；1 MPa = 1000 kPa',detail:'Solver：kN–m–kPa；RC：N–mm–MPa；分析帶寬 1 m',source:'標準重力 9.80665 m/s²'},
 {stage:'DC',expression:'W = γc × 實體斷面積 × 1 m',detail:`面積 ${loads.area.toFixed(6)} m²；自重 ${(loads.area*p.material.concreteWeight).toFixed(3)} kN/m；倒角重量集中於角隅，外側半牆懸出重量移至中心線。`,source:'幾何體積與靜力學'},
 {stage:'EV / EH',expression:'EV = γv h；EH(z) = γeq z',detail:`γv=${soilValues(p).vertical}；γeq_min=${soilValues(p).min}；γeq_max=${soilValues(p).max} kN/m³。側壓作用於外牆中心線高度。`,source:soilSource+'；使用者依據：'+p.soil.source},
 {stage:'DL',expression:'qv = qDL；不產生側向超載',detail:`頂板等值均佈 ${p.soil.additionalDead} kPa；不含 DC、EV，背填土地表超載未計。`,source:'使用者設定'},
 {stage:'LL',expression:'h≤0.6：集中輪重 / E；h>0.6：1.75h 正方形擴散',detail:`${JSON.stringify(vehicleRules(p))}；I=${impact(p)}；左右輪線重疊時合併，寬度受支承板寬限制。`,source:'橋梁 §3.13、§4.3.3(2)、§4.4；S 採淨跨、不利用倒角縮短'},
 {stage:'組合',expression:`${f.dead} DC + ${f.earthVertical} EV + ${f.earthHorizontal} EH + ${f.additionalDead} DL + ${f.live} LL + ${f.water} IW`,detail:'EH_min、EH_max 各自計算；另含無車工況。',source:f.source},
 {stage:'求解',expression:'K u = F；剛域：ux_s = ux_m − Δy θ；uy_s = uy_m + Δx θ',detail:`最大相對殘差 ${maxResidual.toExponential(3)}；${p.soil.support==='winkler'?`ks=${p.soil.ks} kN/m³；節點彈簧=ks×分攤長度×1m`:'剛性基底拘束'}`,source:'2D 梁柱直接勁度法'},
 {stage:'包絡',expression:'各構件逐工況保留最大／最小 M、V、N；N–M 使用同時發生值',detail:`移動步距 ${p.vehicle.step} m；HS 軸距採約1m離散及兩端點；正反向；${cases}工況。手動圖為 EH_max 單一位置。`,source:'離散掃描；使用者需檢查收斂'},
 {stage:'RC',expression:'εc=0.003；Whitney 應力塊；雙面等量鋼筋應變相容',detail:'使用全部工況 N–M 需求凸包檢核；每面 0.0018Ag 為初步配筋下限，非完整構材規範判定。',source:'TW-RC-112 §21.2、§22.2；箱涵適用性待覆核'},
 ...codeRegister.map(c=>({stage:'規範來源',expression:c.id,detail:`${c.version}；${c.status}`,source:c.url})),
 ];
 progress?.(configs.length,configs.length);
 const audit=loadAudit(p,model),F=resultant(model,manualLoad),R=manual.reactions;
 const balance={fx:F.fx,fy:F.fy,mz:F.mz};model.nodes.forEach(n=>{balance.fx+=R[n.id*3];balance.fy+=R[n.id*3+1];balance.mz+=n.x*R[n.id*3+1]-n.y*R[n.id*3]+R[n.id*3+2];});
 const liveComparison=[...compare].map(([member,v])=>({member,...v,adopted:Math.min(v.fill,v.plate)}));
 trace.push({stage:'自重 DEBUG',expression:'幾何總重 − 模型施加總重',detail:JSON.stringify(audit),source:'未乘組合係數；每 1m 分析帶'}, {stage:'平衡 DEBUG',expression:'ΣFx、ΣFy、ΣMz（外力＋反力）',detail:JSON.stringify(balance),source:'手動組合工況；kN、kN·m'},...liveComparison.map(v=>({stage:'頂板 LL 彎矩比較',expression:'min(|Mfill|max, |Mplate|max)',detail:JSON.stringify(v)+'；比較值尚未用於減少 RC 需求，非逐截面採用值',source:'§4.4 與 §4.3 平行試算；kN·m/m'})));
 const debug=engineeringDebug(model,manual,manualLoad);
 const structured=trace.map(t=>({...t,member:'全箱',case:'分析摘要',formula:t.expression,substitution:t.detail,result:t.detail,unit:'詳公式',inputs:{},notes:''}));
 trace.splice(0,trace.length,...calculationTrace(p,model),...structured,...debug.elements.filter(e=>!e.rigid).flatMap(e=>[
 {stage:'等值節點力',member:e.member,case:manualLoad.label,formula:'fe = ∫ Nᵀ q dx + Σ Nᵀ P',substitution:JSON.stringify(e.memberLoad),result:e.equivalentNodalLoad,unit:'kN, kN, kN·m, kN, kN, kN·m',source:'Hermite／軸向線性形狀函數；3點 Gauss 對線性分布精確積分',inputs:{element:e.element,L:e.L},notes:'i 端三分量，續 j 端三分量；局部正向',expression:'fe = ∫ Nᵀ q dx',detail:''},
 {stage:'桿端力回算',member:e.member,case:manualLoad.label,formula:'ulocal = T uglobal; fend = klocal ulocal − fe',substitution:JSON.stringify({u:e.localDisplacements,fe:e.equivalentNodalLoad}),result:e.localEndForces,unit:'kN, kN, kN·m, kN, kN, kN·m',source:'2D Frame 直接勁度法',inputs:{element:e.element,dofs:e.dofs,k:e.localStiffness,T:e.transformation},notes:'完整矩陣與剛域映射見 Solver Debug JSON',expression:'f = ku − fe',detail:''}
 ]));
 for(const d of deflections)for(const [direction,v] of [['向下',d.down],['向上',d.up]] as const)trace.push({stage:'控制撓度回算',member:d.member,case:v.case,formula:'v = vi + θi x + ∫∫ M/(EI) dx²; δ = v − supportVi − chordSlope (startX+x)',substitution:JSON.stringify(v.recovery),result:{direction,mm:v.mm,xL:v.xL,E:d.E,Ig:d.Ig},unit:'mm；E kPa；Ig m⁴',source:'Euler–Bernoulli 構件解析積分',inputs:v.recovery??{},notes:d.notes,expression:'δ = v − chord',detail:''});
 return {system:solver.system(manual,manualLoad),deflections,debug,water:waterLoads(p,model),audit,balance,liveComparison,project:p,model,manual,envelope:rows,rc,trace,warnings,cases,maxResidual,minVerticalReaction,mode,durationMs:performance.now()-start};
}
