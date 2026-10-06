import {describe,it,expect} from 'vitest';
import {prepareSolver,emptyLoad} from '../packages/frame2d-solver/src/index';
import type {Model} from '../packages/domain/src/index';
function beam(L=6):Model{return {nodes:[{id:0,x:0,y:0},{id:1,x:L,y:0}],elements:[{id:0,i:0,j:1,E:25e6,A:0.4,I:0.4**3/12,member:'beam',kind:'top',thickness:0.4,rigid:false}],members:[],bottomNodes:[],width:L,height:0,wallX:[]};}
describe('analytical benchmarks',()=>{
 it('cantilever tip load: PL³/3EI, PL²/2EI, reactions',()=>{const m=beam(),l=emptyLoad(m);l.nodal[4]=-10;const s=prepareSolver(m).factor([0,1,2])(l),EI=m.elements[0].E*m.elements[0].I;expect(s.u[4]).toBeCloseTo(-10*6**3/(3*EI),10);expect(s.u[5]).toBeCloseTo(-10*6**2/(2*EI),10);expect(s.reactions[1]).toBeCloseTo(10,8);expect(s.reactions[2]).toBeCloseTo(60,8);});
 it('simply supported UDL: wL/2 and wL²/8',()=>{const m=beam(),l=emptyLoad(m);l.element[0].qy=-12;const s=prepareSolver(m).factor([0,1,4])(l);expect(s.reactions[1]).toBeCloseTo(36,8);expect(Math.max(...s.stations.map(s=>s.M))).toBeCloseTo(54,8);expect(s.stations.at(-1)!.M).toBeCloseTo(0,8);});
 it('triangular load: reactions wL/6, wL/3 and end moments zero',()=>{const m=beam(),l=emptyLoad(m);l.element[0]={qx:0,qy:0,qyEnd:-12};const s=prepareSolver(m).factor([0,1,4])(l);expect(s.reactions[1]).toBeCloseTo(12,8);expect(s.reactions[4]).toBeCloseTo(24,8);expect(s.stations.at(-1)!.M).toBeCloseTo(0,8);});
 it('partial UDL: exact force and moment equilibrium',()=>{const m=beam(),l=emptyLoad(m);l.element[0].patches=[{a:1,b:3,qx:0,qy:-20}];const s=prepareSolver(m).factor([0,1,4])(l);expect(s.reactions[1]).toBeCloseTo(40*4/6,8);expect(s.reactions[4]).toBeCloseTo(40*2/6,8);expect(s.stations.at(-1)!.M).toBeCloseTo(0,8);});
 it('rigid arm transfers eccentric tip load exactly',()=>{const m=beam(4);m.nodes.push({id:2,x:6,y:0,master:1});m.elements.push({...m.elements[0],id:1,i:1,j:2,rigid:true});const l=emptyLoad(m);l.nodal[7]=-10;const s=prepareSolver(m).factor([0,1,2])(l),EI=m.elements[0].E*m.elements[0].I;expect(s.u[4]).toBeCloseTo(-(10*4**3/3+20*4**2/2)/EI,10);expect(s.reactions[2]).toBeCloseTo(60,8);expect(s.u[7]).toBeCloseTo(s.u[4]+2*s.u[5],10);});
 it('rejects an unrestrained mechanism',()=>{expect(()=>prepareSolver(beam()).factor()).toThrow();});
});
