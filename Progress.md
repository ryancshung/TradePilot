# TradePilot Antigravity 共同進度紀錄

> 這份文件用來讓 Perplexity 與 Antigravity 對齊目前進度。之後只要貼上這份文件，就能快速判斷目前做到哪裡、下一步要做什麼。

## 目前目標

以 `client.ts` 為中心的前端資料層已收斂，使用 `localStorage` 作為 mock state，備份匯出/匯入端點與正式 `BackupPayload` 契約完全對齊。下一步為 Cloudflare Pages 部署驗證，以及未來有需要時再接 GAS Web App API。

## 已確認的核心檔案

- `data_contract.md`：主契約文件，定義 `Stock`、`ZoneState`、`MetaSettings` 與欄位對照。
- `Core.gs`：包含 `APP_INFO`、`CONFIG`、`getSettingsMap()`、`updateMetaData()`、`importDatabaseJson()`、`importStockCSV()`、`updateCalculations()`、`_parseDateString()`。
- `APPcode.gs`：包含 `initSystem()`、`getDatabaseBackupPayload()`、`getDbHeaders()`、`applyDbSheetFormatting()`、`postRestoreFormatting()`、`importDatabaseJson()`、`importStockCSV()`。
- `ZoneEngine.gs`：包含 `updateBuyZoneStatus()` 與區間 / 均線 / 通知判定邏輯。
- `src/lib/api/client.ts`：前端唯一資料入口，MockApiClient 實作。
- `types/`：契約型別層（`domain.ts` / `mapping.ts` / `backup.ts` / `index.ts`）。

## 現在的交付物

### 1. 類型與契約層（`types/`）

- `types/domain.ts`：定義 `Stock`、`ZoneState`、`TradeMeta`、`TradeSettings` 及全部子介面與 literal union。
- `types/mapping.ts`：
  - `DB_COL` 索引常數（與 `getDbHeaders()` 一對一對應，index 0–76）。
  - `SUPPORT_INDICES` / `RESIST_INDICES` 陣列常數。
  - `rowToStock` / `stockToRow`（雙向對齊）。
  - `rowToZoneState` / `zoneStateToRow`（雙向對齊）。
  - `rowToStockRow` / `stockRowToRow`（雙向對齊）。
  - `sheetValuesToStockRows`。
  - `metaValuesToTradeMeta` / `tradeMetaToMetaValues`（雙向對齊）。
  - `rawMapToTradeSettings` / `tradeSettingsToRawMap` / `tradeSettingsToSheetValues`（雙向對齊）。
- `types/backup.ts`：
  - `BackupPayload`（含 `app / backup / summary / sheets` 全部子型別）。
  - `CURRENT_SCHEMA_VERSION` / `COMPATIBLE_SCHEMA_VERSIONS` 常數。
  - `validateBackupJson`（純函數，不依賴 GAS）。
  - `getSheetFromPayload` / `isValidSheetData` / `extractBackupInfo`。
  - `SHEET_NAMES` / `BACKUP_SHEET_ORDER` 常數。
- `types/index.ts`：barrel re-export。

### 2. GAS 層修正

- 移除 `ZoneEngine.gs` 開頭 161 行與 `Core.gs` 重複的 helper 函數（`Core.gs` 為唯一來源）。
- 量能閾值改從 settings 工作表讀取，不再 hardcoded（fallback：1.5 / 1.0 / 0.6）。
- 補齊 `ZoneEngine.gs` 的 `requireHeaders` 欄位驗證（補上 `'現-爆量'`）。
- 修復備份還原日期格式問題：
  - 匯出固定格式 `yyyy/MM/dd`（不產生 ISO UTC 字串）。
  - 欄位級別還原（`_parseDateString` 輔助函數）。
  - `types/mapping.ts` 的 `_toDateOrString` 使用 Regex 拆解年月日。

### 3. 前端資料層（`src/lib/api/client.ts`）

#### 資料儲存結構

| 儲存鍵 | 內容 | 備份是否包含 |
|---|---|---|
| `tradepilot_stocks` | `StockData[]`（不含 tags/notes） | ✅ 含，轉為二維陣列 |
| `tradepilot_settings` | `SystemSettings` | ✅ 含 |
| `tradepilot_meta` | `SystemMeta` | ✅ 含 |
| `tradepilot_logs` | `ImportLog[]` | ✅ 含 |
| `tradepilot_ui_extensions` | `Record<stockId, {tags, notes}>` | ❌ 不含（UI 專屬） |

#### 各操作行為

| 操作 | tradepilot_stocks | tradepilot_ui_extensions |
|---|---|---|
| `getStocks()` | 讀核心欄位 | 自動 merge tags/notes |
| `getStockById()` | 同 getStocks | 同 getStocks |
| `updateStock()` 含 tags/notes | 寫核心（去掉 tags/notes） | 同步寫 ext |
| `updateStock()` 不含 tags/notes | 正常更新 | 不動 |
| `updateSettings()` | 從 raw storage 讀再寫，不帶 ext | 不動 |
| `importDatabaseBackup()` | 寫 coreStocks（無 tags/notes） | 保留既有 ext，不清除 |
| `exportDatabaseBackup()` | 讀 raw，轉 BackupPayload 二維陣列 | 不納入備份 |
| `importCsv()` | 不更新（前端限制） | 不動 |
| `resetDatabase()` | 清除 | **不清除**（保留使用者筆記） |

#### CSV 匯入說明（重要限制）

前端 mock 模式**無法**執行 CSV 欄位解析（需要 GAS `Utilities.parseCsv` 及 Sheets API）。
選擇 CSV 後系統只記錄一筆「待處理」日誌，不更新股票資料。
如需真正同步，請至 Google Sheets 使用「手動匯入 CSV」選單執行 Apps Script。

#### BackupPayload 相容性

`exportDatabaseBackup()` 輸出格式與 GAS `getDatabaseBackupPayload()` 100% 相容：
- `stock_db.values` 含 header row，77 欄二維陣列
- `settings.values` 格式 `[['參數名稱','數值','說明'], ...]`
- `meta.values` 格式 `[['項目','數值'], ['交易日', ...], ...]`
- `import_log.values` 格式 `[['時間戳','狀態','訊息'], ...]`
- 日期欄位統一以 `yyyy/MM/dd` 字串格式儲存，不使用 ISO UTC

### 4. 整合測試

| 測試腳本 | 覆蓋範圍 | 狀態 |
|---|---|---|
| `scratch/test-backup.ts` | BackupPayload schema 驗證、mapping 雙向轉換 | ✅ 通過 |
| `scratch/test-mapping.ts` | DB_COL 索引對齊、rowToStockRow 完整性 | ✅ 通過 |
| `scratch/test-client-flow.ts` | getStocks merge、export 不含 tags/notes、import 還原 tags/notes 保留 | ✅ 12/12 通過 |

### 5. 已確認的一致性事項

- `APP_INFO.BACKUP_SCHEMA_VERSION` 目前是 `1.0.0`，相容版本也是 `1.0.0`。
- `vol_burst_mult`、`vol_inc_dec_mult`、`vol_dec_mult` 已修正為從 settings 工作表讀取。
- `區間買賣建議`、`區間亮點` 目前是保留欄位，尚未由 ZoneEngine 寫入。
- `無波動計數` 目前沒有實際更新邏輯，僅有格式化。
- `ZoneEngine.gs` 與 `Core.gs` 的 helper 重複問題已修正。

## 目前下一步

1. **Cloudflare Pages 部署**：push 目前 commit 到 GitHub，觸發自動部署，驗證線上環境功能正常。
2. **GAS 部署測試**：將 `Core.gs`、`APPcode.gs`、`ZoneEngine.gs` 部署至實際 Google Sheets Runtime 進行現場測試。
3. **實體 E2E 驗證**：從 GAS 匯出真實備份 JSON → 前端匯入 → 確認股票資料完整還原且畫面正確顯示。
4. **GAS Web App（未來）**：若有需要即時讀取 Sheets 資料，可在 `APPcode.gs` 加入 `doGet`/`doPost`，前端建立 `GasApiClient` 實作 `ApiClient` 介面，直接替換 mock。

## 風險與注意事項

1. CSV 同步目前只能透過 Google Sheets Apps Script 執行，前端只是記錄接收日誌。
2. 若後續新增或重命名 `stock_db` 欄位，需同步更新 `DB_COL`、`getDbHeaders()`、`mapping document.md` 三處，避免匯入還原失準。
3. `mapping document.md` 是欄位與 domain model 的契約邊界表，欄位變更時請優先更新此文件，再同步 code 與 schema。
4. `tradepilot_ui_extensions` 不進備份，若使用者換裝置或清除 localStorage，tags/notes 會遺失。未來可考慮在 exportDatabaseBackup 加入 `ui_extensions` 作為附加 section（不影響 GAS 相容性）。
5. Cloudflare Pages 接 GitHub 自動部署，push main 即觸發。

## 驗收標準

1. ✅ `client.ts` 的備份匯出/匯入端點對齊正式 `BackupPayload` 契約。
2. ✅ `getStocks` / `getSystemMeta` / `getSettings` / `getImportLogs` 讀取正確。
3. ✅ `updateStock` / `updateSettings` 回寫正確，tags/notes 路徑統一走 `tradepilot_ui_extensions`。
4. ✅ `exportDatabaseBackup` / `importDatabaseBackup` 端對端驗證通過（`test-client-flow.ts`）。
5. ✅ `npx tsc --noEmit` 通過，`npm run build` 通過（236kB）。
6. ⬜ Cloudflare Pages 線上部署驗證。
7. ⬜ GAS 現場部署測試（實體備份 E2E）。

## 使用方式

之後如果要續作，只要貼這份文件，並附上一句：

> 依照這份進度紀錄繼續。

就能直接從目前狀態接續，不必重新整理背景。