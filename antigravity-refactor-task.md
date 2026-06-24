# Antigravity 下一階段重構任務單

本階段目標不是重做 UI，而是把現有可運作的 mock 前端整理成可平滑接上正式後端的前端架構。重構方向採 contract-first / API-first：先固定 domain model、API contract、資料邊界與 provider 抽象，再保留現有 UI 作為正式版視覺基底；這樣能降低從 mock 切到正式 API 的重工與整合風險。[cite:72][cite:77][cite:80]

## 任務原則

- 不新增新的視覺功能，不重做列表頁與個股頁主 UI。
- 優先處理型別、client、mock data、chart data model、tags model、settings/meta 命名與備份格式。
- 目標是讓前端可以在 `MockApiClient` 與未來 `HttpApiClient` 間切換，而不需要修改 pages/components。[cite:72][cite:73]

## P0 必做

### 1. 型別重構

請將現有 `StockData`、`SystemMeta`、`SystemSettings` 重構為正式 domain model：

- `StockListItem`
- `StockDetail`
- `MovingAverageBlock`
- `ZoneAnalysisBlock`
- `ZoneLine`
- `PriceMarkers`
- `ZoneArrow`
- `StockNote`
- `TagSummary`
- `AppSettings`
- `MetaInfo`

要求：
- UI 元件不得再依賴單一超大 `StockData` 物件。
- 列表頁與詳細頁型別拆開，避免 detail 欄位污染 list 資料模型。
- 所有 pages/components 只能吃 domain model，不可直接吃 raw mock shape。[cite:73][cite:83]

### 2. API client 重構

請重構 `client.ts` 與資料存取方式為：

- `ApiClient`
- `MockApiClient`
- `HttpApiClient`
- `StorageAdapter`
- `MemoryAdapter`
- `BrowserStorageAdapter`

要求：
- 頁面與元件不可直接使用 `localStorage`。
- 預設 mock persistence 改用 `MemoryAdapter`。
- `BrowserStorageAdapter` 僅作開發環境 fallback。
- `ApiClient` 方法名稱與回傳 shape 必須對齊正式 API contract。[cite:72][cite:77][cite:80]

### 3. 區間圖資料模型重構

請將 `StockBoxChart` 改為接收 `ZoneAnalysisBlock`，不要再直接接收整個 `stock` 物件，也不要在圖表元件內自行從 `supports` / `pressures` 做 `slice(0, 3)`。[cite:83]

正式輸入欄位至少應包含：

- `resistanceCandidates`
- `supportCandidates`
- `resistanceLines`
- `supportLines`
- `currentMarkers`
- `previousMarkers`
- `arrows`

要求：
- 三條主顯示線的挑選邏輯移到 `lib/domain/zone.ts`。
- 圖表元件只負責 rendering，不處理商業規則。

### 4. 標籤模型重構

請將目前 `tags: string[]` 升級為正式 tag model，至少包含：

- `TagSummary`
- `Tag`
- `StockTagMapping` 或等價結構

要求：
- `TagManager` 不再只吃 `string[]`。
- 至少保留 `id`、`name`、`color`、`sortOrder`。
- 個股頁與列表頁均以正式 tag model 呈現標籤資料。

## P1 高優先

### 5. settings / meta 命名對齊

請將前端 domain model 統一改為 camelCase：

- `rangeUpperMult`
- `rangeLowerMult`
- `buySignalMult`
- `sellSignalMult`
- `volBurstMult`
- `volIncDecMult`
- `volDecMult`
- `tradeDate`
- `nextDate`
- `observationDate`
- `appVersion`
- `lastSyncedAt`

要求：
- snake_case 只允許存在於 mapping 層或 raw mock data。
- UI 與 pages/components 一律使用 camelCase domain model。[cite:72][cite:73]

### 6. 匯入匯出格式重構

請將 `exportDatabaseBackup()` / `importDatabaseBackup()` 對齊正式備份結構，至少預留：

- `stockdb`
- `settings`
- `meta`
- `importlog`
- `notes`
- `tags`
- `tagMappings`
- `schemaVersion`

要求：
- import 流程需做 schema 驗證。
- UI 文案可以維持，但內部資料 shape 必須可對接正式版。
- notes / tags / mappings 不得繼續隱含在 stock 大物件內。

### 7. mock data 分層

請將 mock data 拆成：

- `mockRawData.ts`
- `mockMappers.ts`
- `mockFixtures.ts`

要求：
- raw source、mapping、UI-ready fixtures 三者分離。
- `mockFixtures` 必須對齊正式 domain model。

## P2 次優先

### 8. 專案結構整理

請整理成 feature-based 結構：

- `features/stocks`
- `features/settings`
- `features/tags`
- `features/notes`
- `lib/api`
- `lib/domain`
- `lib/types`

要求：
- 新增檔案時以業務領域為優先，不以單純頁面層級堆疊。

### 9. 正式 API type 預留

請先建立以下 endpoints 的 request/response types：

- `GET /api/meta`
- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/stocks`
- `GET /api/stocks/:id`
- `PATCH /api/stocks/:id/targets`
- `GET /api/notes/:id`
- `PUT /api/notes/:id`
- `GET /api/tags`
- `POST /api/tags`
- `PATCH /api/tags/:id`

目標是讓 `HttpApiClient` 之後只需補上 transport，而非重寫前端資料型別。[cite:72][cite:76][cite:81]

### 10. 文件補齊

請新增簡短 `README` 或 `migration-notes.md`，內容至少包含：

- mock → HttpApiClient 切換方式
- 哪些檔案是 contract source of truth
- Pages Functions 對接預期 API 路徑
- 未來接 Google Sheets / D1 時，哪一層負責 mapping

## 交付物

請於本階段交付以下內容：

- 重構後檔案清單
- 舊型別 → 新型別對照表
- 舊 API shape → 新 API shape 對照表
- 可執行的 `MockApiClient`
- `StockBoxChart` 的 `ZoneAnalysisBlock` props 範例
- sample backup JSON
- sample `StockDetail` JSON
- migration note / README

## 驗收標準

| 驗收項目 | 標準 |
|---|---|
| 型別 | pages/components 不再引用舊 `StockData` 大物件 |
| Client | 可以在 mock provider 與 future HTTP provider 間切換 |
| Storage | UI 不直接使用 `localStorage` |
| Chart | 圖表不再自行挑三條線 |
| Tags | 不再使用單純 `string[]` |
| Settings | 前端 UI 使用 camelCase domain model |
| Backup | 含 `schemaVersion` 與正式結構預留 |
| Mock | fixtures 與 raw data 已分層 |

## 建議實作順序

1. 重構 `types`
2. 重構 `ApiClient` + adapter
3. 重構 zone model / chart props
4. 重構 tags model
5. 重構 settings / meta naming
6. 重構 backup format
7. 最後補 README 與 API type definitions

這個順序符合 API-first / contract-first 的實作方式：先穩定型別與契約，再讓 provider 與 UI 對齊，能降低之後串接正式 API 的修改範圍。[cite:72][cite:77][cite:81]
