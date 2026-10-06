import {validateProject,type Project} from '../../domain/src/index';
export function geometry(p:Project){
 validateProject(p); const g=p.geometry;
 const widths=Array.from({length:g.cells+1},(_,i)=>i===0||i===g.cells?g.wall:g.partition);
 const wallX=[0];for(let i=0;i<g.cells;i++)wallX.push(wallX[i]+g.clearWidth+(widths[i]+widths[i+1])/2);
 const width=wallX.at(-1)!;const height=g.clearHeight+(g.top+g.bottom)/2;
 const area=(width+g.wall)*(g.top+g.bottom)+widths.reduce((a,b)=>a+b,0)*g.clearHeight+g.cells*2*g.haunch**2;
 return {wallX,width,height,widths,area,outerWidth:width+g.wall,outerHeight:g.clearHeight+g.top+g.bottom};
}
