# Box-Culvert-Caculate

> **目前交付：3.0.0-alpha.1，V3 工程試算版。** 原 V1 凍結範圍保留於下文，但不代表所有功能均已完成。詳見 [功能完成表](docs/STATUS.md) 與 [規範核對狀態](docs/CODE_BASIS.md)。

## V2 更新

- 統一 DC／DL／EV／EH／LL 載重頁，自重分項及施加總重 DEBUG。
- 土壓雙模式：規範配對值，或使用者 γ+Ka；DL 不再產生 Kq。
- 覆土、尺寸、作用力與反力圖；A1→A2 為手動車輛正方向。
- h≤0.6m 為集中輪重，§4.3.3(2) E=min(1.2+0.06S,2.1)；深覆土固定 1.75h，輪線重疊及板寬限制；達條件免計 LL。
- schemaVersion=2；V1 JSON 明確拒絕，請重新確認 DL 及模型，不會靜默遷移。
- [人工驗證指南與公開算例](docs/VALIDATION_GUIDE.md)、[V2 完成狀態](docs/STATUS.md)。

**未完成：§4.3／§4.4 僅完成頂板活載彎矩平行比較，尚未將逐截面正負彎矩選用整合到 RC 設計需求。程式保留原剛架需求，不以比較值縮小整組內力。多車道、車道載重及原有 RC 剪力／裂縫等限制仍在。**

## 啟動

需要 Node.js 22+。

```bash
npm ci
npm run dev
npm test
npm run build
```

本機開啟 Vite 顯示的 `/Box-Culvert-Caculate/` 路徑。受限容器可改用 `npx vite --host 127.0.0.1`。

## 操作

1. 設定幾何、材料、地盤／支承、載重及載重組合。初始組合全部為 1.0，僅供模型試算。
2. 「計算目前車位」檢查模型；「執行車載包絡」掃描正反方向、軸距與兩組土壓。
3. 圖示為手動車位 EH_max；結果表為全部掃描工況包絡。M 為 kN·m/m，N、V 為 kN/m。
4. 配筋為 N–M 斷面試算，尚無完整剪力／裂縫／細部合格判定。地盤拉力反力需另作接觸分析。
5. 儲存／匯入 Project JSON；Excel 含完整控制工況、輸入與來源。PDF 按鈕開啟瀏覽器列印，選「另存為 PDF」。CAD JSON 為幾何資料及配筋表，非施工詳圖。

修改輸入會清除舊結果。參數只暫存於目前瀏覽器；需跨裝置保存時請下載 JSON。

## 部署

已提供 `.github/workflows/pages.yml`。GitHub repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**。完成設定後推送 main 或執行 Deploy GitHub Pages workflow 即可部署。CI 先跑測試及建置，失敗不部署。

預期網址為 `https://ChengKaiShih.github.io/Box-Culvert-Caculate/`；是否已上線請以 Actions 的部署結果為準。

## V1 原始凍結規格

以下保留原訂完整範圍。實際完成項目以 [docs/STATUS.md](docs/STATUS.md) 為準。

箱涵（Box Culvert）專用之 **2D 剛架靜力分析、移動車載包絡、RC 配筋設計與工程輸出工具**。

> 專案狀態：V1 開發中  
> 介面語言：繁體中文（台灣工程用語）  
> 部署目標：GitHub Pages  
> 架構原則：前端、計算核心、規範資料、輸出模組分離

## V1 目標

V1 聚焦於規則 RC 箱涵，支援 1～6 孔，採 2D Frame stiffness method 進行線彈性靜力分析。主要功能：

- 參數化箱涵幾何建模與即時預覽
- A1、P1～Pn、A2 垂直構件編碼
- 頂板、底板、側牆及中隔板厚度設定
- 自動開孔配置與固定規則倒角
- H / HS 系列設計車輛與 HS20-44 × 1.25
- 覆土厚度控制輪重分布與衝擊處理
- 車輛手動定位與 Auto Envelope
- 規範等值側土壓、車輛側向超載、地下水預留
- 現地土層參數與自訂壓力圖資料模型預留
- Rigid Base / Winkler ground support 模式
- M / V / N、變形與載重視覺化
- 頂板、牆、底板 RC 配筋設計
- 溫度／收縮筋、最小鋼筋與配筋建議
- 倒角配筋資料
- XLSX、PDF、Project JSON、CAD JSON 輸出
- 計算過程（Calculation Trace）與規範條文追溯

## 座標與方向定義

本專案固定使用下列工程定義：

- **縱向**：沿行車方向，垂直水流方向
- **橫向**：沿水流方向
- V1 主要 2D 剛架分析為「縱向斷面」分析
- 垂直構件由左至右編碼為 **A1、P1、P2…、A2**

此定義不得由 AI 或開發者自行更換。

## V1 規範原則

設計與實作時應優先採用「當下最新之中華民國適用規範」，且規範版本必須版本化保存，不得只寫「依最新規範」。

目前專案基準：

1. 交通部《公路橋梁設計規範》（現行部頒版本）
2. 內政部《建築物混凝土結構設計規範》（112 年版及後續正式勘誤）
3. 內政部《建築物基礎構造設計規範》（112 年版）
4. 業主／契約特別規定優先於一般程式預設值

規範公式不得直接散落於 React UI。所有規範規則須透過 `packages/codes-tw` 與設計引擎存取，並保留條文來源。

## V1 單位政策

### 使用者介面（台灣工程慣用）

- 混凝土、鋼筋強度：kgf/cm²
- 幾何主尺寸：m
- 鋼筋直徑、部分細部尺寸：mm
- 保護層／間距：依 UI 欄位明示 cm 或 mm
- 土壓、水壓、地表超載：kPa
- 土壤單位重：kN/m³
- 地盤反力係數：kN/m³
- 集中力：kN
- 線載重：kN/m

### 核心計算

- Frame Solver：kN－m－kPa
- RC Design：N－mm－MPa

任何 UI 數值進入核心前必須經 `packages/units` 正規化。核心計算禁止隱式單位換算。

## 程式架構

```text
apps/web                 React UI / Viewer / Dialogs
packages/domain          Project 與工程資料型別
packages/units           唯一單位換算來源
packages/codes-tw        中華民國規範資料與條文版本
packages/geometry-engine 參數化箱涵幾何
packages/model-generator 2D 分析模型產生
packages/frame2d-solver  Frame stiffness solver
packages/load-engine     DC / EV / EH / LS / WA / BU
packages/vehicle-engine  車輛、輪重、覆土擴散、包絡
packages/soil-engine     規範土壓／土層／自訂壓力圖
packages/rc-design       RC 強度與配筋設計
packages/result-engine   內力、包絡、Calculation Trace
packages/export-xlsx     Excel 輸出
packages/export-pdf      PDF 計算書輸出
packages/export-cad      CAD JSON 輸出
tests                    單位、solver、載重、RC、回歸測試
```

完整架構與 AI 協作規則請見：

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [AGENTS.md](AGENTS.md)

## 開發原則

1. UI 不得直接包含設計公式。
2. Solver 不得讀取 UI 單位。
3. 規範係數不得無來源硬編碼。
4. 每個工程公式均應有 unit test 或可人工驗證範例。
5. 所有分析結果應可追溯到 input → conversion → load → solver → design。
6. 新功能不可破壞既有 benchmark / regression case。
7. 超出 V1 能力（Shell、3D Solid、材料非線性、複雜接觸、地震歷時）應明確提示改用 SAP2000 / MIDAS 等專業軟體，不得假裝支援。

## 開發與部署

預定使用：

- React
- TypeScript
- Vite
- npm workspaces
- Vitest
- GitHub Actions
- GitHub Pages

V1 為純前端應用，計算核心在瀏覽器本機執行；架構仍將 UI 與 Calculation Core 分離，以利未來移至 server / worker 或被其他應用重用。

## 名稱

Repository 名稱沿用既有：`Box-Culvert-Caculate`。

> 註：`Caculate` 為目前 repository 既有拼字，V1 不主動變更 repo 名稱，以免影響既有 URL 與部署設定。


## V3 更新：每個答案可沿公式回算

- 新增 IW 內部水深 0～淨高、各孔同水深、底板向下水壓；隔牆兩側自然抵銷。**倒角濕周水壓尚未獨立積分。**
- 頂板 Gross EI 相對撓度（排除共同下沉與剛體位移），包含桿內載重解析積分，分段求極值；不作規範 PASS/FAIL。
- 結構化 Calculation Trace：公式、代值、結果、單位、輸入與來源；斷面／勁度、载重、等值節點力、局部位移與桿端力可追算。
- 結果頁提供構件端力、Joint／Face Moment、節點平衡、撓度與 Solver Debug。完整 Debug JSON 包含 reduced Global K、F、u、映射與殘差。
- UI／Excel／PDF 工程表使用同一 Analysis 快照。JSON schema 3；V2 匯入為 Hw=0（IW 係數1），V1 仍需重新確認模型。
- 分割數1～12；預設4保留 V2 Winkler 結果。撓度精度來自解析回算，不要求加密；改變地盤彈簧分割仍可能改變結構反應。

驗證：`npm test`、`npm run build`、`npm run test:e2e`。工程測試含簡支／固定端 UDL、懸臂點力、剛域力矩轉移、剛體位移排除、滿水合力、隔牆抵銷、V2無水M/V/N基準與跨格式同源。受限容器的 single-process Chromium 可使用 `--workers=4` 使四個 e2e 案例分別啟動程序。
