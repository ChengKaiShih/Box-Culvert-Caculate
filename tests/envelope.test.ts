import {it,expect} from 'vitest';
import {cloneProject} from '../packages/domain/src/index';
import {analyze} from '../packages/result-engine/src/index';
it('discrete envelope contains manual position and converges when positions are nested',()=>{
 const p=cloneProject();p.geometry.cells=1;p.vehicle.scanRearSpacing=false;p.vehicle.step=1;
 const coarse=analyze(p,'envelope');p.vehicle.step=0.5;const fine=analyze(p,'envelope');
 expect(fine.cases).toBeGreaterThan(coarse.cases);expect(fine.maxResidual).toBeLessThan(1e-7);
 coarse.envelope.forEach((row,i)=>{expect(fine.envelope[i].Mmax.value+1e-6).toBeGreaterThanOrEqual(row.Mmax.value);expect(fine.envelope[i].Mmin.value-1e-6).toBeLessThanOrEqual(row.Mmin.value);});
},20000);
it('rigid base has zero vertical displacements and no solver mechanism',()=>{const p=cloneProject();p.soil.support='rigid';const r=analyze(p);for(const n of r.model.bottomNodes)expect(r.manual.u[3*n+1]).toBeCloseTo(0,10);expect(r.maxResidual).toBeLessThan(1e-7);});
