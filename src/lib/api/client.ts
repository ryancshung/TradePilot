import { StockData, SystemMeta, SystemSettings, ImportLog } from '../types';
import {
  validateBackupJson,
  getSheetFromPayload,
  isValidSheetData,
  extractBackupInfo,
  sheetValuesToStockRows,
  metaValuesToTradeMeta,
  rawMapToTradeSettings,
  tradeSettingsToRawMap,
  tradeSettingsToSheetValues,
  tradeMetaToMetaValues,
  stockRowToRow,
} from '../../../types';
import type { StockRow, TradeMeta, BackupPayload } from '../../../types';
import { INITIAL_STOCKS, INITIAL_SETTINGS, INITIAL_META, INITIAL_LOGS } from './mockData';

export interface ApiClient {
  getStocks(): Promise<StockData[]>;
  getStockById(id: string): Promise<StockData | null>;
  updateStock(id: string, update: Partial<StockData>): Promise<StockData>;
  getSystemMeta(): Promise<SystemMeta>;
  getSettings(): Promise<SystemSettings>;
  updateSettings(settings: SystemSettings): Promise<SystemSettings>;
  getImportLogs(): Promise<ImportLog[]>;
  importCsv(csvContent: string): Promise<{ success: boolean; deletedIds: string[] }>;
  importDatabaseBackup(jsonContent: string): Promise<{ success: boolean; meta: any }>;
  exportDatabaseBackup(): Promise<{ fileName: string; content: string }>;
  resetDatabase(): Promise<void>;
}

const STORAGE_KEYS = {
  STOCKS: 'tradepilot_stocks',
  SETTINGS: 'tradepilot_settings',
  META: 'tradepilot_meta',
  LOGS: 'tradepilot_logs',
  EXTENSIONS: 'tradepilot_ui_extensions',
} as const;

/** tags / notes 每支股票的 UI 擴充欄位，不進備份 */
interface UiExtension {
  tags: string[];
  notes: string;
}
type UiExtensions = Record<string, UiExtension>;

// ─────────────────────────────────────────────
// 日期格式化工具（StockRow ↔ StockData 層）
// ─────────────────────────────────────────────

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

function _parseDate(s: string | null): Date | string | null {
  if (!s) return null;
  const match = s.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
  if (match) {
    return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
  }
  return s;
}

// ─────────────────────────────────────────────
// 轉接層：StockRow ↔ StockData（read-side adapter）
// ─────────────────────────────────────────────

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
  return {
    stock: {
      identity: { id: d.id, name: d.name },
      price: {
        prev: { close: d.prevPrice, high: d.prevHigh, low: d.prevLow },
        curr: { close: d.currPrice, high: d.high, low: d.low },
        delta: d.diff,
        changePct: d.pct,
      },
      volume: {
        prev: { signal: null },
        curr: { signal: null },
      },
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
        buy: {
          lower: d.buyLowerLimit,
          upper: d.buyUpperLimit,
          status: d.buyZoneStatus,
          obsDate: _parseDate(d.buyObsDate),
        },
        sell: {
          lower: d.sellLowerLimit,
          upper: d.sellUpperLimit,
          status: d.sellZoneStatus,
          obsDate: _parseDate(d.sellObsDate),
        },
        recommendation: d.recommendation,
        highlights: d.highlight,
      },
      risk: { takeProfit: d.takeProfit, stopLoss: d.stopLoss },
      alert: { price: d.priceAlert as any, volume: d.volSignal as any },
    },
  };
}

/** mock 端產生 stock_db header row（與 APPcode.gs getDbHeaders() 順序一致） */
function _getDbHeadersMock(): string[] {
  return [
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
}

/** TradeMeta ↔ SystemMeta 轉換 */
function tradeMetaToSystemMeta(tm: TradeMeta, existing: SystemMeta): SystemMeta {
  const fmtDate = (d: Date | string | null | undefined): string => {
    if (!d) return '';
    if (d instanceof Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}/${m}/${day}`;
    }
    return String(d).trim();
  };
  return {
    ...existing,
    tradeDate: fmtDate(tm.tradeDate) || existing.tradeDate,
    nextTradeDate: fmtDate(tm.nextDate) || existing.nextTradeDate,
    obsDate: fmtDate(tm.obsDate) || existing.obsDate,
  };
}

function systemMetaToTradeMeta(m: SystemMeta): TradeMeta {
  const parse = (s: string): Date | string | null => {
    if (!s) return null;
    const match = s.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
    if (match) {
      return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    }
    return s;
  };
  return {
    tradeDate: parse(m.tradeDate),
    nextDate: parse(m.nextTradeDate),
    obsDate: parse(m.obsDate),
  };
}

// ─────────────────────────────────────────────
// MockApiClientImpl
// ─────────────────────────────────────────────

class MockApiClientImpl implements ApiClient {
  private getStorageItem<T>(key: string, defaultValue: T): T {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }

  private setStorageItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async getStocks(): Promise<StockData[]> {
    return this.getStorageItem<StockData[]>(STORAGE_KEYS.STOCKS, INITIAL_STOCKS);
  }

  async getStockById(id: string): Promise<StockData | null> {
    const stocks = await this.getStocks();
    return stocks.find(s => s.id === id) || null;
  }

  async updateStock(id: string, update: Partial<StockData>): Promise<StockData> {
    const stocks = await this.getStocks();
    const idx = stocks.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('找不到該股票資料');

    const updatedStock = { ...stocks[idx], ...update };
    stocks[idx] = updatedStock;
    this.setStorageItem(STORAGE_KEYS.STOCKS, stocks);
    return updatedStock;
  }

  async getSystemMeta(): Promise<SystemMeta> {
    return this.getStorageItem<SystemMeta>(STORAGE_KEYS.META, INITIAL_META);
  }

  async getSettings(): Promise<SystemSettings> {
    return this.getStorageItem<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  async updateSettings(settings: SystemSettings): Promise<SystemSettings> {
    this.setStorageItem(STORAGE_KEYS.SETTINGS, settings);

    // 當系統設定被修改時，同步重新計算各股的買入/賣出上下緣以模擬真實後端邏輯
    const stocks = await this.getStocks();
    const updatedStocks = stocks.map(stock => {
      const lowVal = stock.low || 0;
      const highVal = stock.high || 0;
      return {
        ...stock,
        buyLowerLimit: lowVal * settings.buy_signal_mult,
        buyUpperLimit: lowVal * settings.range_upper_mult,
        sellLowerLimit: highVal * settings.sell_signal_mult,
        sellUpperLimit: highVal * settings.range_lower_mult,
      };
    });
    this.setStorageItem(STORAGE_KEYS.STOCKS, updatedStocks);

    return settings;
  }

  async getImportLogs(): Promise<ImportLog[]> {
    return this.getStorageItem<ImportLog[]>(STORAGE_KEYS.LOGS, INITIAL_LOGS);
  }

  async importCsv(_csvContent: string): Promise<{ success: boolean; deletedIds: string[] }> {
    // 模擬 CSV 匯入邏輯
    try {
      const logs = await this.getImportLogs();
      const meta = await this.getSystemMeta();

      const newLog: ImportLog = {
        timestamp: new Date().toISOString(),
        status: '成功',
        message: 'CSV 同步匯入成功 (Mock：已更新股票價格並重新計算買賣狀態)',
      };

      this.setStorageItem(STORAGE_KEYS.LOGS, [newLog, ...logs]);

      const updatedMeta: SystemMeta = {
        ...meta,
        tradeDate: '2026/06/23',
        nextTradeDate: '2026/06/24',
        obsDate: '2026/06/24',
        lastUpdated: new Date().toISOString(),
      };
      this.setStorageItem(STORAGE_KEYS.META, updatedMeta);

      return { success: true, deletedIds: [] };
    } catch (_e) {
      return { success: false, deletedIds: [] };
    }
  }

  // ── 備份還原：對齊正式 BackupPayload 契約 ──

  async importDatabaseBackup(jsonContent: string): Promise<{ success: boolean; meta: any }> {
    try {
      // 1. Schema 驗證
      const result = validateBackupJson(jsonContent);
      if (!result.ok) {
        throw new Error(result.error);
      }
      const payload: BackupPayload = result.payload;

      // 2. 繼承既有 ui_extensions（tags/notes），不強依賴
      const existingExt = this.getStorageItem<UiExtensions>(STORAGE_KEYS.EXTENSIONS, {});

      // 3. 還原 stock_db → StockData[]
      const stockSheet = getSheetFromPayload(payload, 'stock_db');
      if (isValidSheetData(stockSheet)) {
        const stockRows: StockRow[] = sheetValuesToStockRows(stockSheet.values);
        const stocks: StockData[] = stockRows.map(row =>
          stockRowToStockData(row, existingExt[row.stock.identity.id])
        );
        this.setStorageItem(STORAGE_KEYS.STOCKS, stocks);
      }

      // 4. 還原 settings → SystemSettings
      const settingsSheet = getSheetFromPayload(payload, 'settings');
      if (isValidSheetData(settingsSheet)) {
        // settingsSheet.values 格式：[['參數名稱','數值','說明'], ['range_upper_mult', 1.1, '...'], ...]
        const rawMap: Record<string, unknown> = {};
        settingsSheet.values.slice(1).forEach((row) => {
          const key = String(row[0] ?? '').trim();
          if (key) rawMap[key] = row[1];
        });
        const ts = rawMapToTradeSettings(rawMap as any);
        const settings: SystemSettings = tradeSettingsToRawMap(ts) as unknown as SystemSettings;
        this.setStorageItem(STORAGE_KEYS.SETTINGS, settings);
      }

      // 5. 還原 meta → SystemMeta
      const metaSheet = getSheetFromPayload(payload, 'meta');
      const existingMeta = await this.getSystemMeta();
      if (isValidSheetData(metaSheet)) {
        const tradeMeta: TradeMeta = metaValuesToTradeMeta(metaSheet.values);
        const newMeta = tradeMetaToSystemMeta(tradeMeta, existingMeta);
        this.setStorageItem(STORAGE_KEYS.META, newMeta);
      }

      // 6. 還原 import_log
      const logSheet = getSheetFromPayload(payload, 'import_log');
      if (isValidSheetData(logSheet)) {
        const logs: ImportLog[] = logSheet.values.slice(1).map((row) => ({
          timestamp: String(row[0] ?? ''),
          status: String(row[1] ?? ''),
          message: String(row[2] ?? ''),
        }));
        // 新增這次還原記錄
        const info = extractBackupInfo(payload);
        const newLog: ImportLog = {
          timestamp: new Date().toISOString(),
          status: '成功',
          message: `已從 JSON 還原整個資料庫｜來源系統=${info.sourceAppName}｜來源版本=${info.sourceAppVersion}｜schema=${info.schemaVersion}`,
        };
        this.setStorageItem(STORAGE_KEYS.LOGS, [newLog, ...logs]);
      }

      return {
        success: true,
        meta: extractBackupInfo(payload),
      };
    } catch (e: any) {
      const logs = await this.getImportLogs();
      this.setStorageItem(STORAGE_KEYS.LOGS, [
        {
          timestamp: new Date().toISOString(),
          status: '失敗',
          message: 'JSON 匯入失敗：' + e.toString(),
        },
        ...logs,
      ]);
      throw e;
    }
  }

  // ── 備份匯出：打包成標準 BackupPayload 格式 ──

  async exportDatabaseBackup(): Promise<{ fileName: string; content: string }> {
    const stocks = await this.getStocks();
    const settings = await this.getSettings();
    const meta = await this.getSystemMeta();
    const logs = await this.getImportLogs();

    // stock_db → 二維陣列（含 header）
    const headers = _getDbHeadersMock();
    const stockRows = stocks.map(d => stockRowToRow(stockDataToStockRow(d)));
    const stockValues: unknown[][] = [headers, ...stockRows];

    // settings → 二維陣列
    const ts = rawMapToTradeSettings(settings as any);
    const settingsValues = tradeSettingsToSheetValues(ts);

    // meta → 二維陣列
    const tradeMeta = systemMetaToTradeMeta(meta);
    const metaValues = tradeMetaToMetaValues(tradeMeta);

    // import_log → 二維陣列
    const logValues: unknown[][] = [
      ['時間戳', '狀態', '訊息'],
      ...logs.map(l => [l.timestamp, l.status, l.message]),
    ];

    const now = new Date();
    const payload: BackupPayload = {
      app: {
        name: 'TradePilot_StockSystem',
        version: meta.appVersion || 'v4.5-json-1.2-final-spec+price-vol',
      },
      backup: {
        schemaVersion: '1.0.0',
        exportedAt: now.toISOString(),
        exportedAtLocal: now.toLocaleString(),
        spreadsheetId: 'mock-frontend-export',
        spreadsheetName: 'TradePilot (Mock)',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      summary: {
        totalSheets: 4,
        totalRows: stocks.length + settingsValues.length - 1 + 1 + logs.length,
      },
      sheets: {
        stock_db: {
          name: 'stock_db',
          rowCount: stockValues.length,
          colCount: headers.length,
          values: stockValues,
        },
        settings: {
          name: 'settings',
          rowCount: settingsValues.length,
          colCount: 3,
          values: settingsValues,
        },
        meta: {
          name: 'meta',
          rowCount: metaValues.length,
          colCount: 2,
          values: metaValues,
        },
        import_log: {
          name: 'import_log',
          rowCount: logValues.length,
          colCount: 3,
          values: logValues,
        },
      },
    };

    const ts2 = now.toISOString().replace(/[^\w.-]/g, '_');
    const fileName = `TradePilot_StockSystem_v4.5_${ts2}.json`;
    return {
      fileName,
      content: JSON.stringify(payload, null, 2),
    };
  }

  async resetDatabase(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.STOCKS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.META);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    // ui_extensions 保留，不清除 tags/notes
  }
}

export const api = new MockApiClientImpl();
