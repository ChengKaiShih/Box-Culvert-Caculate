import {it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {cloneProject} from '../packages/domain/src/index';
import {analyze} from '../packages/result-engine/src/index';
import {workbookBytes} from '../packages/export-xlsx/src/index';
import {reportHtml} from '../packages/export-pdf/src/index';
import {cadData} from '../packages/export-cad/src/index';
it('XLSX round trip preserves numeric results and controlling cases',async()=>{const r=analyze(cloneProject());const bytes=await workbookBytes(r);const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);expect(wb.worksheets).toHaveLength(15);expect(wb.getWorksheet('內力包絡')!.getCell('B2').value).toBe(r.envelope[0].Mmin.value);expect(wb.getWorksheet('控制工況')!.rowCount).toBe(r.envelope.length*6+1);});
it('print report escapes imported names and includes limitations and inputs',()=>{const p=cloneProject();p.name='<script>alert(1)</script>';const html=reportHtml(analyze(p));expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('未完成');expect(html).toContain('schemaVersion');});
it('CAD contains an opening for every cell, closing haunch polygons and metre units',()=>{const r=analyze(cloneProject()),cad=cadData(r);expect(cad.openings).toHaveLength(3);expect(cad.openings[0].points).toHaveLength(8);expect(cad.units).toBe('m');expect(cad.haunch.reinforcementStatus).toContain('未完成');});

it('V3 UI presentation tables, Excel and PDF consume identical result snapshot',async()=>{const {engineeringTables}=await import('../packages/result-engine/src/tables');const p=cloneProject();p.water.depth=1.7;const r=analyze(p),wb=new ExcelJS.Workbook();await wb.xlsx.load(await workbookBytes(r));const html=reportHtml(r);for(const t of engineeringTables(r)){const ws=wb.getWorksheet(t.title.slice(0,31))!;expect(ws.rowCount).toBe(t.rows.length+1);t.rows.forEach((row,i)=>row.forEach((v,j)=>expect(ws.getCell(i+2,j+1).value).toBe(v===0?0:v)));expect(html).toContain(t.title);}expect(html).toContain(String(r.deflections[0].down.mm));expect(wb.getWorksheet('計算追溯')!.getCell('D2').value).toBe(r.trace[0].formula);});
