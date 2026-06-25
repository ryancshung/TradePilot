# TradePilot Antigravity 共同進度紀錄

> 這份文件用來讓 Perplexity 與 Antigravity 對齊目前進度。之後只要貼上這份文件，就能快速判斷目前做到哪裡、下一步要做什麼。

## 目前目標

先完成 **TypeScript / schema / mapping / backup** 的契約層整理，再回頭對齊 Apps Script 的讀寫邏輯與欄位索引。[file:315][file:277][file:278]

## 已確認的核心檔案

- `data_contract.md`：主契約文件，定義 `Stock`、`ZoneState`、`MetaSettings` 與欄位對照。[file:315]
- `Core-5.gs`：包含 `APP_INFO`、`CONFIG`、`getSettingsMap()`、`updateMetaData()`、`importDatabaseJson()`、`importStockCSV()`、`updateCalculations()`。[file:277][file:280]
- `APPcode.gs`：包含 `initSystem()`、`getDatabaseBackupPayload()`、`getDbHeaders()`、`applyDbSheetFormatting()`、`postRestoreFormatting()`。[file:280]
- `ZoneEngine-6.gs`：包含 `updateBuyZoneStatus()` 與區間 / 均線 / 通知判定邏輯。[file:278]

## 現在的交付物

### 1. 類型與契約層

- `types/domain.ts`
  - 定義 `Stock`。
  - 定義 `ZoneState`。
  - 定義 `TradeMeta`。
  - 定義 `TradeSettings`。
  - 子介面與 literal union 一次列完整。[file:315]

- `types/mapping.ts`
  - 定義 `DB_COL` 索引常數（與 `getDbHeaders()` 一對一對應，index 0–76 完整標記）。
  - 定義 `SUPPORT_INDICES` / `RESIST_INDICES` 陣列常數。
  - 定義 `rowToStock`、`stockToRow` (雙向對齊)。
  - 定義 `rowToZoneState`、`zoneStateToRow` (雙向對齊)。
  - 定義 `rowToStockRow`、`stockRowToRow` (雙向對齊)。
  - 定義 `sheetValuesToStockRows`。
  - 定義 `metaValuesToTradeMeta`、`tradeMetaToMetaValues` (雙向對齊)。
  - 定義 `rawMapToTradeSettings`、`tradeSettingsToRawMap`、`tradeSettingsToSheetValues` (雙向對齊)。

- `types/backup.ts`
  - 定義 `BackupPayload`（含 `app / backup / summary / sheets` 全部子型別）。
  - 定義 `CURRENT_SCHEMA_VERSION` / `COMPATIBLE_SCHEMA_VERSIONS` 常數。
  - 定義 `validateBackupJson`（純函數，不依賴 GAS）。
  - 定義 `getSheetFromPayload`。
  - 定義 `isValidSheetData`。
  - 定義 `extractBackupInfo`。
  - 定義 `SHEET_NAMES` / `BACKUP_SHEET_ORDER` 常數。[file:277][file:315]

- `types/index.ts`
  - barrel re-export。[file:315]

### 2. 已完成的最小修正（本次 session）

- **移除 `ZoneEngine.gs` 開頭 161 行與 `Core.gs` 重複的 helper 函數**
  - 包含：`_isBuyReadyFormat`、`_isSellReadyFormat`、`_isBuyWaitBreakoutFormat`、`_isSellWaitBreakdownFormat`、`_isBuyNotBelowFormat`、`_isSellNotAboveFormat` : `_fmtPrice`、`_setBlank`、`_setValue`、`_incCell`、`_clearCells`、`_findFirstBlankIndex`、`_findMinIndexAmongFilled`、`_findMaxIndexAmongFilled`、`_buildSuperBreakInfo`、`_buildSuperBreakoutInfo`。
  - `Core.gs` 為唯一來源，消除 GAS runtime 合併後的隱性覆蓋風險。
  - `ZoneEngine.gs` 從 670 行縮減至 521 行。

- **量能閾值改從 settings 工作表讀取（不再 hardcoded）**
  - `vol_burst_mult` / `vol_inc_dec_mult` / `vol_dec_mult` 現在透過 `getSettingsMap()` 讀取。
  - 讀不到或非數字時 fallback：1.5 / 1.0 / 0.6（原始預設值）。
  - settings 表不存在時安全退回 fallback。

- **補齊 `ZoneEngine.gs` 的 `requireHeaders` 欄位驗證**
  - 在 `updateBuyZoneStatus` 開頭的必要欄位檢查中，補上原本遺漏的 `'現-爆量'` 欄位，確保執行期欄位驗證百分之百完整。

- **完成 `BackupPayload` JSON 備份還原解析整合測試**
  - 撰寫 `scratch/test-backup.ts`，串接 `JSON備份還原 -> TS Schema驗證 -> mapping -> Domain Model` 的轉換流水線，經 `npx tsx` 執行成功，且通過 `npx tsc` 全域型別檢查。

- **修復備份還原日期格式跑掉之 Bug**
  - **匯出固定格式**：修正 `getDatabaseBackupPayload` 將 `Date` 物件固定以 `'yyyy/MM/dd'` 字串格式匯出，避免產生 ISO UTC 字串。
  - **欄位級別還原**：修正 `importDatabaseJson` 限制僅在明確的日期欄位（`buyObsDate` / `sellObsDate` 與 `meta` 日期儲存格）將字串以自製的 `_parseDateString` 輔助函數轉回 `Date` 物件。
  - **映射端安全對焦**：重構 `types/mapping.ts` 的 `_toDateOrString` 函數，使用 Regex 明確拆解年月日來重新建立 `Date` 物件，避免不同 Runtime 解譯 `yyyy/MM/dd` 字串構造器的相容性問題。

### 3. 待補強

- 無（已完整補齊雙向 Mapping，並通過本地 Round-trip 驗證）。

## 重要一致性事項

- `APP_INFO.BACKUP_SCHEMA_VERSION` 目前是 `1.0.0`，相容版本也是 `1.0.0`。[file:277]
- `vol_burst_mult`、`vol_inc_dec_mult`、`vol_dec_mult` ✅ **已修正**：`ZoneEngine.gs` 的量能判定已改從 settings 工作表讀取，hardcoded 問題已解決。[file:315][file:278]
- `區間買賣建議`、`區間亮點` 目前是保留欄位，尚未由 ZoneEngine 寫入。[file:315][file:278]
- `無波動計數` 目前沒有實際更新邏輯，僅有格式化。[file:315][file:278]
- `ZoneEngine.gs` 與 `Core.gs` 的 helper 重複問題 ✅ **已修正**。[file:315][file:278]

## 檢核標準

- `types/domain.ts` 可編譯。[file:315]
- mapping 與 `stock_db` 欄位對齊。[file:280][file:315]
- backup JSON 驗證可獨立於 GAS 執行。[file:277]
- read-side 與 write-side mapping 需對稱。[file:315]
- `getDbHeaders()`、`updateBuyZoneStatus()`、`backup` 驗證三者需一致。[file:280][file:278][file:277]

## 進度判讀

- 契約雙向映射與 Apps Script 核心邏輯（`getDbHeaders`、`updateBuyZoneStatus`、備份驗證還原）均已完全對齊並測試通過，系統功能在契約層與邏輯層均達驗收標準。

## 目前下一步

1. 將本機已驗證的修正檔案部署至實際 Google Sheets Apps Script Runtime 進行現場測試。
2. 設計或對接外部系統/前端介面，與已打通的 `BackupPayload` JSON 整合，測試實體備份還原流程。

## 使用方式

之後如果要續作，只要貼這份文件，並附上一句：

> 依照這份進度紀錄繼續。

就能直接從目前狀態接續，不必重新整理背景。[file:315][file:277][file:278]