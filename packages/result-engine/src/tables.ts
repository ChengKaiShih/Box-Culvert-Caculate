import type {Analysis} from './index';
/** One presentation dataset shared by UI, Excel and PDF; no analysis in exporters. */
export function engineeringTables(r:Analysis){return [
 {id:'deflection',title:'頂板彈性撓度（Gross EI，供分析參考）',headers:['構件','向下 mm','x/L','向下控制工況','向上 mm','x/L','向上控制工況','E kPa','Ig m⁴','EI kN·m²'],rows:r.deflections.map(d=>[d.member,d.down.mm,d.down.xL,d.down.case,d.up.mm,d.up.xL,d.up.case,d.E,d.Ig,d.EI]),notes:r.deflections[0]?.notes??''},
 {id:'ends',title:'構件端力',headers:['構件','端','Joint 節點','Face 節點','Joint u m','Joint v m','Joint θ rad','Face u m','Face v m','Face θ rad','Face N kN','Face V kN','Face M kN·m','Joint N kN','Joint V kN','Joint M kN·m'],rows:r.debug.members.flatMap(m=>m.ends.map(e=>[m.member,e.end,e.jointNode,e.faceNode,...e.jointDisplacements,...e.faceDisplacements,...e.faceForce,...e.jointForce])),notes:r.debug.notes+' 手動車位／EH_max。位移為 Face 局部位移；Joint 節點位移見 Solver Debug。'},
 {id:'joints',title:'節點平衡',headers:['節點','ΣFx kN','ΣFy kN','ΣMz kN·m','節點外載 Fx','節點外載 Fy','節點外載 M','支承 Rx','支承 Ry','支承 RM'],rows:r.debug.joints.map(j=>[j.node,...j.residual,...j.external,...j.reaction]),notes:'手動車位／EH_max；剛域從屬節點力與力矩移至主節點；構件端力 − 節點外載 − 反力 ≈ 0。'},
 {id:'water',title:'IW 水壓合力檢核',headers:['Hw m','γw kN/m³','底壓 kPa','單側合力 kN','作用點距底 m','ΣFx kN','ΣFy kN','ΣMz kN·m','矩形模型預期向下 kN','垂直差值 kN'],rows:[[r.water.Hw,r.water.gamma,r.water.bottomPressure,r.water.sideForce,r.water.aboveFloor,r.water.resultant.fx,r.water.resultant.fy,r.water.resultant.mz,r.water.expectedDown,r.water.resultant.fy+r.water.expectedDown]],notes:r.water.notes+' 未乘 IW 組合係數。'},
 ];}
