# alpha.1 驗證紀錄

日期：2026-10-06。

## 自動化工程測試

`npm test`：20項通過。

- 懸臂梁集中力位移、轉角及反力解析解。
- 簡支梁均佈載重、三角形載重、局部均佈載重反力與彎矩解析解。
- 偏心剛臂的位移約束與力矩傳遞；無支承模型拒絕。
- 單位往返與專案JSON驗證。
- 1～6孔自重守恆、反力平衡、對稱性及殘差。
- HS軸距/重量、覆土衝擊分界、輪重分布守恆。
- N–M試算曲線之純彎基本合理性、同時需求凸包。
- 包絡步距細化不漏失既有極值；剛性基底位移拘束。
- XLSX讀回數值與控制工況；PDF報告逸出使用者文字；CAD孔數與單位。

`npm run build`：TypeScript strict與Vite建置成功。ExcelJS為匯出時動態載入；其chunk約939kB（gzip272kB），不會放入首頁主程式。

## 瀏覽器

`npm run test:e2e` 使用 Playwright。首次執行需 `npx playwright install chromium`；也可指定既有 Chromium 的 `PLAYWRIGHT_EXECUTABLE_PATH`。

已在本機 Chromium 實測：

- 手動分析10組構件結果；M/V/N與變形視圖可切換。
- 預設三孔包絡1106工況，實測約0.7秒（時間依裝置變動）。
- Excel、CAD JSON、Project JSON下載成功。
- 桌面1440px與手機390px頁面無全頁水平溢出；結果表容許內部橫捲。
- 無JavaScript pageerror。
- 修改參數清除舊結果、停用舊結果匯出；錯誤JSON拒絕取代專案。

本機無繁中文字型，無法據測試截圖驗證中文字型外觀；Windows/macOS等環境使用作業系統中文字型。字串與可存取名稱已由瀏覽器確認。

## GitHub

首次提交 `07f96ee` 之 GitHub CI 測試與建置成功。

Pages build/artifact成功，deploy回覆404並指示尚未啟用Pages。需至 repository Settings → Pages 將 Source 設為 GitHub Actions，再重新執行 Deploy GitHub Pages。

## 尚未通過的工程驗證範圍

未與SAP2000/MIDAS或經核定之完整箱涵計算書完成對算。這些測試僅驗證所列演算法及軟體流程，不代表已通過完整規範、施工設計或地盤接觸驗證。剩餘功能見 STATUS.md。
