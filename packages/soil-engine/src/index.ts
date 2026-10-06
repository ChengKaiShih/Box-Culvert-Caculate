import type {Project} from '../../domain/src/index';
export function soilValues(p:Project){return p.soil.mode==='code'?{vertical:18.85,min:4.71,max:9.42}:{vertical:p.soil.unitWeight,min:p.soil.ka*p.soil.unitWeight,max:p.soil.ka*p.soil.unitWeight};}
export function lateralPressure(p:Project,y:number,height:number,variant:'min'|'max'){
 const depth=p.soil.cover+p.geometry.top/2+height-y;
 return soilValues(p)[variant]*depth;
}
export const soilSource='橋梁 §3.3：規範等值流體配對工況，適用埋設／基礎條件須確認；自訂模式為使用者 γ、Ka 主動土壓假設，非自動地工判定';
