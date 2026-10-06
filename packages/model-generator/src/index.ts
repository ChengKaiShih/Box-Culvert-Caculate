import type {Project,Model,MemberKind} from '../../domain/src/index';
import {geometry} from '../../geometry-engine/src/index';
import {MPaToKPa} from '../../units/src/index';
export function generateModel(p:Project):Model {
 const g=p.geometry,geo=geometry(p),{wallX,width,height,widths}=geo;
 const model:Model={nodes:[],elements:[],members:[],width,height,wallX,bottomNodes:[]};
 const addNode=(x:number,y:number,master?:number)=>{const id=model.nodes.length;model.nodes.push({id,x,y,master});return id;};
 const bottom=wallX.map(x=>addNode(x,0)),top=wallX.map(x=>addNode(x,height));
 function member(id:string,kind:MemberKind,start:number,end:number,t:number,offI:number,offJ:number){
  const a=model.nodes[start],b=model.nodes[end],L=Math.hypot(b.x-a.x,b.y-a.y),cx=(b.x-a.x)/L,cy=(b.y-a.y)/L;
  if(offI+offJ>=L-1e-6)throw new Error(`${id} 剛域重疊`);
  const stations=[0];if(offI>0)stations.push(offI);
  for(let k=1;k<g.divisions;k++)stations.push(offI+(L-offI-offJ)*k/g.divisions);
  if(offJ>0)stations.push(L-offJ);stations.push(L);
  const ids=stations.map((d,i)=>i===0?start:i===stations.length-1?end:addNode(a.x+d*cx,a.y+d*cy,i===1&&offI>0?start:i===stations.length-2&&offJ>0?end:undefined));
  const elements:number[]=[];
  for(let i=0;i<ids.length-1;i++){const eid=model.elements.length;elements.push(eid);model.elements.push({id:eid,i:ids[i],j:ids[i+1],E:MPaToKPa(p.material.elasticModulusMPa),A:t,I:t**3/12,member:id,kind,thickness:t,rigid:(i===0&&offI>0)||(i===ids.length-2&&offJ>0)});}
  model.members.push({id,kind,thickness:t,elements});if(kind==='bottom')model.bottomNodes.push(...ids);
 }
 for(let i=0;i<g.cells;i++){
  member(`T${i+1}`,'top',top[i],top[i+1],g.top,widths[i]/2+g.haunch,widths[i+1]/2+g.haunch);
  member(`B${i+1}`,'bottom',bottom[i],bottom[i+1],g.bottom,widths[i]/2+g.haunch,widths[i+1]/2+g.haunch);
 }
 for(let i=0;i<=g.cells;i++)member(i===0?'A1':i===g.cells?'A2':`P${i}`,'wall',bottom[i],top[i],widths[i],g.bottom/2+g.haunch,g.top/2+g.haunch);
 model.bottomNodes=[...new Set(model.bottomNodes)].sort((a,b)=>model.nodes[a].x-model.nodes[b].x);
 return model;
}
