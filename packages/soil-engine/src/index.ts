import type {Project} from '../../domain/src/index';
export function lateralPressure(p:Project,y:number,height:number,variant:'min'|'max'){
 const depth=p.soil.cover+p.geometry.top/2+height-y;
 return (variant==='min'?p.soil.ehMin:p.soil.ehMax)*depth;
}
export const soilSource='公路橋梁設計規範 §3.3(1)(2)：可沉陷基礎 RC 箱涵等值流體；兩種土壓分別分析，非一組荷載同時作用';
