import type {Project,Model} from '../../domain/src/index';
export interface Axle {x:number;weight:number;}
export interface Patch {a:number;b:number;q:number;}
export function axles(p:Project,position=p.vehicle.position,rearSpacing=p.vehicle.rearSpacing,direction=1):Axle[]{
 const type=p.vehicle.type;if(type==='none')return [];
 const scale=type.endsWith('15')?0.75:type==='HS20x1.25'?1.25:1;
 const offsets=type.startsWith('HS')?[0,4.25,4.25+rearSpacing]:[0,4.25];
 return offsets.map((x,i)=>({x:position-direction*x,weight:(i===0?36:144)*scale}));
}
/** Taiwan bridge §3.13. Exact band boundaries take the larger impact, except >=0.9 m explicitly exempt. */
export function impact(p:Project){const h=p.soil.cover;return h>=0.9?0:h>0.6?0.1:h>0.3?0.2:0.3;}
/** §4.3.1 effective span: monolithic wall slab; haunch benefit not used. */
export function vehicleRules(p:Project){
 const g=p.geometry,h=p.soil.cover,S=g.clearWidth,L=g.cells*g.clearWidth+(g.cells-1)*g.partition;
 const ignored=p.vehicle.type==='none'||(g.cells===1?h>2.4&&h>S:h>L);
 const E=Math.min(1.2+0.06*S,2.1,p.vehicle.barrelWidth);
 const length=1.75*h, joined=length>p.vehicle.wheelSpacing;
 const width=Math.min(p.vehicle.barrelWidth,length+(joined?p.vehicle.wheelSpacing:0));
 return {S,L,E,ignored,deep:h>0.6,length,width,joined,impact:impact(p),reason:p.vehicle.type==='none'?'無車載':ignored?(g.cells===1?`h=${h}>2.4 且 h>S=${S}`:`h=${h}>L=${L}`):'未達忽略條件；計入 LL'};
}
/** Single design vehicle; both wheel lines merge only when transverse footprints overlap. */
export function wheelPatches(p:Project,position=p.vehicle.position,spacing=p.vehicle.rearSpacing,direction=1):Patch[]{
 const r=vehicleRules(p);if(r.ignored||!r.deep)return [];
 const raw=axles(p,position,spacing,direction).map(a=>({a:a.x-r.length/2,b:a.x+r.length/2,total:a.weight/(r.joined?1:2)*(1+impact(p))/r.width})).sort((a,b)=>a.a-b.a);
 const merged:typeof raw=[];for(const row of raw){const last=merged.at(-1);if(last&&row.a<last.b){last.b=Math.max(last.b,row.b);last.total+=row.total;}else merged.push({...row});}
 return merged.map(row=>({a:row.a,b:row.b,q:row.total/(row.b-row.a)}));
}
export function wheelPoints(p:Project,position=p.vehicle.position,spacing=p.vehicle.rearSpacing,direction=1){
 const r=vehicleRules(p);if(r.ignored)return [];
 return axles(p,position,spacing,direction).map(a=>({x:a.x,force:a.weight/2*(1+impact(p))/r.E}));
}
export function scanConfigurations(p:Project,model:Model){
 if(vehicleRules(p).ignored)return [{position:0,spacing:p.vehicle.rearSpacing,direction:1}];
 const spacings=[p.vehicle.rearSpacing];
 if(p.vehicle.scanRearSpacing&&p.vehicle.type.startsWith('HS')){for(let s=4.25;s<9.15;s+=1)spacings.push(s);spacings.push(9.15);}
 const configs:Array<{position:number;spacing:number;direction:number}>=[];
 const margin=p.soil.cover>0.6?1.75*p.soil.cover/2:0;
 for(const spacing of [...new Set(spacings)])for(const direction of [1,-1]){
  const extent=p.vehicle.type.startsWith('HS')?4.25+spacing:4.25;
  const start=direction===1?-margin:-extent-margin,end=direction===1?model.width+extent+margin:model.width+margin;
  for(let x=start;x<end;x+=p.vehicle.step)configs.push({position:x,spacing,direction});configs.push({position:end,spacing,direction});
 }
 if(configs.length>20000)throw new Error('掃描位置超過 20,000，請放大步距');return configs;
}
