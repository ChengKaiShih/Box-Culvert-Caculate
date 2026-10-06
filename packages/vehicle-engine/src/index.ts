import type {Project,Model} from '../../domain/src/index';
export interface Axle {x:number;weight:number;}
export interface Patch {a:number;b:number;q:number;}
export function axles(p:Project,position=p.vehicle.position,rearSpacing=p.vehicle.rearSpacing,direction=1):Axle[]{
 const type=p.vehicle.type;if(type==='none')return [];
 const scale=type.endsWith('15')?0.75:type==='HS20x1.25'?1.25:1;
 const offsets=type.startsWith('HS')?[0,4.25,4.25+rearSpacing]:[0,4.25];
 return offsets.map((x,i)=>({x:position+direction*x,weight:(i===0?36:144)*scale}));
}
/** Taiwan bridge §3.13. Exact band boundaries take the larger impact, except >=0.9 m explicitly exempt. */
export function impact(p:Project){const h=p.soil.cover;return h>=0.9?0:h>0.6?0.1:h>0.3?0.2:0.3;}
/** Single wheel line. Deep cover: §4.4 square footprint and longitudinal overlap union. */
export function wheelPatches(p:Project,position=p.vehicle.position,spacing=p.vehicle.rearSpacing,direction=1):Patch[]{
 const deep=p.soil.cover>0.6;
 const length=deep?p.vehicle.spread*p.soil.cover:p.vehicle.contactLength;
 const width=deep?Math.max(p.vehicle.effectiveWidth,p.vehicle.spread*p.soil.cover):p.vehicle.effectiveWidth;
 if(length<=0||width<=0)throw new Error('輪重分布尺寸必須大於零');
 const raw=axles(p,position,spacing,direction).map(a=>({a:a.x-length/2,b:a.x+length/2,total:a.weight/2*(1+impact(p))/width})).sort((a,b)=>a.a-b.a);
 const merged:typeof raw=[];for(const r of raw){const last=merged.at(-1);if(deep&&last&&r.a<last.b){last.b=Math.max(last.b,r.b);last.total+=r.total;}else merged.push({...r});}
 return merged.map(r=>({a:r.a,b:r.b,q:r.total/(r.b-r.a)}));
}
export function scanConfigurations(p:Project,model:Model){
 if(p.vehicle.type==='none')return [{position:0,spacing:p.vehicle.rearSpacing,direction:1}];
 const spacings=[p.vehicle.rearSpacing];
 if(p.vehicle.scanRearSpacing&&p.vehicle.type.startsWith('HS')){for(let s=4.25;s<9.15;s+=1)spacings.push(s);spacings.push(9.15);}
 const configs:Array<{position:number;spacing:number;direction:number}>=[];
 const margin=Math.max(p.vehicle.contactLength,p.vehicle.spread*p.soil.cover)/2;
 for(const spacing of [...new Set(spacings)])for(const direction of [1,-1]){
  const extent=p.vehicle.type.startsWith('HS')?4.25+spacing:4.25;
  const start=direction===1?-extent-margin:-margin,end=direction===1?model.width+margin:model.width+extent+margin;
  for(let x=start;x<end;x+=p.vehicle.step)configs.push({position:x,spacing,direction});configs.push({position:end,spacing,direction});
 }
 if(configs.length>20000)throw new Error('掃描位置超過 20,000，請放大步距');
 return configs;
}
