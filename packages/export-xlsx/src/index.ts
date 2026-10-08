import {engineeringTables} from '../../result-engine/src/tables';
import ExcelJS from 'exceljs';
import type {Analysis} from '../../result-engine/src/index';
export async function workbookBytes(r:Analysis){
 const wb=new ExcelJS.Workbook();wb.creator='Box-Culvert-Caculate';wb.title=r.project.name;wb.created=new Date();
 function sheet(name:string,headers:string[],rows:(string|number|null)[][]){const ws=wb.addWorksheet(name);ws.addRow(headers);ws.addRows(rows);ws.views=[{state:'frozen',ySplit:1}];ws.autoFilter={from:'A1',to:{row:1,column:headers.length}};ws.columns.forEach(c=>c.width=24);ws.getRow(1).eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF164B47'}};c.font={bold:true,color:{argb:'FFFFFFFF'}};});ws.eachRow(row=>row.eachCell(cell=>{cell.alignment={vertical:'top',wrapText:true};}));return ws;}
 const flatten=(obj:unknown,path=''):Array<[string,string|number]>=>Object.entries(obj as Record<string,unknown>).flatMap(([k,v])=>v&&typeof v==='object'?flatten(v,path+k+'.'):[[path+k,typeof v==='number'?v:String(v)] as [string,string|number]]);
 sheet('專案輸入',['欄位（單位見欄名及README）','值'],[['版本','3.0.0-alpha.1'],['狀態','工程試算，非正式設計成果'],...flatten(r.project)]);
 sheet('載重核對',['項目','幾何重量或載重值','單位','模型合力 kN'],r.audit.rows.map(v=>[v.name,v.value,v.unit,v.force]));
 sheet('自重分項',['構件','重量 kN / 1m 帶'],r.audit.parts.map(v=>[v.name,v.weight]));
 sheet('活載比較',['構件','填土擴散 |M|max','橋面板 |M|max','候選較小值（未套RC）'],r.liveComparison.map(v=>[v.member,v.fill,v.plate,v.adopted]));
 sheet('內力包絡',['構件','M min kN·m/m','M max kN·m/m','V min kN/m','V max kN/m','N min kN/m','N max kN/m'],r.envelope.map(e=>[e.member,e.Mmin.value,e.Mmax.value,e.Vmin.value,e.Vmax.value,e.Nmin.value,e.Nmax.value]));
 sheet('控制工況',['構件','項目','值','工況','前軸x m','後軸距 m','方向','元素','截面x m','同時N kN/m','同時M kN·m/m'],r.envelope.flatMap(e=>(['Mmin','Mmax','Vmin','Vmax','Nmin','Nmax'] as const).map(k=>{const v=e[k];return [e.member,k,v.value,v.caseId,v.position,v.spacing,v.direction,v.element,v.x,v.N,v.M];})));
 sheet('RC斷面試算',['構件','直徑 mm','間距 mm','每面As mm²/m','每面最小As mm²/m','N–M需求比','|V|max kN/m','試算結果','限制'],r.rc.map(x=>[x.member,x.diameter,x.spacing,x.asPerFace,x.minimumPerFace,x.ratio,x.maxShear,x.status,x.notes.join('\n')]));
 sheet('計算追溯',['階段','構件','工況','公式','代值','結果','單位','來源','輸入','註記'],r.trace.map(x=>[x.stage,x.member??'',x.case??'',x.formula??'',x.substitution??'',JSON.stringify(x.result),x.unit??'',x.source,JSON.stringify(x.inputs),x.notes??'']));
 for(const t of engineeringTables(r)){sheet(t.title.slice(0,31),t.headers,t.rows);}
 sheet('Solver Debug',['元素','構件','JSON'],r.debug.elements.map(e=>[e.element,e.member,JSON.stringify(e)]));
 sheet('適用限制',['序號','說明'],r.warnings.map((w,i)=>[i+1,w]));
 sheet('手動節點結果',['節點','x m','y m','ux m','uy m','θ rad','Rx kN','Ry kN','RM kN·m'],r.model.nodes.map(n=>[n.id,n.x,n.y,...r.manual.u.slice(3*n.id,3*n.id+3),...r.manual.reactions.slice(3*n.id,3*n.id+3)]));
 return wb.xlsx.writeBuffer();
}
