# TradePilot 正式規格整包文件 v1

本文件定義前端重構、Cloudflare Pages Functions API、Google Sheets mapping 與 Cloudflare D1 的正式規格基礎，採 contract-first / API-first 的方式先固定契約，再讓 mock 與正式實作共用同一套資料模型與接口，以降低整合風險與重工。[cite:89][cite:97][cite:72]

## 架構範圍

正式版建議以 Cloudflare Pages 承載前端，使用 Pages Functions 提供 API，並透過 bindings 串接 D1 等 Cloudflare 資源；這使前端與 API 可維持在同一專案中，且利於逐步由 mock 過渡到正式後端。[cite:20][cite:9] Google Sheets 保留為主要交易資料來源，但不直接暴露給前端；前端只接觸語意化 API 與 domain model，避免欄位字母與商業規則滲透到 UI。[cite:94][cite:88]

## 設計原則

- 單一真相來源：domain model 與 API contract 為 source of truth。[cite:89][cite:97]
- 前端不直接接觸 Google Sheets 欄位代號、localStorage 或 D1 schema。[cite:72][cite:80]
- mock 與正式 API 必須共用同一套 request/response type。[cite:73][cite:81]
- 商業規則放在 domain / service 層，不放在畫面元件內。[cite:77][cite:80]
- 備份格式需有 `schemaVersion`，支援未來演進。[cite:72]

## Domain model v2

### 型別總覽

| 型別 | 用途 |
|---|---|
| `StockListItem` | 首頁股票列表卡片 / 表格資料 |
| `StockDetail` | 個股詳細頁完整資料 |
| `MovingAverageBlock` | 均線區塊資料 |
| `ZoneAnalysisBlock` | 箱型區間分析與繪圖資料 |
| `ZoneLine` | 壓力線 / 支撐線單條資料 |
| `PriceMarkers` | 現價 / 昨價 / 高低價標記 |
| `ZoneArrow` | 前價到現價的箭頭資訊 |
| `StockNote` | 個股筆記 |
| `TagSummary` | 標籤摘要 |
| `AppSettings` | 前端與系統參數設定 |
| `MetaInfo` | 交易日、版本與同步時間資訊 |

### TypeScript 草案

```ts
export type SignalLabel =
  | '可停利'
  | '可停損'
  | '爆量'
  | '量增'
  | '量減'
  | '量縮'
  | null;

export interface TagSummary {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface StockNote {
  stockId: string;
  content: string;
  updatedAt: string | null;
}

export interface MetaInfo {
  tradeDate: string | null;
  nextDate: string | null;
  observationDate: string | null;
  appVersion: string;
  lastSyncedAt: string | null;
}

export interface AppSettings {
  rangeUpperMult: number;
  rangeLowerMult: number;
  buySignalMult: number;
  sellSignalMult: number;
  volBurstMult: number;
  volIncDecMult: number;
  volDecMult: number;
}

export interface StockListItem {
  id: string;
  name: string;
  currentPrice: number | null;
  diff: number | null;
  pct: number | null;
  high: number | null;
  low: number | null;
  marketCap: number | null;
  buyZoneStatus: string | null;
  sellZoneStatus: string | null;
  recommendation: string | null;
  highlight: string | null;
  maStatus: string | null;
  maKey: string | null;
  volumeSignal: SignalLabel;
  priceAlert: SignalLabel;
  tags: TagSummary[];
}

export interface MovingAverageItem {
  value: number | null;
  biasPct: number | null;
}

export interface MovingAverageBlock {
  ma5: MovingAverageItem;
  ma10: MovingAverageItem;
  ma20: MovingAverageItem;
  ma60: MovingAverageItem;
  status: string | null;
  key: string | null;
  volumeSignal: SignalLabel;
}

export interface ZoneLine {
  label: string;
  value: number;
  style: 'solid' | 'dashed';
  rank: 1 | 2 | 3;
}

export interface PriceMarkers {
  currentPrice: number | null;
  currentHigh: number | null;
  currentLow: number | null;
  previousPrice: number | null;
  previousHigh: number | null;
  previousLow: number | null;
}

export interface ZoneArrow {
  fromLabel: 'C' | 'D' | 'E';
  toLabel: 'L' | 'M' | 'N';
  color: string;
  fromValue: number | null;
  toValue: number | null;
}

export interface ZoneAnalysisBlock {
  buyZoneStatus: string | null;
  sellZoneStatus: string | null;
  recommendation: string | null;
  highlight: string | null;
  breakoutCount: number | null;
  breakdownCount: number | null;
  superBreakoutCount: number | null;
  superBreakdownCount: number | null;
  refreshSupportCount: number | null;
  refreshPressureCount: number | null;
  noVolatilityCount: number | null;
  resistanceCandidates: number[];
  supportCandidates: number[];
  resistanceLines: ZoneLine[];
  supportLines: ZoneLine[];
  markers: PriceMarkers;
  arrows: ZoneArrow[];
}

export interface StockDetail {
  id: string;
  name: string;
  marketCap: number | null;
  currentPrice: number | null;
  diff: number | null;
  pct: number | null;
  high: number | null;
  low: number | null;
  previousPrice: number | null;
  previousHigh: number | null;
  previousLow: number | null;
  takeProfit: number | null;
  stopLoss: number | null;
  priceAlert: SignalLabel;
  halfYearHigh: number | null;
  halfYearLow: number | null;
  movingAverage: MovingAverageBlock;
  zoneAnalysis: ZoneAnalysisBlock;
  note: StockNote;
  tags: TagSummary[];
}
```

### 商業規則

到價通知規則：當 `currentPrice > takeProfit` 時顯示「可停利」，當 `currentPrice < stopLoss` 時顯示「可停損」，其他情況或停利停損缺值時不顯示。[cite:94] 量能規則：當量比欄位值 `>= 1.5` 顯示「爆量」，`>= 1.0` 顯示「量增」，`< 1.0` 顯示「量減」，`<= 0.6` 顯示「量縮」；實作時需明確定義判斷優先序，以避免同時命中多個狀態。[file:1]

建議量能顯示採以下優先序：

```ts
function resolveVolumeSignal(v: number | null): SignalLabel {
  if (v === null) return null;
  if (v >= 1.5) return '爆量';
  if (v <= 0.6) return '量縮';
  if (v >= 1.0) return '量增';
  return '量減';
}
```

這個優先序可避免 `0.5` 同時被判定為 `量減` 與 `量縮`，並讓高量與低量兩端都具明確覆蓋邏輯。[file:1]

## API contract v2

API-first 的目標是先定義可驗證的 request/response contract，再讓前端、mock provider 與正式後端共同遵守，以減少整合期重構。[cite:72][cite:76][cite:81]

### Endpoint 總覽

| Method | Path | 用途 |
|---|---|---|
| `GET` | `/api/meta` | 取得交易日期與版本資訊 |
| `GET` | `/api/settings` | 取得系統參數 |
| `PATCH` | `/api/settings` | 更新系統參數 |
| `GET` | `/api/stocks` | 取得首頁股票列表 |
| `GET` | `/api/stocks/:id` | 取得單一股票詳細資訊 |
| `PATCH` | `/api/stocks/:id/targets` | 更新停利停損 |
| `GET` | `/api/notes/:id` | 取得個股筆記 |
| `PUT` | `/api/notes/:id` | 更新個股筆記 |
| `GET` | `/api/tags` | 取得標籤列表 |
| `POST` | `/api/tags` | 新增標籤 |
| `PATCH` | `/api/tags/:id` | 更新標籤 |
| `DELETE` | `/api/tags/:id` | 刪除標籤 |
| `PUT` | `/api/stocks/:id/tags` | 覆蓋單一個股標籤 |
| `POST` | `/api/import/csv` | 匯入 CSV |
| `POST` | `/api/import/json` | 匯入 JSON 備份 |
| `GET` | `/api/export/json` | 匯出 JSON 備份 |
| `GET` | `/api/import/logs` | 取得匯入日誌 |

### 共用 response shape

```ts
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

### `GET /api/meta`

```ts
type GetMetaResponse = ApiResponse<MetaInfo>;
```

### `GET /api/settings`

```ts
type GetSettingsResponse = ApiResponse<AppSettings>;
```

### `PATCH /api/settings`

```ts
interface PatchSettingsRequest {
  rangeUpperMult?: number;
  rangeLowerMult?: number;
  buySignalMult?: number;
  sellSignalMult?: number;
  volBurstMult?: number;
  volIncDecMult?: number;
  volDecMult?: number;
}

type PatchSettingsResponse = ApiResponse<AppSettings>;
```

### `GET /api/stocks`

```ts
interface GetStocksQuery {
  tagId?: string;
  keyword?: string;
  sortBy?:
    | 'id'
    | 'name'
    | 'currentPrice'
    | 'diff'
    | 'pct'
    | 'high'
    | 'low'
    | 'buyZoneStatus'
    | 'sellZoneStatus'
    | 'recommendation'
    | 'highlight'
    | 'maStatus'
    | 'maKey'
    | 'volumeSignal'
    | 'priceAlert'
    | 'marketCap';
  order?: 'asc' | 'desc';
}

interface GetStocksPayload {
  items: StockListItem[];
  total: number;
}

type GetStocksResponse = ApiResponse<GetStocksPayload>;
```

### `GET /api/stocks/:id`

```ts
type GetStockDetailResponse = ApiResponse<StockDetail>;
```

### `PATCH /api/stocks/:id/targets`

```ts
interface PatchTargetsRequest {
  takeProfit: number | null;
  stopLoss: number | null;
}

type PatchTargetsResponse = ApiResponse<{
  stockId: string;
  takeProfit: number | null;
  stopLoss: number | null;
  priceAlert: SignalLabel;
}>;
```

### `GET /api/notes/:id` / `PUT /api/notes/:id`

```ts
type GetNoteResponse = ApiResponse<StockNote>;

interface PutNoteRequest {
  content: string;
}

type PutNoteResponse = ApiResponse<StockNote>;
```

### `GET /api/tags` / `POST /api/tags` / `PATCH /api/tags/:id`

```ts
interface Tag {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type GetTagsResponse = ApiResponse<Tag[]>;

interface PostTagRequest {
  name: string;
  color: string;
}

type PostTagResponse = ApiResponse<Tag>;

interface PatchTagRequest {
  name?: string;
  color?: string;
  sortOrder?: number;
}

type PatchTagResponse = ApiResponse<Tag>;
```

### `PUT /api/stocks/:id/tags`

```ts
interface PutStockTagsRequest {
  tagIds: string[];
}

type PutStockTagsResponse = ApiResponse<{
  stockId: string;
  tags: TagSummary[];
}>;
```

### 匯入匯出

```ts
interface ImportCsvResponseData {
  imported: number;
  skipped: number;
  deletedIds: string[];
  tradeDate: string | null;
}

type ImportCsvResponse = ApiResponse<ImportCsvResponseData>;

type ImportJsonResponse = ApiResponse<{
  schemaVersion: string;
  importedAt: string;
}>;

type ExportJsonResponse = ApiResponse<{
  fileName: string;
  content: string;
}>;
```

## Google Sheets mapping v2

Google Sheets 可作為主要業務資料來源，但前端不應直接接觸欄位字母；因此 backend adapter 應將試算表欄位映射成語意欄位，再由 API 提供 domain model。[cite:94][cite:88]

### 分頁角色

| Sheet | 用途 |
|---|---|
| `stock_db` | 主股票資料 |
| `settings` | 系統參數 |
| `meta` | 交易日、版本與更新資訊 |
| `import_log` | 匯入記錄 |

### 欄位 mapping

| Sheet 欄位 | 語意欄位 |
|---|---|
| A | `name` |
| B | `id` |
| C | `previousPrice` |
| D | `previousHigh` |
| E | `previousLow` |
| L | `currentPrice` |
| M | `high` |
| N | `low` |
| O | `volumeRatio` |
| P | `ma5` |
| Q | `ma10` |
| R | `ma20` |
| S | `ma60` |
| T | `marketCap` |
| U | `diff` |
| V | `pct` |
| W:AF | `supportCandidatesBase` |
| AG:AP | `resistanceCandidatesBase` |
| AQ | `breakoutCount` |
| AR | `breakdownCount` |
| AS | `superBreakoutCount` |
| AT | `superBreakdownCount` |
| AU | `refreshSupportCount` |
| AV | `refreshPressureCount` |
| AW | `noVolatilityCount` |
| BB | `resistanceCandidateBb` |
| BC | `supportCandidateBc` |
| BD | `resistanceCandidateBd` 或 `maKeyLegacy` |
| BE | `supportCandidateBe` |
| BF | `buyZoneStatus` |
| BG | `sellZoneStatus` |
| BH | `recommendation` |
| BI | `highlight` |
| BL | `takeProfit` |
| BM | `stopLoss` |
| BN | `maStatus` |
| BO | `maKey` |
| BP | `ma5BiasPct` |
| BQ | `ma10BiasPct` |
| BR | `ma20BiasPct` |
| BS | `ma60BiasPct` |
| BX | `priceAlertLegacy` |
| BY | `volumeSignalLegacy` |

### Zone lines 生成規則

正式版應以 backend / domain service 生成 `ZoneAnalysisBlock`，而不是讓前端在圖表元件內做挑線邏輯。[cite:77][cite:80]

#### 壓力線

- 來源：`AG:AP`、`BB`、`BD` 的所有有效數值。
- 排序：由小到大。
- 取最小的三個值。
- 三條線中最小者為 `solid`，其餘兩條為 `dashed`。

#### 支撐線

- 來源：`W:AF`、`BC`、`BE` 的所有有效數值。
- 排序：由大到小。
- 取最大的三個值。
- 三條線中最大者為 `solid`，其餘兩條為 `dashed`。

#### 箭頭

- `C -> L` 使用 color A。
- `D -> M` 使用 color B。
- `E -> N` 使用 color C。

#### 範例

```ts
function buildResistanceLines(values: number[]): ZoneLine[] {
  return values
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b)
    .slice(0, 3)
    .map((value, index) => ({
      label: `R${index + 1}`,
      value,
      style: index === 0 ? 'solid' : 'dashed',
      rank: (index + 1) as 1 | 2 | 3,
    }));
}
```

### settings mapping

| settings key | AppSettings |
|---|---|
| `range_upper_mult` | `rangeUpperMult` |
| `range_lower_mult` | `rangeLowerMult` |
| `buy_signal_mult` | `buySignalMult` |
| `sell_signal_mult` | `sellSignalMult` |
| `vol_burst_mult` | `volBurstMult` |
| `vol_inc_dec_mult` | `volIncDecMult` |
| `vol_dec_mult` | `volDecMult` |

### meta mapping

| meta key | MetaInfo |
|---|---|
| `tradeDate` | `tradeDate` |
| `nextTradeDate` | `nextDate` |
| `obsDate` | `observationDate` |
| `appVersion` | `appVersion` |
| `lastUpdated` | `lastSyncedAt` |

## D1 schema v2

Cloudflare Pages Functions 可透過 bindings 存取 D1，因此筆記、標籤與執行期中繼資料很適合放在 D1，而不是混在 Google Sheets 主表裡。[cite:20][cite:82]

### 資料表

```sql
CREATE TABLE stock_notes (
  stock_id TEXT PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE stock_tag_map (
  stock_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (stock_id, tag_id),
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE app_runtime_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 建議索引

```sql
CREATE INDEX idx_tags_sort_order ON tags(sort_order);
CREATE INDEX idx_stock_tag_map_tag_id ON stock_tag_map(tag_id);
CREATE INDEX idx_stock_tag_map_stock_id ON stock_tag_map(stock_id);
```

### app_runtime_meta 用途

| key | 用途 |
|---|---|
| `last_csv_import_at` | 最近 CSV 匯入時間 |
| `last_json_import_at` | 最近 JSON 還原時間 |
| `last_sync_status` | 最近同步結果 |
| `frontend_build_version` | 前端部署版本 |

## JSON backup schema v1

備份格式應包含 `schemaVersion`，使之可向後相容與可遷移。[cite:72][cite:97]

```json
{
  "app": {
    "name": "TradePilot_StockSystem",
    "version": "vNext"
  },
  "backup": {
    "schemaVersion": "1.0.0",
    "exportedAt": "2026-06-24T00:00:00.000Z",
    "exportedAtLocal": "2026/6/24 08:00:00"
  },
  "data": {
    "stockdb": [],
    "settings": {},
    "meta": {},
    "importlog": [],
    "notes": [],
    "tags": [],
    "tagMappings": []
  }
}
```

## 實作分層

### 前端

- `features/stocks`
- `features/settings`
- `features/tags`
- `features/notes`
- `lib/api`
- `lib/domain`
- `lib/types`

### API 層

- request validation
- Google Sheets adapter
- D1 repository
- domain services
- response mapper

### 分層責任

| 層 | 責任 |
|---|---|
| UI components | 顯示與互動 |
| feature hooks / page containers | 呼叫 client、狀態整合 |
| client | 呼叫 API / mock provider |
| domain services | 商業規則、資料整形 |
| adapters | Google Sheets 與 D1 存取 |

這樣的分層可讓前端元件不直接承擔 storage、欄位映射與商業規則，符合 contract-first 的維護方式。[cite:77][cite:80]

## 過渡計畫

### Phase 1

- 完成前端型別重構。
- 建立 `MockApiClient` 與 `HttpApiClient` 共用接口。
- 將現有 UI 改吃新 domain model。

### Phase 2

- 建立 Pages Functions API skeleton。
- 接上 `GET /api/meta`、`GET /api/settings`、`GET /api/stocks`、`GET /api/stocks/:id`。
- 完成 Google Sheets read adapter。

### Phase 3

- 接上 `PATCH /api/settings`、`PATCH /api/stocks/:id/targets`。
- 接上 D1 `notes / tags / tagMappings`。
- 接上 `GET/PUT /api/notes/:id`、`GET/POST/PATCH /api/tags`。

### Phase 4

- 實作 `POST /api/import/csv`、`POST /api/import/json`、`GET /api/export/json`。
- 補齊 `import_log` 與 runtime meta。
- 移除前端對 mock persistence 的依賴。

## 驗收標準

| 項目 | 驗收條件 |
|---|---|
| 型別 | UI 不再依賴舊 `StockData` 巨型物件 |
| API | mock 與正式版共用同一套 contract |
| Chart | 圖表僅 render，不在元件內做挑線規則 |
| Sheets | 前端不出現欄位字母 A/B/L/BF 等字樣 |
| D1 | 筆記與標籤獨立於 Google Sheets |
| Backup | 含 `schemaVersion` 與 notes/tags/tagMappings |
| Deploy | 可部署於 Pages，API 由 Pages Functions 提供 |

## 建議下一步

- 以前端重構任務單為基準，先完成 domain model 與 client 分層。[cite:72][cite:73]
- 同步建立 Pages Functions route skeleton 與 D1 migration 檔。[cite:20][cite:82]
- 將 Google Sheets 欄位映射封裝成 adapter，避免欄位字母擴散到前端與 API response。[cite:94]

本文件可作為 Antigravity 前端重構、正式 API 設計與後續 Cloudflare / Google Sheets / D1 實作的共同基準文件。[cite:89][cite:97][cite:20]
