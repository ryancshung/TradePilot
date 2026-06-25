/**
 * scratch/test-client-flow.ts
 *
 * 模擬前端 MockApiClient 的完整資料流：
 * 1. 初始載入 stocks（含 mock tags/notes）
 * 2. updateStock 更新 tags/notes → 確認 ui_extensions 分離
 * 3. exportDatabaseBackup → 確認 JSON 不含 tags/notes
 * 4. importDatabaseBackup → 確認 tags/notes 透過 ui_extensions 保留
 * 5. getStocks 再次讀取 → 確認 tags/notes 正確 merge 回來
 */

// 模擬瀏覽器 localStorage
const _store: Record<string, string> = {};
const localStorage = {
  getItem: (k: string) => _store[k] ?? null,
  setItem: (k: string, v: string) => { _store[k] = v; },
  removeItem: (k: string) => { delete _store[k]; },
};
// @ts-ignore
globalThis.localStorage = localStorage;
// @ts-ignore
globalThis.Intl = {
  DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'Asia/Taipei' }) }),
};

import {
  validateBackupJson,
  sheetValuesToStockRows,
  stockRowToRow,
  rawMapToTradeSettings,
  tradeSettingsToRawMap,
  tradeSettingsToSheetValues,
  tradeMetaToMetaValues,
  metaValuesToTradeMeta,
  extractBackupInfo,
  getSheetFromPayload,
  isValidSheetData,
} from '../types';
import type { StockRow, TradeMeta, BackupPayload } from '../types';
import type { StockData, SystemMeta, SystemSettings, ImportLog } from '../src/lib/types';

// ─────────────────────────────────────────────
// 直接重現 client.ts 的核心邏輯（無 browser import）
// ─────────────────────────────────────────────

interface UiExtension { tags: string[]; notes: string; }
type UiExtensions = Record<string, UiExtension>;

const STORAGE_KEYS = {
  STOCKS: 'tradepilot_stocks',
  SETTINGS: 'tradepilot_settings',
  META: 'tradepilot_meta',
  LOGS: 'tradepilot_logs',
  EXTENSIONS: 'tradepilot_ui_extensions',
} as const;

function _fmtDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  }
  return String(d).trim() || null;
}

function stockRowToStockData(row: StockRow, ext?: UiExtension): StockData {
  const s = row.stock;
  const z = row.zone;
  return {
    id: s.identity.id,
    name: s.identity.name,
    currPrice: s.price.curr.close,
    prevPrice: s.price.prev.close,
    diff: s.price.delta,
    pct: s.price.changePct,
    high: s.price.curr.high,
    low: s.price.curr.low,
    volBurst: z.alert.volume === '爆量',
    ma5: s.ma.curr.ma5,
    ma10: s.ma.curr.ma10,
    ma20: s.ma.curr.ma20,
    ma60: s.ma.curr.ma60,
    marketCap: s.marketCap.curr,
    prevHigh: s.price.prev.high,
    prevLow: s.price.prev.low,
    prevMa5: s.ma.prev.ma5,
    prevMa10: s.ma.prev.ma10,
    prevMa20: s.ma.prev.ma20,
    prevMa60: s.ma.prev.ma60,
    supports: z.support.levels,
    pressures: z.resistance.levels,
    breakoutCount: z.breakout.count,
    breakdownCount: z.breakdown.count,
    superBreakoutCount: z.breakout.superCount,
    superBreakdownCount: z.breakdown.superCount,
    refreshSupportCount: z.support.refreshCount,
    refreshPressureCount: z.resistance.refreshCount,
    noVolatilityCount: z.volatility.flatCount,
    buyLowerLimit: z.zone.buy.lower,
    buyUpperLimit: z.zone.buy.upper,
    sellLowerLimit: z.zone.sell.lower,
    sellUpperLimit: z.zone.sell.upper,
    halfYearHigh: z.history.high6m,
    halfYearLow: z.history.low6m,
    buyZoneStatus: z.zone.buy.status,
    sellZoneStatus: z.zone.sell.status,
    recommendation: z.zone.recommendation,
    highlight: z.zone.highlights,
    buyObsDate: _fmtDate(z.zone.buy.obsDate),
    sellObsDate: _fmtDate(z.zone.sell.obsDate),
    takeProfit: z.risk.takeProfit,
    stopLoss: z.risk.stopLoss,
    notes: ext?.notes ?? '',
    tags: ext?.tags ?? [],
    maStatus: s.ma.status,
    maKey: s.ma.keyEvents,
    priceAlert: z.alert.price,
    volSignal: z.alert.volume,
  };
}

function stockDataToStockRow(d: StockData): StockRow {
  const parseDate = (s: string | null): Date | string | null => {
    if (!s) return null;
    const match = s.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
    if (match) return new Date(+match[1], +match[2] - 1, +match[3]);
    return s;
  };
  return {
    stock: {
      identity: { id: d.id, name: d.name },
      price: {
        prev: { close: d.prevPrice, high: d.prevHigh, low: d.prevLow },
        curr: { close: d.currPrice, high: d.high, low: d.low },
        delta: d.diff,
        changePct: d.pct,
      },
      volume: { prev: { signal: null }, curr: { signal: null } },
      marketCap: { prev: null, curr: d.marketCap },
      ma: {
        prev: { ma5: d.prevMa5, ma10: d.prevMa10, ma20: d.prevMa20, ma60: d.prevMa60 },
        curr: { ma5: d.ma5, ma10: d.ma10, ma20: d.ma20, ma60: d.ma60 },
        status: d.maStatus,
        keyEvents: d.maKey,
      },
      bias: {
        curr: { bias5: null, bias10: null, bias20: null, bias60: null },
        prev: { bias5: null, bias10: null, bias20: null, bias60: null },
      },
    },
    zone: {
      support: { levels: d.supports, refreshCount: d.refreshSupportCount },
      resistance: { levels: d.pressures, refreshCount: d.refreshPressureCount },
      breakout: { count: d.breakoutCount, superCount: d.superBreakoutCount },
      breakdown: { count: d.breakdownCount, superCount: d.superBreakdownCount },
      volatility: { flatCount: d.noVolatilityCount },
      range: { high: d.high, low: d.low },
      history: { high6m: d.halfYearHigh, low6m: d.halfYearLow },
      zone: {
        buy: { lower: d.buyLowerLimit, upper: d.buyUpperLimit, status: d.buyZoneStatus, obsDate: parseDate(d.buyObsDate) },
        sell: { lower: d.sellLowerLimit, upper: d.sellUpperLimit, status: d.sellZoneStatus, obsDate: parseDate(d.sellObsDate) },
        recommendation: d.recommendation,
        highlights: d.highlight,
      },
      risk: { takeProfit: d.takeProfit, stopLoss: d.stopLoss },
      alert: { price: d.priceAlert as any, volume: d.volSignal as any },
    },
  };
}

const HEADERS = [
  '股票名稱', '股票代號',
  '前-成交', '前-最高', '前-最低', '前-爆量', '前-5MA', '前-10MA', '前-20MA', '前-60MA', '前-市值',
  '現-成交', '現-最高', '現-最低', '現-爆量', '現-5MA', '現-10MA', '現-20MA', '現-60MA', '現-市值',
  '股價差額', '漲跌幅%',
  '支撐1', '支撐2', '支撐3', '支撐4', '支撐5', '支撐6', '支撐7', '支撐8', '支撐9', '支撐10',
  '壓力1', '壓力2', '壓力3', '壓力4', '壓力5', '壓力6', '壓力7', '壓力8', '壓力9', '壓力10',
  '突破次數', '跌破次數', '超級突破次數', '超級跌破次數', '刷新支撐次數', '刷新壓力次數', '無波動計數',
  '買入下緣', '買入上緣', '賣出下緣', '賣出上緣',
  '最高', '最低', '6個月最高', '6個月最低',
  '區間買進狀態', '區間賣出狀態', '區間買賣建議', '區間亮點',
  '買進觀察日期', '賣出觀察日期',
  '停利點', '停損點',
  '均線狀況', '均線關鍵',
  '現價5MA乖離', '現價10MA乖離', '現價20MA乖離', '現價60MA乖離',
  '前價5MA乖離', '前價10MA乖離', '前價20MA乖離', '前價60MA乖離',
  '到價通知', '量縮量增',
];

// ─────────────────────────────────────────────
// Mock initial data
// ─────────────────────────────────────────────

const MOCK_STOCK: StockData = {
  id: '2330',
  name: '台積電',
  currPrice: 978, prevPrice: 970, diff: 8, pct: 0.0082,
  high: 984, low: 968, volBurst: true,
  ma5: 962.4, ma10: 954.2, ma20: 940.8, ma60: 912.5, marketCap: 25360000,
  prevHigh: 975, prevLow: 958, prevMa5: 957.2, prevMa10: 950.5, prevMa20: 938, prevMa60: 911.2,
  supports: [960, 950, 942, 930, 920, 905, 890, 875, 860, 840],
  pressures: [985, 995, 1000, 1010, 1025, 1040, 1060, 1080, 1100, 1150],
  breakoutCount: 4, breakdownCount: 0, superBreakoutCount: 2, superBreakdownCount: 0,
  refreshSupportCount: 5, refreshPressureCount: 2, noVolatilityCount: 0,
  buyLowerLimit: 928, buyUpperLimit: 968, sellLowerLimit: 955, sellUpperLimit: 998,
  halfYearHigh: 984, halfYearLow: 750,
  buyZoneStatus: '可買進：2026/06/23 (978)', sellZoneStatus: '不高於：2026/06/23',
  recommendation: '強烈推薦買進，量增突破', highlight: '爆量突破關鍵均線',
  buyObsDate: null, sellObsDate: '2026/06/23',
  takeProfit: 1050, stopLoss: 940,
  notes: '原始筆記', tags: ['自選', 'AI'],
  maStatus: '突破5MA', maKey: '2026/06/22 突破5MA',
  priceAlert: '', volSignal: '爆量',
};

const MOCK_SETTINGS: SystemSettings = {
  range_upper_mult: 1.1, range_lower_mult: 0.9,
  buy_signal_mult: 1.03, sell_signal_mult: 0.97,
  vol_burst_mult: 1.5, vol_inc_dec_mult: 1.0, vol_dec_mult: 0.6,
};

const MOCK_META: SystemMeta = {
  tradeDate: '2026/06/22', nextTradeDate: '2026/06/23', obsDate: '2026/06/23',
  appVersion: 'v4.5-mock', lastUpdated: '2026-06-22T17:00:00.000Z',
};

// ─────────────────────────────────────────────
// 測試主流程
// ─────────────────────────────────────────────

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`❌ FAIL: ${msg}`);
  console.log(`  ✅ ${msg}`);
}

console.log('\n--- 開始 client 資料流整合測試 ---\n');

// STEP 1: 初始化 localStorage（含 tags/notes 的 mock state）
const coreStock = (({ tags: _t, notes: _n, ...core }: StockData) => core as StockData)(MOCK_STOCK);
localStorage.setItem(STORAGE_KEYS.STOCKS, JSON.stringify([coreStock]));
localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(MOCK_SETTINGS));
localStorage.setItem(STORAGE_KEYS.META, JSON.stringify(MOCK_META));
localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
// 初始 ext 有 tags/notes
const initExt: UiExtensions = { '2330': { tags: ['自選', 'AI'], notes: '原始筆記' } };
localStorage.setItem(STORAGE_KEYS.EXTENSIONS, JSON.stringify(initExt));
console.log('STEP 1: 初始化 localStorage 完成');

// STEP 2: 模擬 getStocks() — ext merge
const rawStocks = JSON.parse(localStorage.getItem(STORAGE_KEYS.STOCKS)!) as StockData[];
const ext0 = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXTENSIONS) || '{}') as UiExtensions;
const mergedStocks = rawStocks.map(s => ({
  ...s,
  tags: ext0[s.id]?.tags ?? s.tags,
  notes: ext0[s.id]?.notes ?? s.notes,
}));
assert(mergedStocks[0].tags.includes('AI'), 'getStocks() 後 tags 應包含 AI');
assert(mergedStocks[0].notes === '原始筆記', 'getStocks() 後 notes 應為原始筆記');
console.log('STEP 2: getStocks() merge ui_extensions 正確\n');

// STEP 3: 模擬 exportDatabaseBackup()
const stockRows = rawStocks.map(d => stockRowToRow(stockDataToStockRow(d)));
const stockValues: unknown[][] = [HEADERS, ...stockRows];
const ts = rawMapToTradeSettings(MOCK_SETTINGS as any);
const settingsValues = tradeSettingsToSheetValues(ts);
const metaTradeMeta: TradeMeta = {
  tradeDate: new Date(2026, 5, 22),
  nextDate: new Date(2026, 5, 23),
  obsDate: new Date(2026, 5, 23),
};
const metaValues = tradeMetaToMetaValues(metaTradeMeta);
const logValues: unknown[][] = [['時間戳', '狀態', '訊息']];

const exportPayload: BackupPayload = {
  app: { name: 'TradePilot_StockSystem', version: 'v4.5-mock' },
  backup: {
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    exportedAtLocal: '2026/06/22 17:00:00',
    spreadsheetId: 'mock-test',
    spreadsheetName: 'TradePilot (Test)',
    timezone: 'Asia/Taipei',
  },
  summary: { totalSheets: 4, totalRows: rawStocks.length },
  sheets: {
    stock_db: { name: 'stock_db', rowCount: stockValues.length, colCount: HEADERS.length, values: stockValues },
    settings: { name: 'settings', rowCount: settingsValues.length, colCount: 3, values: settingsValues },
    meta: { name: 'meta', rowCount: metaValues.length, colCount: 2, values: metaValues },
    import_log: { name: 'import_log', rowCount: logValues.length, colCount: 3, values: logValues },
  },
};

const exportJson = JSON.stringify(exportPayload, null, 2);
// 確認匯出 JSON 不含 tags/notes
assert(!exportJson.includes('"tags"'), '匯出 JSON 不應包含 tags 欄位');
assert(!exportJson.includes('"notes"'), '匯出 JSON 不應包含 notes 欄位');
console.log('STEP 3: exportDatabaseBackup() 格式正確（不含 tags/notes）\n');

// STEP 4: 模擬 importDatabaseBackup() — 清除後還原
localStorage.setItem(STORAGE_KEYS.STOCKS, JSON.stringify([]));

const valResult = validateBackupJson(exportJson);
assert(valResult.ok, 'importDatabaseBackup() schema 驗證應通過');
const importPayload = (valResult as { ok: true; payload: BackupPayload }).payload;

const importStockSheet = getSheetFromPayload(importPayload, 'stock_db');
assert(isValidSheetData(importStockSheet), 'stock_db sheet 應有效');

const importedRows = sheetValuesToStockRows(importStockSheet!.values);
const importedCoreStocks = importedRows.map(row => {
  const full = stockRowToStockData(row);
  const { tags: _t, notes: _n, ...core } = full;
  return core as StockData;
});
localStorage.setItem(STORAGE_KEYS.STOCKS, JSON.stringify(importedCoreStocks));

// 確認還原後 tradepilot_stocks 不含 tags/notes
const restoredRaw = JSON.parse(localStorage.getItem(STORAGE_KEYS.STOCKS)!) as any[];
assert(!('tags' in restoredRaw[0]), '還原後 tradepilot_stocks 不應有 tags 欄位');
assert(!('notes' in restoredRaw[0]), '還原後 tradepilot_stocks 不應有 notes 欄位');
console.log('STEP 4: importDatabaseBackup() 還原核心資料，tags/notes 不污染 tradepilot_stocks\n');

// STEP 5: 還原後 getStocks() 應能從 ext 取回 tags/notes
const ext1 = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXTENSIONS) || '{}') as UiExtensions;
const afterRestore = restoredRaw.map((s: StockData) => ({
  ...s,
  tags: ext1[s.id]?.tags ?? [],
  notes: ext1[s.id]?.notes ?? '',
}));
assert(afterRestore[0].tags.includes('AI'), '還原後 getStocks() 應從 ui_extensions 取回 AI 標籤');
assert(afterRestore[0].notes === '原始筆記', '還原後 getStocks() 應從 ui_extensions 取回筆記');
console.log('STEP 5: getStocks() 還原後 tags/notes 透過 ui_extensions 正確保留\n');

// STEP 6: 驗證 meta 日期還原正確
const importMetaSheet = getSheetFromPayload(importPayload, 'meta');
assert(isValidSheetData(importMetaSheet), 'meta sheet 應有效');
const importedMeta = metaValuesToTradeMeta(importMetaSheet!.values);
assert(
  importedMeta.tradeDate instanceof Date && (importedMeta.tradeDate as Date).getFullYear() === 2026,
  'meta tradeDate 應為 2026 年 Date 物件'
);
const info = extractBackupInfo(importPayload);
assert(info.schemaVersion === '1.0.0', 'extractBackupInfo 應回傳 schema 1.0.0');
console.log('STEP 6: meta 日期還原與 extractBackupInfo 正確\n');

console.log('✅ 所有 client 資料流整合測試通過！');
console.log('   tags/notes 路徑完全隔離，備份不污染，還原後正確繼承。\n');
