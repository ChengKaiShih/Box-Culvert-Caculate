# AI 協作規則

適用整個 repository。

1. 先讀 README.md、ARCHITECTURE.md、docs/STATUS.md 與 docs/CODE_BASIS.md。凍結功能見 docs/SPEC_V1.md。
2. 使用繁體中文與台灣土木工程用語；repository 既有拼字 `Box-Culvert-Caculate` 不改名。
3. 縱向＝行車方向（垂直水流），橫向＝水流方向；A1/Pn/A2 編碼不變。
4. 沿用 React + TypeScript + Vite + npm workspaces + Vitest，不另外搬到其他託管平台。
5. UI 不寫工程公式；Solver 僅收 canonical units；換算走 packages/units。
6. 規範值須附版本、條號、官方來源與適用條件。未核實之預設必須標示假設，不得宣稱完整符合最新規範。
7. 不可用「預留介面」冒充已完成計算；不要把 alpha 版描述為完成版 V1。
8. 工程公式修改需補有獨立依據的測試。至少執行 npm test 與 npm run build；失敗不得隱藏或鬆放公差。
9. 不要以巨大勁度替代剛域約束，不要直接刪除拉力反力或忽略軸力，不可將獨立包絡極值當作同時作用的 N–M。
10. Project JSON schema 變動要版本化，附 migration 或清楚拒絕；禁止靜默忽略未知/未支援工程設定。
11. 匯出使用同一份分析快照，必須包含單位、載重組合、規範來源、限制與控制工況。
12. 變更同步更新 docs/STATUS.md 與 CHANGELOG.md；保持尚未完成項目可見。
13. 不提交 node_modules、dist、憑證或使用者私人規範 PDF。保留 package-lock.json。
14. 推送前先 fetch，檢查遠端變更，不得 force push 覆蓋使用者內容。若要求是初版建立，可正常新增提交；有衝突時合併保留雙方有效內容。
15. 除非使用者要求，不額外建立無關功能或變更既定功能範圍。

16. V2 自訂土壓只含 γ、Ka；規範配對值不可再乘Ka。DL不產生側向土壓，舊LS不得靜默遷移。
17. §4.3/4.4比較未完成逐截面設計採用前，禁止用最大值比例縮小整組N/M/V，也不得在STATUS宣稱完整完成。
18. 前軸位置正向為向右，後軸在左；包絡保持正反向。
