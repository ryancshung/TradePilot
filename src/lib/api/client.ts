import { StockDetail, StockListItem, MetaInfo, AppSettings, ImportLog } from './types';
import { StorageAdapter, BrowserStorageAdapter } from './adapters';
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
  getStocks(): Promise<StockListItem[]>;
  getStockById(id: string): Promise<StockDetail | null>;
  updateStock(id: string, update: Partial<StockDetail>): Promise<StockDetail>;
  getSystemMeta(): Promise<MetaInfo>;
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: AppSettings): Promise<AppSettings>;
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

interface UiExtension {
  tags: string[];
  notes: string;
}
type UiExtensions = Record<string, UiExtension>;

// ─────────────────────────────────────────────
// 日期格式化工具
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
// 轉接層：扁平 StockData (raw shape) ↔ 新 Domain Model
// ─────────────────────────────────────────────
function toStockDetail(flat: any, ext?: UiExtension): StockDetail {
  const tags = ext?.tags ?? flat.tags ?? [];
  const notes = ext?.notes ?? flat.notes ?? '';
  return {
    id: flat.id,
    name: flat.name,
    tags,
    volSignal: flat.volSignal ?? '',
    priceAlert: flat.priceAlert ?? '',
    notes,
    takeProfit: flat.takeProfit ?? null,
    stopLoss: flat.stopLoss ?? null,
    price: {
      currPrice: flat.currPrice ?? null,
      prevPrice: flat.prevPrice ?? null,
      diff: flat.diff ?? null,
      pct: flat.pct ?? null,
      high: flat.high ?? null,
      low: flat.low ?? null,
      prevHigh: flat.prevHigh ?? null,
      prevLow: flat.prevLow ?? null,
      halfYearHigh: flat.halfYearHigh ?? null,
      halfYearLow: flat.halfYearLow ?? null,
      marketCap: flat.marketCap ?? null,
    },
    ma: {
      ma5: flat.ma5 ?? null,
      ma10: flat.ma10 ?? null,
      ma20: flat.ma20 ?? null,
      ma60: flat.ma60 ?? null,
      prevMa5: flat.prevMa5 ?? null,
      prevMa10: flat.prevMa10 ?? null,
      prevMa20: flat.prevMa20 ?? null,
      prevMa60: flat.prevMa60 ?? null,
      status: flat.maStatus ?? '',
      keyEvents: flat.maKey ?? '',
    },
    zone: {
      buyLowerLimit: flat.buyLowerLimit ?? null,
      buyUpperLimit: flat.buyUpperLimit ?? null,
      sellLowerLimit: flat.sellLowerLimit ?? null,
      sellUpperLimit: flat.sellUpperLimit ?? null,
      buyZoneStatus: flat.buyZoneStatus ?? '',
      sellZoneStatus: flat.sellZoneStatus ?? '',
      recommendation: flat.recommendation ?? '',
      highlight: flat.highlight ?? '',
      buyObsDate: flat.buyObsDate ?? null,
      sellObsDate: flat.sellObsDate ?? null,
      breakoutCount: flat.breakoutCount ?? 0,
      breakdownCount: flat.breakdownCount ?? 0,
      superBreakoutCount: flat.superBreakoutCount ?? 0,
      superBreakdownCount: flat.superBreakdownCount ?? 0,
      refreshSupportCount: flat.refreshSupportCount ?? 0,
      refreshPressureCount: flat.refreshPressureCount ?? 0,
      noVolatilityCount: flat.noVolatilityCount ?? 0,
    },
    supports: {
      levels: flat.supports ?? [],
      refreshCount: flat.refreshSupportCount ?? 0,
    },
    pressures: {
      levels: flat.pressures ?? [],
      refreshCount: flat.refreshPressureCount ?? 0,
    }
  };
}

function toFlatStock(detail: StockDetail): any {
  return {
    id: detail.id,
    name: detail.name,
    currPrice: detail.price.currPrice,
    prevPrice: detail.price.prevPrice,
    diff: detail.price.diff,
    pct: detail.price.pct,
    high: detail.price.high,
    low: detail.price.low,
    volBurst: detail.volSignal === '爆量',
    ma5: detail.ma.ma5,
    ma10: detail.ma.ma10,
    ma20: detail.ma.ma20,
    ma60: detail.ma.ma60,
    marketCap: detail.price.marketCap,
    prevHigh: detail.price.prevHigh,
    prevLow: detail.price.prevLow,
    prevMa5: detail.ma.prevMa5,
    prevMa10: detail.ma.prevMa10,
    prevMa20: detail.ma.prevMa20,
    prevMa60: detail.ma.prevMa60,
    supports: detail.supports.levels,
    pressures: detail.pressures.levels,
    breakoutCount: detail.zone.breakoutCount,
    breakdownCount: detail.zone.breakdownCount,
    superBreakoutCount: detail.zone.superBreakoutCount,
    superBreakdownCount: detail.zone.superBreakdownCount,
    refreshSupportCount: detail.supports.refreshCount,
    refreshPressureCount: detail.pressures.refreshCount,
    noVolatilityCount: detail.zone.noVolatilityCount,
    buyLowerLimit: detail.zone.buyLowerLimit,
    buyUpperLimit: detail.zone.buyUpperLimit,
    sellLowerLimit: detail.zone.sellLowerLimit,
    sellUpperLimit: detail.zone.sellUpperLimit,
    halfYearHigh: detail.price.halfYearHigh,
    halfYearLow: detail.price.halfYearLow,
    buyZoneStatus: detail.zone.buyZoneStatus,
    sellZoneStatus: detail.zone.sellZoneStatus,
    recommendation: detail.zone.recommendation,
    highlight: detail.zone.highlight,
    buyObsDate: detail.zone.buyObsDate,
    sellObsDate: detail.zone.sellObsDate,
    takeProfit: detail.takeProfit,
    stopLoss: detail.stopLoss,
    notes: detail.notes,
    tags: detail.tags,
    maStatus: detail.ma.status,
    maKey: detail.ma.keyEvents,
    priceAlert: detail.priceAlert,
    volSignal: detail.volSignal,
  };
}

// ─────────────────────────────────────────────
// 轉接層：SystemSettings (raw) ↔ AppSettings
// ─────────────────────────────────────────────
function toAppSettings(raw: any): AppSettings {
  return {
    rangeUpperMult: raw.range_upper_mult ?? 1.1,
    rangeLowerMult: raw.range_lower_mult ?? 0.9,
    buySignalMult: raw.buy_signal_mult ?? 1.03,
    sellSignalMult: raw.sell_signal_mult ?? 0.97,
    volBurstMult: raw.vol_burst_mult ?? 1.5,
    volIncDecMult: raw.vol_inc_dec_mult ?? 1.0,
    volDecMult: raw.vol_dec_mult ?? 0.6,
  };
}

function toSystemSettings(settings: AppSettings): any {
  return {
    range_upper_mult: settings.rangeUpperMult,
    range_lower_mult: settings.rangeLowerMult,
    buy_signal_mult: settings.buySignalMult,
    sell_signal_mult: settings.sellSignalMult,
    vol_burst_mult: settings.volBurstMult,
    vol_inc_dec_mult: settings.volIncDecMult,
    vol_dec_mult: settings.volDecMult,
  };
}

// ─────────────────────────────────────────────
// 轉接層：SystemMeta (raw) ↔ MetaInfo
// ─────────────────────────────────────────────
function toMetaInfo(raw: any): MetaInfo {
  return {
    tradeDate: raw.tradeDate ?? '',
    nextTradeDate: raw.nextTradeDate ?? '',
    obsDate: raw.obsDate ?? '',
    appVersion: raw.appVersion ?? 'v4.5-mock',
    lastUpdated: raw.lastUpdated ?? '',
  };
}

export function toSystemMeta(meta: MetaInfo): any {
  return {
    tradeDate: meta.tradeDate,
    nextTradeDate: meta.nextTradeDate,
    obsDate: meta.obsDate,
    appVersion: meta.appVersion,
    lastUpdated: meta.lastUpdated,
  };
}

// ─────────────────────────────────────────────
// 轉接層：StockRow ↔ 扁平 StockData (用於備份解析)
// ─────────────────────────────────────────────
function stockRowToFlatData(row: StockRow): any {
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
    notes: '',
    tags: [],
    maStatus: s.ma.status,
    maKey: s.ma.keyEvents,
    priceAlert: z.alert.price,
    volSignal: z.alert.volume,
  };
}

function flatDataToStockRow(d: any): StockRow {
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

// ─────────────────────────────────────────────
// MockApiClient 實作
// ─────────────────────────────────────────────
export class MockApiClient implements ApiClient {
  constructor(private storage: StorageAdapter) {}

  async getStocks(): Promise<StockListItem[]> {
    const rawStocks = await this.storage.getItem<any[]>(STORAGE_KEYS.STOCKS, INITIAL_STOCKS);
    const ext = await this.storage.getItem<UiExtensions>(STORAGE_KEYS.EXTENSIONS, {});
    return rawStocks.map(s => {
      const details = toStockDetail(s, ext[s.id]);
      const { notes: _n, takeProfit: _t, stopLoss: _s, supports: _su, pressures: _pr, ...item } = details;
      return item as StockListItem;
    });
  }

  async getStockById(id: string): Promise<StockDetail | null> {
    const rawStocks = await this.storage.getItem<any[]>(STORAGE_KEYS.STOCKS, INITIAL_STOCKS);
    const flat = rawStocks.find(s => s.id === id);
    if (!flat) return null;

    const ext = await this.storage.getItem<UiExtensions>(STORAGE_KEYS.EXTENSIONS, {});
    return toStockDetail(flat, ext[id]);
  }

  async updateStock(id: string, update: Partial<StockDetail>): Promise<StockDetail> {
    const rawStocks = await this.storage.getItem<any[]>(STORAGE_KEYS.STOCKS, INITIAL_STOCKS);
    const idx = rawStocks.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('找不到該股票資料');

    const rawStock = rawStocks[idx];
    if ('takeProfit' in update) rawStock.takeProfit = update.takeProfit;
    if ('stopLoss' in update) rawStock.stopLoss = update.stopLoss;
    if ('notes' in update) rawStock.notes = update.notes;
    if ('tags' in update) rawStock.tags = update.tags;

    await this.storage.setItem(STORAGE_KEYS.STOCKS, rawStocks);

    if ('tags' in update || 'notes' in update) {
      const ext = await this.storage.getItem<UiExtensions>(STORAGE_KEYS.EXTENSIONS, {});
      const originalExt = ext[id] || { tags: [], notes: '' };
      ext[id] = {
        tags: update.tags ?? originalExt.tags,
        notes: update.notes ?? originalExt.notes,
      };
      await this.storage.setItem(STORAGE_KEYS.EXTENSIONS, ext);
    }

    const detail = await this.getStockById(id);
    if (!detail) throw new Error('讀取更新後的個股失敗');
    return detail;
  }

  async getSystemMeta(): Promise<MetaInfo> {
    const raw = await this.storage.getItem<any>(STORAGE_KEYS.META, INITIAL_META);
    return toMetaInfo(raw);
  }

  async getSettings(): Promise<AppSettings> {
    const raw = await this.storage.getItem<any>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    return toAppSettings(raw);
  }

  async updateSettings(settings: AppSettings): Promise<AppSettings> {
    const raw = toSystemSettings(settings);
    await this.storage.setItem(STORAGE_KEYS.SETTINGS, raw);

    const rawStocks = await this.storage.getItem<any[]>(STORAGE_KEYS.STOCKS, INITIAL_STOCKS);
    const updatedStocks = rawStocks.map(stock => {
      const lowVal = stock.low || 0;
      const highVal = stock.high || 0;
      return {
        ...stock,
        buyLowerLimit: lowVal * settings.buySignalMult,
        buyUpperLimit: lowVal * settings.rangeUpperMult,
        sellLowerLimit: highVal * settings.sellSignalMult,
        sellUpperLimit: highVal * settings.rangeLowerMult,
      };
    });
    await this.storage.setItem(STORAGE_KEYS.STOCKS, updatedStocks);

    return settings;
  }

  async getImportLogs(): Promise<ImportLog[]> {
    return this.storage.getItem<ImportLog[]>(STORAGE_KEYS.LOGS, INITIAL_LOGS);
  }

  async importCsv(csvContent: string): Promise<{ success: boolean; deletedIds: string[] }> {
    try {
      const logs = await this.getImportLogs();
      const sizeKB = (new TextEncoder().encode(csvContent).byteLength / 1024).toFixed(1);
      const newLog: ImportLog = {
        timestamp: new Date().toISOString(),
        status: '待處理',
        message: `前端已接收 CSV（${sizeKB} KB）。實際欄位解析與資料更新需至 Google Sheets 執行 Apps Script「手動匯入 CSV」。`,
      };
      await this.storage.setItem(STORAGE_KEYS.LOGS, [newLog, ...logs]);
      return { success: true, deletedIds: [] };
    } catch (_e) {
      return { success: false, deletedIds: [] };
    }
  }

  async importDatabaseBackup(jsonContent: string): Promise<{ success: boolean; meta: any }> {
    try {
      const result = validateBackupJson(jsonContent);
      if (!result.ok) {
        throw new Error(result.error);
      }
      const payload: BackupPayload = result.payload;

      const stockSheet = getSheetFromPayload(payload, 'stock_db');
      if (isValidSheetData(stockSheet)) {
        const stockRows: StockRow[] = sheetValuesToStockRows(stockSheet.values);
        const coreStocks = stockRows.map(row => {
          const flat = stockRowToFlatData(row);
          const { tags: _t, notes: _n, ...core } = flat;
          return core;
        });
        await this.storage.setItem(STORAGE_KEYS.STOCKS, coreStocks);
      }

      const settingsSheet = getSheetFromPayload(payload, 'settings');
      if (isValidSheetData(settingsSheet)) {
        const rawMap: Record<string, unknown> = {};
        settingsSheet.values.slice(1).forEach((row) => {
          const key = String(row[0] ?? '').trim();
          if (key) rawMap[key] = row[1];
        });
        const ts = rawMapToTradeSettings(rawMap as any);
        const systemSettings = tradeSettingsToRawMap(ts);
        await this.storage.setItem(STORAGE_KEYS.SETTINGS, systemSettings);
      }

      const metaSheet = getSheetFromPayload(payload, 'meta');
      const existingMeta = await this.storage.getItem<any>(STORAGE_KEYS.META, INITIAL_META);
      if (isValidSheetData(metaSheet)) {
        const tradeMeta: TradeMeta = metaValuesToTradeMeta(metaSheet.values);
        
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

        const newMeta = {
          ...existingMeta,
          tradeDate: fmtDate(tradeMeta.tradeDate) || existingMeta.tradeDate,
          nextTradeDate: fmtDate(tradeMeta.nextDate) || existingMeta.nextTradeDate,
          obsDate: fmtDate(tradeMeta.obsDate) || existingMeta.obsDate,
        };
        await this.storage.setItem(STORAGE_KEYS.META, newMeta);
      }

      const logSheet = getSheetFromPayload(payload, 'import_log');
      if (isValidSheetData(logSheet)) {
        const logs: ImportLog[] = logSheet.values.slice(1).map((row) => ({
          timestamp: String(row[0] ?? ''),
          status: String(row[1] ?? ''),
          message: String(row[2] ?? ''),
        }));
        const info = extractBackupInfo(payload);
        const newLog: ImportLog = {
          timestamp: new Date().toISOString(),
          status: '成功',
          message: `已從 JSON 還原整個資料庫｜來源系統=${info.sourceAppName}｜來源版本=${info.sourceAppVersion}｜schema=${info.schemaVersion}`,
        };
        await this.storage.setItem(STORAGE_KEYS.LOGS, [newLog, ...logs]);
      }

      return {
        success: true,
        meta: extractBackupInfo(payload),
      };
    } catch (e: any) {
      const logs = await this.getImportLogs();
      const errorLog: ImportLog = {
        timestamp: new Date().toISOString(),
        status: '失敗',
        message: 'JSON 匯入失敗：' + e.toString(),
      };
      await this.storage.setItem(STORAGE_KEYS.LOGS, [errorLog, ...logs]);
      throw e;
    }
  }

  async exportDatabaseBackup(): Promise<{ fileName: string; content: string }> {
    const list = await this.getStocks();
    const stocks: StockDetail[] = [];
    for (const item of list) {
      const d = await this.getStockById(item.id);
      if (d) stocks.push(d);
    }

    const settings = await this.getSettings();
    const meta = await this.getSystemMeta();
    const logs = await this.getImportLogs();

    const headers = _getDbHeadersMock();
    const stockRows = stocks.map(d => stockRowToRow(flatDataToStockRow(toFlatStock(d))));
    const stockValues: unknown[][] = [headers, ...stockRows];

    const ts = rawMapToTradeSettings(toSystemSettings(settings));
    const settingsValues = tradeSettingsToSheetValues(ts);

    const parse = (s: string): Date | string | null => {
      if (!s) return null;
      const match = s.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
      if (match) {
        return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
      }
      return s;
    };
    const tradeMeta: TradeMeta = {
      tradeDate: parse(meta.tradeDate),
      nextDate: parse(meta.nextTradeDate),
      obsDate: parse(meta.obsDate),
    };
    const metaValues = tradeMetaToMetaValues(tradeMeta);

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
    await this.storage.removeItem(STORAGE_KEYS.STOCKS);
    await this.storage.removeItem(STORAGE_KEYS.SETTINGS);
    await this.storage.removeItem(STORAGE_KEYS.META);
    await this.storage.removeItem(STORAGE_KEYS.LOGS);
  }
}

// ─────────────────────────────────────────────
// HttpApiClient 實作 (對接 GAS Web App API)
// ─────────────────────────────────────────────
export class HttpApiClient implements ApiClient {
  constructor(public baseUrl: string) {}

  private async fetchGas<T>(action: string): Promise<T> {
    const url = `${this.baseUrl}${this.baseUrl.includes('?') ? '&' : '?'}action=${action}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json() as T;
    } catch (e: any) {
      console.error(`Fetch GAS action=${action} failed:`, e);
      throw new Error(`連線至 Google Sheets API 失敗: ${e.message}`);
    }
  }

  async getStocks(): Promise<StockListItem[]> {
    const data = await this.fetchGas<{ values: unknown[][] }>('getStocks');
    if (!data || !data.values || data.values.length === 0) {
      return [];
    }

    const stockRows: StockRow[] = sheetValuesToStockRows(data.values);
    const storage = new BrowserStorageAdapter();
    const ext = await storage.getItem<UiExtensions>(STORAGE_KEYS.EXTENSIONS, {});

    return stockRows.map(row => {
      const flat = stockRowToFlatData(row);
      const details = toStockDetail(flat, ext[flat.id]);
      const { notes: _n, takeProfit: _t, stopLoss: _s, supports: _su, pressures: _pr, ...item } = details;
      return item as StockListItem;
    });
  }

  async getStockById(id: string): Promise<StockDetail | null> {
    const data = await this.fetchGas<{ values: unknown[][] }>('getStocks');
    if (!data || !data.values || data.values.length === 0) {
      return null;
    }

    const stockRows: StockRow[] = sheetValuesToStockRows(data.values);
    const matchedRow = stockRows.find(row => row.stock.identity.id === id);
    if (!matchedRow) return null;

    const storage = new BrowserStorageAdapter();
    const ext = await storage.getItem<UiExtensions>(STORAGE_KEYS.EXTENSIONS, {});
    const flat = stockRowToFlatData(matchedRow);
    return toStockDetail(flat, ext[flat.id]);
  }

  async getSystemMeta(): Promise<MetaInfo> {
    const data = await this.fetchGas<{ values: unknown[][] }>('getMeta');
    if (!data || !data.values || data.values.length === 0) {
      throw new Error('無法取得系統中繼資料');
    }
    const tradeMeta: TradeMeta = metaValuesToTradeMeta(data.values);
    const mockMeta = {
      tradeDate: _fmtDate(tradeMeta.tradeDate) || '',
      nextTradeDate: _fmtDate(tradeMeta.nextDate) || '',
      obsDate: _fmtDate(tradeMeta.obsDate) || '',
      appVersion: 'v4.5-gas-api',
      lastUpdated: new Date().toISOString()
    };
    return toMetaInfo(mockMeta);
  }

  async getSettings(): Promise<AppSettings> {
    const data = await this.fetchGas<{ values: unknown[][] }>('getSettings');
    if (!data || !data.values || data.values.length === 0) {
      throw new Error('無法取得系統參數設定');
    }
    const rawMap: Record<string, unknown> = {};
    data.values.slice(1).forEach((row) => {
      const key = String(row[0] ?? '').trim();
      if (key) rawMap[key] = row[1];
    });
    const ts = rawMapToTradeSettings(rawMap as any);
    const systemSettings = tradeSettingsToRawMap(ts);
    return toAppSettings(systemSettings);
  }

  async getImportLogs(): Promise<ImportLog[]> {
    const data = await this.fetchGas<{ values: unknown[][] }>('getImportLogs');
    if (!data || !data.values || data.values.length === 0) {
      return [];
    }
    return data.values.slice(1).map((row) => ({
      timestamp: String(row[0] ?? ''),
      status: String(row[1] ?? ''),
      message: String(row[2] ?? ''),
    }));
  }

  async updateStock(id: string, update: Partial<StockDetail>): Promise<StockDetail> {
    // 唯讀 API 階段下，將 tags / notes 暫存於本地 extension，但 takeProfit, stopLoss 僅提供前端假更新
    if ('tags' in update || 'notes' in update || 'takeProfit' in update || 'stopLoss' in update) {
      const storage = new BrowserStorageAdapter();
      const ext = await storage.getItem<UiExtensions>(STORAGE_KEYS.EXTENSIONS, {});
      const originalExt = ext[id] || { tags: [], notes: '' };
      ext[id] = {
        tags: update.tags ?? originalExt.tags,
        notes: update.notes ?? originalExt.notes,
      };
      await storage.setItem(STORAGE_KEYS.EXTENSIONS, ext);
    }
    
    const detail = await this.getStockById(id);
    if (!detail) throw new Error('讀取個股資料失敗');
    return {
      ...detail,
      ...update
    };
  }

  async updateSettings(_settings: AppSettings): Promise<AppSettings> {
    throw new Error('目前 API 模式為唯讀。若要更新參數，請回到 Mock 模式或至 Google Sheets 試算表中修改。');
  }

  async importDatabaseBackup(_jsonContent: string): Promise<{ success: boolean; meta: any }> {
    throw new Error('API 模式下不支援直接還原 JSON。請先在設定中切換回 Mock 模式再執行。');
  }

  async exportDatabaseBackup(): Promise<{ fileName: string; content: string }> {
    throw new Error('API 模式下不支援直接匯出 JSON。請先在設定中切換回 Mock 模式再執行。');
  }

  async resetDatabase(): Promise<void> {
    const storage = new BrowserStorageAdapter();
    await storage.removeItem(STORAGE_KEYS.EXTENSIONS);
  }

  async importCsv(_csvContent: string): Promise<{ success: boolean; deletedIds: string[] }> {
    throw new Error('API 模式下不支援前端直接匯入 CSV。請於 Google Sheets 端執行「手動匯入 CSV」。');
  }
}

// ─────────────────────────────────────────────
// API Provider 偵測與實體化
// ─────────────────────────────────────────────
function getActiveApiClient(): ApiClient {
  const provider = localStorage.getItem('tradepilot_api_provider');
  const apiUrl = localStorage.getItem('tradepilot_api_url');

  if (provider === 'http' && apiUrl) {
    return new HttpApiClient(apiUrl.trim());
  }

  return new MockApiClient(new BrowserStorageAdapter());
}

export const api = getActiveApiClient();
