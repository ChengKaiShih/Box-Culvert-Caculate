import {test,expect} from '@playwright/test';
test('manual, envelope, exports and responsive layout',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');
 await page.getByRole('button',{name:'計算目前車位',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(10);
 for(const name of ['彎矩 M','剪力 V','軸力 N','變形'])await page.getByRole('button',{name,exact:true}).click();
 await page.getByRole('button',{name:/執行車載包絡/}).click();await expect(page.locator('.primary')).toBeEnabled({timeout:30000});await expect(page.locator('.metrics')).toContainText('cases');
 for(const name of ['Excel ↓','CAD JSON ↓','儲存 JSON ↓']){const ready=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();expect((await ready).suggestedFilename()).toMatch(/\.(xlsx|json)$/);}
 await page.getByRole('button',{name:'配筋試算',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(10);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('editing clears stale results; invalid JSON cannot replace the project',async({page})=>{
 await page.goto('./');await page.getByRole('button',{name:'計算目前車位',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(10);
 await page.getByLabel('各孔淨寬').fill('3.5');await expect(page.locator('tbody tr')).toHaveCount(0);await expect(page.getByRole('button',{name:'Excel ↓',exact:true})).toBeDisabled();
 await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":99}')});await expect(page.getByRole('alert')).toContainText('需要 V3');await expect(page.getByLabel('各孔淨寬')).toHaveValue('3.5');
 await page.getByLabel('箱涵孔數').fill('7');await expect(page.locator('.primary')).toBeDisabled();
});
test('V2 loads, active soil, dimensions and point-load analysis',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');
 await page.getByRole('button',{name:'載重',exact:true}).click();await expect(page.locator('.audit-table')).toContainText('模型施加');
 await page.getByLabel('土壓計算方式').selectOption('active');await page.getByLabel('土壤單位重 γ', {exact:false}).fill('20');await page.getByLabel('主動土壓係數 Ka',{exact:false}).fill('0.3');
 await page.getByLabel('頂板上覆土厚度 h',{exact:false}).fill('0.6');await page.getByLabel('頂板等值均佈永久載重',{exact:false}).fill('12');
 await expect(page.locator('.fields')).toContainText('集中輪重');await expect(page.locator('.viewer')).toContainText('覆土 h=0.60');
 await page.getByLabel('載重／反力').selectOption('EHmax');await page.getByRole('button',{name:'計算目前車位',exact:true}).click();await expect(page.locator('.primary')).toBeEnabled();
 await page.getByLabel('載重／反力').selectOption('reaction');await page.getByRole('button',{name:'載重核對',exact:true}).click();await expect(page.locator('.results-card')).toContainText('ΣFx');
 await page.getByLabel('尺寸標註').uncheck();await expect(page.locator('.viewer')).not.toContainText('總外寬');
 expect(errors).toEqual([]);
});

test('V3 water, relative deflection, structured trace and solver export',async({page})=>{
 await page.goto('./');await page.getByRole('button',{name:'載重',exact:true}).click();
 await expect(page.getByLabel('載重／反力').locator('option[value="IW"]')).toHaveCount(0);
 await page.getByLabel('各孔內部水深 Hw',{exact:false}).fill('2.5');
 await page.getByLabel('載重／反力').selectOption('IW');await expect(page.locator('g[aria-label^="IW 孔"]')).toHaveCount(3);
 await page.getByRole('button',{name:'計算目前車位',exact:true}).click();await expect(page.locator('.primary')).toBeEnabled();
 await page.getByRole('button',{name:'撓度',exact:true}).click();await expect(page.locator('.results-card')).toContainText('Gross EI');await expect(page.locator('.results-card tbody tr')).toHaveCount(3);
 await page.getByRole('button',{name:'構件端力',exact:true}).click();await expect(page.locator('.results-card')).toContainText('Joint M');await expect(page.locator('.results-card tbody tr')).toHaveCount(20);
 await page.getByRole('button',{name:'節點平衡',exact:true}).click();await expect(page.locator('.results-card')).toContainText('ΣMz');
 await page.getByRole('button',{name:'載重計算／追溯',exact:true}).click();await expect(page.locator('.trace-list')).toContainText('代值：');
 await page.getByRole('button',{name:'Solver Debug',exact:true}).click();const ready=page.waitForEvent('download');await page.getByRole('button',{name:'完整分析 Debug JSON ↓'}).click();expect((await ready).suggestedFilename()).toContain('V3-Debug');
 await page.getByLabel('各孔內部水深 Hw',{exact:false}).fill('0');await expect(page.locator('g[aria-label^="IW 孔"]')).toHaveCount(0);
 await page.getByLabel('各孔內部水深 Hw',{exact:false}).fill('2.6');await expect(page.locator('.primary')).toBeDisabled();
});
