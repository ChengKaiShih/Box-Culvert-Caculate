import {validateProject,type Project,type Model,type Solution,type Trace} from '../../domain/src/index';
import {generateModel} from '../../model-generator/src/index';
import {prepareSolver} from '../../frame2d-solver/src/index';
import {basicLoads,liveLoad,combine} from '../../load-engine/src/index';
import {scanConfigurations,impact} from '../../vehicle-engine/src/index';
import {demandHull,designMember,type Demand,type RCResult} from '../../rc-design/src/index';
import {assumptions,codeRegister} from '../../codes-tw/src/index';
import {soilSource} from '../../soil-engine/src/index';
export interface Extremum {value:number;caseId:string;position:number;spacing:number;direction:number;element:number;x:number;N:number;M:number;}
export interface MemberEnvelope {member:string;Mmin:Extremum;Mmax:Extremum;Vmin:Extremum;Vmax:Extremum;Nmin:Extremum;Nmax:Extremum;}
export interface Analysis {project:Project;model:Model;manual:Solution;envelope:MemberEnvelope[];rc:RCResult[];trace:Trace[];warnings:string[];cases:number;maxResidual:number;minVerticalReaction:number;mode:'manual'|'envelope';durationMs:number;}
export function analyze(project:Project,mode:'manual'|'envelope'='manual',progress?:(done:number,total:number)=>void):Analysis {
 validateProject(project);const p=structuredClone(project),start=performance.now(),model=generateModel(p),solve=prepareSolver(model,p.soil).factor(),loads=basicLoads(p,model),f=p.combination;
 const permanent=(variant:'min'|'max')=>combine(model,[[loads.DC,f.dead],[loads.EV,f.earthVertical],[variant==='min'?loads.EHmin:loads.EHmax,f.earthHorizontal],[loads.LS,f.surcharge]],`EH_${variant}`);
 const min=permanent('min'),max=permanent('max');
 const manualLoad=combine(model,[[max,1],[liveLoad(p,model),f.live]],'手動位置 · EH_max');const manual=solve(manualLoad);
 const configs=mode==='envelope'?scanConfigurations(p,model):[{position:p.vehicle.position,spacing:p.vehicle.rearSpacing,direction:1}];
 const envelope=new Map<string,MemberEnvelope>(),demand=new Map(model.members.map(m=>[m.id,[] as Demand[]]));let maxResidual=manual.residual,minVerticalReaction=0,cases=0;
 const process=(solution:Solution,caseId:string,position:number,spacing:number,direction:number)=>{
  maxResidual=Math.max(maxResidual,solution.residual);minVerticalReaction=Math.min(minVerticalReaction,...model.bottomNodes.map(i=>solution.reactions[i*3+1]));
  for(const s of solution.stations){
   const ext=(value:number):Extremum=>({value,caseId,position,spacing,direction,element:s.element,x:s.x,N:s.N,M:s.M});
   let row=envelope.get(s.member);if(!row){row={member:s.member,Mmin:ext(s.M),Mmax:ext(s.M),Vmin:ext(s.V),Vmax:ext(s.V),Nmin:ext(s.N),Nmax:ext(s.N)};envelope.set(s.member,row);}
   for(const key of ['M','V','N'] as const){if(s[key]<row[`${key}min`].value)row[`${key}min`]=ext(s[key]);if(s[key]>row[`${key}max`].value)row[`${key}max`]=ext(s[key]);}
   demand.get(s.member)!.push({N:s.N,M:s.M});
  }cases++;
 };
 // Always include live-load-absent cases; beneficial live load must not erase dead-load extremes.
 for(const [variant,base] of [['min',min],['max',max]] as const)process(solve(base),`無車 EH_${variant}`,0,0,0);
 for(let i=0;i<configs.length;i++){
  const cfg=configs[i],LL=liveLoad(p,model,cfg.position,cfg.spacing,cfg.direction);
  for(const [variant,base] of [['min',min],['max',max]] as const){const label=`${i+1} / EH_${variant}`;process(solve(combine(model,[[base,1],[LL,f.live]],label)),label,cfg.position,cfg.spacing,cfg.direction);}
  if(i%25===0)progress?.(i+1,configs.length);
  if(i%50===49)for(const [id,ds] of demand)demand.set(id,demandHull(ds));
 }
 const rows=model.members.map(m=>envelope.get(m.id)!);
 const rc=model.members.map(m=>{const e=envelope.get(m.id)!;return designMember(p,m,demandHull(demand.get(m.id)!),Math.max(Math.abs(e.Vmin.value),Math.abs(e.Vmax.value)));});
 const warnings=[...assumptions];
 if(minVerticalReaction<-1e-6)warnings.unshift(`地盤出現拉力反力 ${minVerticalReaction.toFixed(2)} kN：本結果含離地風險，不能據以完成配筋設計。`);
 if(p.soil.cover<=0.6)warnings.unshift('淺覆土：使用者指定接地長度與有效寬度試算；§4.3 橋面板分布完整比較尚未實作。');
 if(p.soil.support==='rigid')warnings.unshift('Rigid Base：底板節點垂直位移拘束，角隅剛域另拘束轉角；不是均勻地盤反力假設。');
 if(maxResidual>1e-7)warnings.unshift('求解殘差偏大，請檢查模型與參數。');
 const trace:Trace[]=[
 {stage:'版本',expression:'schemaVersion = 1',detail:`${mode} / ${cases} 工況；${model.nodes.length} 節點、${model.elements.length} 桿件`,source:'Project JSON v1'},
 {stage:'單位',expression:'1 kgf/cm² = 0.0980665 MPa；1 MPa = 1000 kPa',detail:'Solver：kN–m–kPa；RC：N–mm–MPa；分析帶寬 1 m',source:'標準重力 9.80665 m/s²'},
 {stage:'DC',expression:'W = γc × 實體斷面積 × 1 m',detail:`面積 ${loads.area.toFixed(6)} m²；自重 ${(loads.area*p.material.concreteWeight).toFixed(3)} kN/m；倒角重量集中於角隅，外側半牆懸出重量移至中心線。`,source:'幾何體積與靜力學'},
 {stage:'EV / EH',expression:'EV = γv h；EH(z) = γeq z',detail:`γv=${p.soil.unitWeight}；γeq_min=${p.soil.ehMin}；γeq_max=${p.soil.ehMax} kN/m³。側壓作用於外牆中心線高度。`,source:soilSource},
 {stage:'LS',expression:'qv = q；qh = K q',detail:`q=${p.soil.surcharge} kPa，K=${p.soil.lateralK}；使用者指定之均佈地表超載，不自動換算車輛等值土高。`,source:'使用者模型假設'},
 {stage:'LL',expression:'輪重 = 軸重 / 2；q = 輪重 × (1+I) / 分布寬度 / 分布長度',detail:`${p.vehicle.type}；I=${impact(p)}；覆土>0.6m採 ${p.vehicle.spread}h 分布，淺覆土採輸入值；僅單輪線。`,source:'公路橋梁設計規範 §3.6、§3.13、§4.4（單輪線簡化）'},
 {stage:'組合',expression:`${f.dead} DC + ${f.earthVertical} EV + ${f.earthHorizontal} EH + ${f.surcharge} LS + ${f.live} LL`,detail:'EH_min、EH_max 各自計算；另含無車工況。',source:f.source},
 {stage:'求解',expression:'K u = F；剛域：ux_s = ux_m − Δy θ；uy_s = uy_m + Δx θ',detail:`最大相對殘差 ${maxResidual.toExponential(3)}；${p.soil.support==='winkler'?`ks=${p.soil.ks} kN/m³；節點彈簧=ks×分攤長度×1m`:'剛性基底拘束'}`,source:'2D 梁柱直接勁度法'},
 {stage:'包絡',expression:'各構件逐工況保留最大／最小 M、V、N；N–M 使用同時發生值',detail:`移動步距 ${p.vehicle.step} m；HS 軸距採約1m離散及兩端點；正反向；${cases}工況。手動圖為 EH_max 單一位置。`,source:'離散掃描；使用者需檢查收斂'},
 {stage:'RC',expression:'εc=0.003；Whitney 應力塊；雙面等量鋼筋應變相容',detail:'使用全部工況 N–M 需求凸包檢核；每面 0.0018Ag 為初步配筋下限，非完整構材規範判定。',source:'TW-RC-112 §21.2、§22.2；箱涵適用性待覆核'},
 ...codeRegister.map(c=>({stage:'規範來源',expression:c.id,detail:`${c.version}；${c.status}`,source:c.url})),
 ];
 progress?.(configs.length,configs.length);
 return {project:p,model,manual,envelope:rows,rc,trace,warnings,cases,maxResidual,minVerticalReaction,mode,durationMs:performance.now()-start};
}
