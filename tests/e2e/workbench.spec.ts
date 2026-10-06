import {test,expect} from '@playwright/test';
test('manual, envelope, exports and responsive layout',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');
 await page.getByRole('button',{name:'計算目前車位',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(10);
 for(const name of ['彎矩 M','剪力 V','軸力 N','變形'])await page.getByRole('button',{name,exact:true}).click();
 await page.getByRole('button',{name:/執行車載包絡/}).click();await expect(page.locator('.primary')).toBeEnabled({timeout:30000});await expect(page.locator('.metrics')).toContainText('1,106');
 for(const name of ['Excel ↓','CAD JSON ↓','儲存 JSON ↓']){const ready=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();expect((await ready).suggestedFilename()).toMatch(/\.(xlsx|json)$/);}
 await page.getByRole('button',{name:'配筋試算',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(10);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('editing clears stale results; invalid JSON cannot replace the project',async({page})=>{
 await page.goto('./');await page.getByRole('button',{name:'計算目前車位',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(10);
 await page.getByLabel('各孔淨寬').fill('3.5');await expect(page.locator('tbody tr')).toHaveCount(0);await expect(page.getByRole('button',{name:'Excel ↓',exact:true})).toBeDisabled();
 await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":99}')});await expect(page.getByRole('alert')).toContainText('不支援');await expect(page.getByLabel('各孔淨寬')).toHaveValue('3.5');
 await page.getByLabel('箱涵孔數').fill('7');await expect(page.locator('.primary')).toBeDisabled();
});
