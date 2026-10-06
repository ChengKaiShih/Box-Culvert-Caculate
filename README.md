# Box-Culvert-Caculate

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
