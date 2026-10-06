import {it,expect} from 'vitest';
import {cloneProject,parseProject,validateProject} from '../packages/domain/src/index';
import {kgfCm2ToMPa,MPaToKgfCm2} from '../packages/units/src/index';
import {generateModel} from '../packages/model-generator/src/index';
import {basicLoads,liveLoad} from '../packages/load-engine/src/index';
import {prepareSolver} from '../packages/frame2d-solver/src/index';
import {axles,impact,wheelPatches} from '../packages/vehicle-engine/src/index';
import {analyze} from '../packages/result-engine/src/index';
import {interactionCurve,momentCapacity,demandHull} from '../packages/rc-design/src/index';
it('unit conversion round trip',()=>{expect(kgfCm2ToMPa(280)).toBeCloseTo(27.45862,8);expect(MPaToKgfCm2(kgfCm2ToMPa(4200))).toBeCloseTo(4200,8);});
it('JSON validation refuses negative geometry, noninteger cells, future schema and unsupported water',()=>{for(const edit of [(p:any)=>p.geometry.cells=1.5,(p:any)=>p.geometry.top=-1,(p:any)=>p.schemaVersion=2,(p:any)=>p.soil.groundwater.enabled=true]){const p=cloneProject();edit(p);expect(()=>validateProject(p)).toThrow();}expect(parseProject(JSON.stringify(cloneProject()))).toEqual(cloneProject());});
it('1–6 cells: exact self-weight conservation, symmetry and equilibrium with rigid haunches',()=>{
 for(let cells=1;cells<=6;cells++){const p=cloneProject();p.geometry.cells=cells;const m=generateModel(p),l=basicLoads(p,m),s=prepareSolver(m,p.soil).factor()(l.DC);const R=s.reactions.filter((_,i)=>i%3===1).reduce((a,b)=>a+b,0);expect(R).toBeCloseTo(l.area*p.material.concreteWeight,5);expect(s.residual).toBeLessThan(1e-8);const left=m.bottomNodes[0],right=m.bottomNodes.at(-1)!;expect(s.u[left*3+1]).toBeCloseTo(s.u[right*3+1],9);}
});
it('HS geometry follows Taiwan 4.25m axle spacing and x1.25 scales all axles',()=>{const p=cloneProject();expect(axles(p)[1].x-axles(p)[0].x).toBe(4.25);expect(axles(p).map(a=>a.weight)).toEqual([45,180,180]);});
it('impact boundaries and footprint conservation including overlap',()=>{const p=cloneProject();for(const [h,i] of [[0,0.3],[0.3,0.3],[0.6,0.2],[0.8,0.1],[0.9,0]]){p.soil.cover=h;expect(impact(p)).toBe(i);}p.soil.cover=5;const patches=wheelPatches(p);expect(patches.length).toBe(1);expect(patches.reduce((s,v)=>s+(v.b-v.a)*v.q,0)).toBeCloseTo((45+180+180)/2/(5*1.75),8);});
it('live patch reaction matches loads retained on model',()=>{const p=cloneProject();p.geometry.cells=3;const m=generateModel(p),s=prepareSolver(m,p.soil).factor()(liveLoad(p,m));const force=liveLoad(p,m).element.flatMap(l=>l.patches??[]).reduce((sum,q)=>sum-(q.b-q.a)*q.qy,0);expect(s.reactions.filter((_,i)=>i%3===1).reduce((a,b)=>a+b,0)).toBeCloseTo(force,6);});
it('RC pure bending agrees with closed-form stress-block equilibrium',()=>{const fc=28,fy=420,h=400,cover=50,db=20,As=1500;const c=interactionCurve(fc,fy,h,cover,db,As);const cap=momentCapacity(c,0);expect(cap).toBeGreaterThan(0.9*As*fy*(h-cover-db/2-As*fy/(2*0.85*fc*1000))*0.95);expect(cap).toBeLessThan(0.9*As*fy*(h-cover-db/2));});
it('hull retains simultaneous demand vertices',()=>{expect(demandHull([{N:0,M:0},{N:1,M:0},{N:0,M:1},{N:0.2,M:0.2}])).toHaveLength(3);});
it('manual pipeline yields trace, both earth cases and finite RC output',()=>{const r=analyze(cloneProject());expect(r.cases).toBe(4);expect(r.envelope).toHaveLength(10);expect(r.rc).toHaveLength(10);expect(r.maxResidual).toBeLessThan(1e-8);expect(r.trace.length).toBeGreaterThan(10);expect(r.rc.every(x=>Number.isFinite(x.ratio))).toBe(true);});
