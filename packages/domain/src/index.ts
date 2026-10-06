/** UI project units are explicit; solver types exclusively use kN, m, kPa. */
export type Support = 'rigid' | 'winkler';
export type Vehicle = 'none' | 'H20' | 'H15' | 'HS20' | 'HS15' | 'HS20x1.25';
export interface Project {
  schemaVersion: 1; name: string;
  geometry: {cells: number; clearWidth: number; clearHeight: number; top: number; bottom: number; wall: number; partition: number; haunch: number; divisions: number};
  material: {fcKgfCm2: number; fyKgfCm2: number; elasticModulusMPa: number; concreteWeight: number; coverMm: number; barDiameterMm: number};
  soil: {cover: number; unitWeight: number; ehMin: number; ehMax: number; surcharge: number; lateralK: number; support: Support; ks: number; groundwater: {enabled:false}; layers: unknown[]; customPressure: unknown[]};
  vehicle: {type: Vehicle; position: number; rearSpacing: number; step: number; scanRearSpacing: boolean; spread: number; contactLength: number; effectiveWidth: number};
  combination: {name: string; dead: number; earthVertical: number; earthHorizontal: number; surcharge: number; live: number; source: string};
}
export const defaultProject: Project = {
 schemaVersion:1,name:'三孔箱涵 · 初步分析',
 geometry:{cells:3,clearWidth:3,clearHeight:2.5,top:0.35,bottom:0.4,wall:0.35,partition:0.3,haunch:0.2,divisions:4},
 material:{fcKgfCm2:280,fyKgfCm2:4200,elasticModulusMPa:25000,concreteWeight:24,coverMm:50,barDiameterMm:19},
 soil:{cover:0.8,unitWeight:18.85,ehMin:4.71,ehMax:9.42,surcharge:10,lateralK:0.5,support:'winkler',ks:30000,groundwater:{enabled:false},layers:[],customPressure:[]},
 vehicle:{type:'HS20x1.25',position:3,rearSpacing:4.25,step:0.5,scanRearSpacing:true,spread:1.75,contactLength:0.25,effectiveWidth:1.0,},
 combination:{name:'使用者組合（初始為未加係數）',dead:1,earthVertical:1,earthHorizontal:1,surcharge:1,live:1,source:'初始值僅供模型檢核；設計載重組合須由工程師依適用規範指定'},
};
export type MemberKind = 'top' | 'bottom' | 'wall';
export interface Node {id:number;x:number;y:number; master?:number;}
export interface Element {id:number;i:number;j:number;E:number;A:number;I:number;member:string;kind:MemberKind;thickness:number;rigid:boolean;}
export interface Member {id:string;kind:MemberKind;thickness:number;elements:number[];}
export interface Model {nodes:Node[];elements:Element[];members:Member[];width:number;height:number;wallX:number[];bottomNodes:number[];}
export interface ElementLoad {qx:number;qy:number;qxEnd?:number;qyEnd?:number; patches?:{a:number;b:number;qx:number;qy:number}[];}
export interface LoadVector {nodal:number[];element:ElementLoad[]; label:string;}
export interface Station {element:number;member:string;x:number;N:number;V:number;M:number;}
export interface Solution {u:number[];reactions:number[];stations:Station[];endForces:number[][];residual:number;}
export interface Trace {stage:string;expression:string;detail:string;source:string;}
export const cloneProject=()=>structuredClone(defaultProject);
export function validateProject(value:unknown): asserts value is Project {
 if(!value||typeof value!=='object')throw new Error('專案必須是 JSON 物件');
 const p=value as Project;
 if(p.schemaVersion!==1)throw new Error('不支援的專案版本（需要 schemaVersion = 1）');
 if(typeof p.name!=='string'||p.name.length>200)throw new Error('專案名稱必須為 200 字以內');
 for(const group of ['geometry','material','soil','vehicle','combination'] as const)if(!p[group]||typeof p[group]!=='object')throw new Error(`缺少 ${group} 資料`);
 const range=(v:unknown,a:number,b:number,label:string)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<a||v>b)throw new Error(`${label} 必須介於 ${a}～${b}`);};
 const g=p.geometry,m=p.material,s=p.soil,v=p.vehicle;
 range(g.cells,1,6,'孔數');range(g.divisions,2,12,'構件分割數');if(!Number.isInteger(g.cells)||!Number.isInteger(g.divisions))throw new Error('孔數與分割數必須為整數');
 range(g.clearWidth,1,12,'淨寬 m');range(g.clearHeight,1,8,'淨高 m');
 for(const k of ['top','bottom','wall','partition'] as const)range(g[k],0.15,1.5,`${k} 厚度 m`);
 range(g.haunch,0,Math.min(g.clearWidth,g.clearHeight)/3,'倒角 m');
 range(m.fcKgfCm2,140,700,"混凝土強度 kgf/cm²");range(m.fyKgfCm2,2800,6000,'鋼筋強度 kgf/cm²');range(m.elasticModulusMPa,1000,60000,'彈性模數 MPa');range(m.concreteWeight,15,30,'混凝土單位重');range(m.coverMm,20,150,'保護層 mm');range(m.barDiameterMm,10,36,'鋼筋直徑 mm');
 if(Math.min(g.top,g.bottom,g.wall,g.partition)*1000<=2*(m.coverMm+m.barDiameterMm))throw new Error('板牆厚度不足以配置雙面鋼筋與保護層');
 range(s.cover,0,20,'覆土 m');range(s.unitWeight,10,25,'土壤單位重');range(s.ehMin,0,30,'最小等值流體單位重');range(s.ehMax,s.ehMin,30,'最大等值流體單位重');range(s.surcharge,0,200,'地表超載');range(s.lateralK,0,2,'側向超載係數');range(s.ks,100,1000000,'地盤反力係數');
 if(!['rigid','winkler'].includes(s.support))throw new Error('支承模式錯誤');
 if(s.groundwater?.enabled!==false||!Array.isArray(s.layers)||!Array.isArray(s.customPressure)||s.layers.length||s.customPressure.length)throw new Error('此版預留地下水、土層與自訂壓力圖資料欄位，尚不可啟用');
 if(!['none','H20','H15','HS20','HS15','HS20x1.25'].includes(v.type))throw new Error('不支援的車型');
 range(v.position,-30,150,'車輛位置');range(v.rearSpacing,4.25,9.15,'後軸距 m');range(v.step,0.1,2,'掃描步距 m');range(v.spread,0,3,'覆土擴散係數');range(v.contactLength,0.1,2,'接地長度 m');range(v.effectiveWidth,0.5,10,'有效分布寬度 m');
 if(typeof v.scanRearSpacing!=='boolean')throw new Error('軸距掃描設定錯誤');
 for(const k of ['dead','earthVertical','earthHorizontal','surcharge','live'] as const)range(p.combination[k],0,5,`${k} 載重係數`);
 if(typeof p.combination.source!=='string'||typeof p.combination.name!=='string')throw new Error('載重組合需包含名稱與來源');
}
export function parseProject(text:string):Project {if(text.length>1e6)throw new Error('專案 JSON 過大');const p:unknown=JSON.parse(text);validateProject(p);return p;}
