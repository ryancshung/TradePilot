/**
 * TradePilot — Row-to-Domain Mapping Layer (v1)
 *
 * 把 stock_db 工作表的原始 row（any[]）、
 * meta 工作表的 values、settings 的 RawSettingsMap
 * 映射到 Domain Model。
 *
 * 不包含任何商業邏輯，只做資料結構轉換與型別清洗。
 */

import type {
  Stock,
  StockRow,
  ZoneState,
  TradeMeta,
  TradeSettings,
  RawSettingsMap,
  Price,
  PriceAlertText,
  VolumeAlertText,
  BuyStatus,
  SellStatus,
} from './domain';

// ─────────────────────────────────────────────
// stock_db 欄位 Index 常數
// 與 APPcode.gs getDbHeaders() 一對一對應
// ─────────────────────────────────────────────

/** stock_db 所有欄位的 index，依 getDbHeaders() 順序 */
export const DB_COL = {
  // Identity
  NAME: 0,
  ID: 1,

  // 前-* (BLOCK_SIZE = 9, offset 0~8)
  PREV_CLOSE: 2,
  PREV_HIGH: 3,
  PREV_LOW: 4,
  PREV_VOL: 5,
  PREV_MA5: 6,
  PREV_MA10: 7,
  PREV_MA20: 8,
  PREV_MA60: 9,
  PREV_MCAP: 10,

  // 現-* (BLOCK_SIZE = 9, offset 0~8)
  CURR_CLOSE: 11,
  CURR_HIGH: 12,
  CURR_LOW: 13,
  CURR_VOL: 14,
  CURR_MA5: 15,
  CURR_MA10: 16,
  CURR_MA20: 17,
  CURR_MA60: 18,
  CURR_MCAP: 19,

  // 計算欄位（公式）
  DELTA: 20,
  CHANGE_PCT: 21,

  // 支撐 1~10
  SUPPORT_1: 22,
  SUPPORT_10: 31,

  // 壓力 1~10
  RESIST_1: 32,
  RESIST_10: 41,

  // 計數器
  BREAKOUT_COUNT: 42,
  BREAKDOWN_COUNT: 43,
  SUPER_BREAKOUT_COUNT: 44,
  SUPER_BREAKDOWN_COUNT: 45,
  SUPPORT_REFRESH_COUNT: 46,
  RESIST_REFRESH_COUNT: 47,
  FLAT_COUNT: 48,

  // 買賣區間邊界
  BUY_LOWER: 49,
  BUY_UPPER: 50,
  SELL_LOWER: 51,
  SELL_UPPER: 52,

  // 高低點
  RANGE_HIGH: 53,
  RANGE_LOW: 54,
  HISTORY_HIGH6M: 55,
  HISTORY_LOW6M: 56,

  // 區間狀態
  BUY_STATUS: 57,
  SELL_STATUS: 58,
  RECOMMENDATION: 59,
  HIGHLIGHTS: 60,

  // 觀察日期
  BUY_OBS_DATE: 61,
  SELL_OBS_DATE: 62,

  // 風控
  TAKE_PROFIT: 63,
  STOP_LOSS: 64,

  // 均線狀況
  MA_STATUS: 65,
  MA_KEY_EVENTS: 66,

  // 乖離率（現價）
  BIAS_CURR_MA5: 67,
  BIAS_CURR_MA10: 68,
  BIAS_CURR_MA20: 69,
  BIAS_CURR_MA60: 70,

  // 乖離率（前價）
  BIAS_PREV_MA5: 71,
  BIAS_PREV_MA10: 72,
  BIAS_PREV_MA20: 73,
  BIAS_PREV_MA60: 74,

  // 通知
  PRICE_ALERT: 75,
  VOL_SIGNAL: 76,
} as const;

export type DbColKey = keyof typeof DB_COL;

/** 支撐/壓力各 10 欄的 index 範圍（inclusive） */
export const SUPPORT_INDICES: readonly number[] = Array.from(
  { length: 10 },
  (_, k) => DB_COL.SUPPORT_1 + k
);
export const RESIST_INDICES: readonly number[] = Array.from(
  { length: 10 },
  (_, k) => DB_COL.RESIST_1 + k
);

// ─────────────────────────────────────────────
// 基本型別轉換工具（對應 Core.gs 的 _toNum / _toNumOrZero）
// ─────────────────────────────────────────────

function _toPrice(v: unknown): Price {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/[^0-9.\-]/g, '');
  if (s === '') return null;
  const n = Number(s);
  return isNaN(n) || !isFinite(n) ? null : n;
}

function _toCount(v: unknown): number {
  const n = _toPrice(v);
  return n === null ? 0 : Math.round(n);
}

function _toString(v: unknown): string {
  return String(v ?? '').trim();
}

function _toDateOrString(v: unknown): Date | string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  if (s === '') return null;

  // 匹配 yyyy/MM/dd 或 yyyy-MM-dd，精確拆解年月日
  const match = s.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 匹配 ISO 8601
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  return s;
}

// ─────────────────────────────────────────────
// stock_db row → Stock
// ─────────────────────────────────────────────

/**
 * 將 stock_db 工作表的單行原始資料（any[]）轉換為 Stock domain model。
 * 注意：delta / changePct 是公式欄位，從試算表讀回來的是計算結果（數字）。
 */
export function rowToStock(row: unknown[]): Stock {
  const col = DB_COL;

  return {
    identity: {
      name: _toString(row[col.NAME]),
      // 移除前置 ' 符號（GAS 用來防止自動轉數字）
      id: _toString(row[col.ID]).replace(/^'/, ''),
    },

    price: {
      prev: {
        close: _toPrice(row[col.PREV_CLOSE]),
        high: _toPrice(row[col.PREV_HIGH]),
        low: _toPrice(row[col.PREV_LOW]),
      },
      curr: {
        close: _toPrice(row[col.CURR_CLOSE]),
        high: _toPrice(row[col.CURR_HIGH]),
        low: _toPrice(row[col.CURR_LOW]),
      },
      delta: _toPrice(row[col.DELTA]),
      changePct: _toPrice(row[col.CHANGE_PCT]),
    },

    volume: {
      prev: { signal: _toPrice(row[col.PREV_VOL]) },
      curr: { signal: _toPrice(row[col.CURR_VOL]) },
    },

    marketCap: {
      prev: _toPrice(row[col.PREV_MCAP]),
      curr: _toPrice(row[col.CURR_MCAP]),
    },

    ma: {
      prev: {
        ma5: _toPrice(row[col.PREV_MA5]),
        ma10: _toPrice(row[col.PREV_MA10]),
        ma20: _toPrice(row[col.PREV_MA20]),
        ma60: _toPrice(row[col.PREV_MA60]),
      },
      curr: {
        ma5: _toPrice(row[col.CURR_MA5]),
        ma10: _toPrice(row[col.CURR_MA10]),
        ma20: _toPrice(row[col.CURR_MA20]),
        ma60: _toPrice(row[col.CURR_MA60]),
      },
      status: _toString(row[col.MA_STATUS]),
      keyEvents: _toString(row[col.MA_KEY_EVENTS]),
    },

    bias: {
      curr: {
        bias5: _toPrice(row[col.BIAS_CURR_MA5]),
        bias10: _toPrice(row[col.BIAS_CURR_MA10]),
        bias20: _toPrice(row[col.BIAS_CURR_MA20]),
        bias60: _toPrice(row[col.BIAS_CURR_MA60]),
      },
      prev: {
        bias5: _toPrice(row[col.BIAS_PREV_MA5]),
        bias10: _toPrice(row[col.BIAS_PREV_MA10]),
        bias20: _toPrice(row[col.BIAS_PREV_MA20]),
        bias60: _toPrice(row[col.BIAS_PREV_MA60]),
      },
    },
  };
}

// ─────────────────────────────────────────────
// stock_db row → ZoneState
// ─────────────────────────────────────────────

/**
 * 將 stock_db 工作表的單行原始資料轉換為 ZoneState domain model。
 */
export function rowToZoneState(row: unknown[]): ZoneState {
  const col = DB_COL;

  const supportLevels = SUPPORT_INDICES.map((idx) => _toPrice(row[idx]));
  const resistLevels = RESIST_INDICES.map((idx) => _toPrice(row[idx]));

  return {
    support: {
      levels: supportLevels,
      refreshCount: _toCount(row[col.SUPPORT_REFRESH_COUNT]),
    },
    resistance: {
      levels: resistLevels,
      refreshCount: _toCount(row[col.RESIST_REFRESH_COUNT]),
    },
    breakout: {
      count: _toCount(row[col.BREAKOUT_COUNT]),
      superCount: _toCount(row[col.SUPER_BREAKOUT_COUNT]),
    },
    breakdown: {
      count: _toCount(row[col.BREAKDOWN_COUNT]),
      superCount: _toCount(row[col.SUPER_BREAKDOWN_COUNT]),
    },
    volatility: {
      flatCount: _toCount(row[col.FLAT_COUNT]),
    },
    range: {
      high: _toPrice(row[col.RANGE_HIGH]),
      low: _toPrice(row[col.RANGE_LOW]),
    },
    history: {
      high6m: _toPrice(row[col.HISTORY_HIGH6M]),
      low6m: _toPrice(row[col.HISTORY_LOW6M]),
    },
    zone: {
      buy: {
        lower: _toPrice(row[col.BUY_LOWER]),
        upper: _toPrice(row[col.BUY_UPPER]),
        status: _toString(row[col.BUY_STATUS]) as BuyStatus,
        obsDate: _toDateOrString(row[col.BUY_OBS_DATE]),
      },
      sell: {
        lower: _toPrice(row[col.SELL_LOWER]),
        upper: _toPrice(row[col.SELL_UPPER]),
        status: _toString(row[col.SELL_STATUS]) as SellStatus,
        obsDate: _toDateOrString(row[col.SELL_OBS_DATE]),
      },
      recommendation: _toString(row[col.RECOMMENDATION]),
      highlights: _toString(row[col.HIGHLIGHTS]),
    },
    risk: {
      takeProfit: _toPrice(row[col.TAKE_PROFIT]),
      stopLoss: _toPrice(row[col.STOP_LOSS]),
    },
    alert: {
      price: _toString(row[col.PRICE_ALERT]) as PriceAlertText,
      volume: _toString(row[col.VOL_SIGNAL]) as VolumeAlertText,
    },
  };
}

// ─────────────────────────────────────────────
// stock_db row → StockRow (組合)
// ─────────────────────────────────────────────

export function rowToStockRow(row: unknown[]): StockRow {
  return {
    stock: rowToStock(row),
    zone: rowToZoneState(row),
  };
}

/**
 * 將整個 stock_db 的 getValues() 結果（含 header row）映射為 StockRow[]。
 * 第一行為 header，自動跳過。
 */
export function sheetValuesToStockRows(values: unknown[][]): StockRow[] {
  if (!values || values.length < 2) return [];
  return values.slice(1).map(rowToStockRow);
}

// ─────────────────────────────────────────────
// meta 工作表 → TradeMeta
// ─────────────────────────────────────────────

/**
 * 將 meta 工作表的 getValues() 結果映射為 TradeMeta。
 * 預期格式：
 *   Row 0: ['項目', '數值'] (header)
 *   Row 1: ['交易日', value]
 *   Row 2: ['次交易日', value]
 *   Row 3: ['觀察日', value]
 */
export function metaValuesToTradeMeta(values: unknown[][]): TradeMeta {
  const map: Record<string, unknown> = {};
  values.forEach((row) => {
    const key = _toString(row[0]);
    if (key) map[key] = row[1];
  });

  return {
    tradeDate: _toDateOrString(map['交易日']),
    nextDate: _toDateOrString(map['次交易日']),
    obsDate: _toDateOrString(map['觀察日']),
  };
}

// ─────────────────────────────────────────────
// settings 工作表 (RawSettingsMap) → TradeSettings
// ─────────────────────────────────────────────

const SETTINGS_DEFAULTS: TradeSettings = {
  rangeUpperMult: 1.1,
  rangeLowerMult: 0.9,
  buySignalMult: 1.03,
  sellSignalMult: 0.97,
  volBurstMult: 1.5,
  volIncDecMult: 1.0,
  volDecMult: 0.6,
};

function _readSetting(raw: RawSettingsMap, key: string, fallback: number): number {
  const v = Number(raw[key]);
  return !isNaN(v) && isFinite(v) ? v : fallback;
}

/**
 * 將 getSettingsMap() 回傳的 Record 映射為強型別 TradeSettings。
 * 任何缺失或非數字的設定值都 fallback 至預設值。
 */
export function rawMapToTradeSettings(raw: RawSettingsMap): TradeSettings {
  return {
    rangeUpperMult: _readSetting(raw, 'range_upper_mult', SETTINGS_DEFAULTS.rangeUpperMult),
    rangeLowerMult: _readSetting(raw, 'range_lower_mult', SETTINGS_DEFAULTS.rangeLowerMult),
    buySignalMult: _readSetting(raw, 'buy_signal_mult', SETTINGS_DEFAULTS.buySignalMult),
    sellSignalMult: _readSetting(raw, 'sell_signal_mult', SETTINGS_DEFAULTS.sellSignalMult),
    volBurstMult: _readSetting(raw, 'vol_burst_mult', SETTINGS_DEFAULTS.volBurstMult),
    volIncDecMult: _readSetting(raw, 'vol_inc_dec_mult', SETTINGS_DEFAULTS.volIncDecMult),
    volDecMult: _readSetting(raw, 'vol_dec_mult', SETTINGS_DEFAULTS.volDecMult),
  };
}

export { SETTINGS_DEFAULTS };

/**
 * 將 Stock 物件寫回陣列。若提供 existingRow 則會在複本上更新，保留未受管轄的欄位。
 */
export function stockToRow(stock: Stock, existingRow?: unknown[]): unknown[] {
  const col = DB_COL;
  const row = existingRow ? [...existingRow] : new Array(77).fill('');

  row[col.NAME] = stock.identity.name;
  // 補上前置單引號，以防 Excel / Sheet 將純數字代號自動轉為數字格式
  row[col.ID] = stock.identity.id ? `'${stock.identity.id}` : '';

  // 前-*
  row[col.PREV_CLOSE] = stock.price.prev.close ?? '';
  row[col.PREV_HIGH] = stock.price.prev.high ?? '';
  row[col.PREV_LOW] = stock.price.prev.low ?? '';
  row[col.PREV_VOL] = stock.volume.prev.signal ?? '';
  row[col.PREV_MA5] = stock.ma.prev.ma5 ?? '';
  row[col.PREV_MA10] = stock.ma.prev.ma10 ?? '';
  row[col.PREV_MA20] = stock.ma.prev.ma20 ?? '';
  row[col.PREV_MA60] = stock.ma.prev.ma60 ?? '';
  row[col.PREV_MCAP] = stock.marketCap.prev ?? '';

  // 現-*
  row[col.CURR_CLOSE] = stock.price.curr.close ?? '';
  row[col.CURR_HIGH] = stock.price.curr.high ?? '';
  row[col.CURR_LOW] = stock.price.curr.low ?? '';
  row[col.CURR_VOL] = stock.volume.curr.signal ?? '';
  row[col.CURR_MA5] = stock.ma.curr.ma5 ?? '';
  row[col.CURR_MA10] = stock.ma.curr.ma10 ?? '';
  row[col.CURR_MA20] = stock.ma.curr.ma20 ?? '';
  row[col.CURR_MA60] = stock.ma.curr.ma60 ?? '';
  row[col.CURR_MCAP] = stock.marketCap.curr ?? '';

  // 公式計算欄位 (若 existingRow 有值則保留，否則填入計算值，GAS 側執行 updateCalculations 時會覆蓋為 R1C1 公式)
  row[col.DELTA] = stock.price.delta ?? '';
  row[col.CHANGE_PCT] = stock.price.changePct ?? '';

  // 均線狀況
  row[col.MA_STATUS] = stock.ma.status;
  row[col.MA_KEY_EVENTS] = stock.ma.keyEvents;

  // 乖離率
  row[col.BIAS_CURR_MA5] = stock.bias.curr.bias5 ?? '';
  row[col.BIAS_CURR_MA10] = stock.bias.curr.bias10 ?? '';
  row[col.BIAS_CURR_MA20] = stock.bias.curr.bias20 ?? '';
  row[col.BIAS_CURR_MA60] = stock.bias.curr.bias60 ?? '';

  row[col.BIAS_PREV_MA5] = stock.bias.prev.bias5 ?? '';
  row[col.BIAS_PREV_MA10] = stock.bias.prev.bias10 ?? '';
  row[col.BIAS_PREV_MA20] = stock.bias.prev.bias20 ?? '';
  row[col.BIAS_PREV_MA60] = stock.bias.prev.bias60 ?? '';

  return row;
}

/**
 * 將 ZoneState 物件寫回陣列。若提供 existingRow 則會在複本上更新。
 */
export function zoneStateToRow(zone: ZoneState, existingRow?: unknown[]): unknown[] {
  const col = DB_COL;
  const row = existingRow ? [...existingRow] : new Array(77).fill('');

  // 支撐與壓力各 10 個欄位
  SUPPORT_INDICES.forEach((dbIdx, i) => {
    row[dbIdx] = zone.support.levels[i] ?? '';
  });
  RESIST_INDICES.forEach((dbIdx, i) => {
    row[dbIdx] = zone.resistance.levels[i] ?? '';
  });

  // 計數器
  row[col.BREAKOUT_COUNT] = zone.breakout.count;
  row[col.BREAKDOWN_COUNT] = zone.breakdown.count;
  row[col.SUPER_BREAKOUT_COUNT] = zone.breakout.superCount;
  row[col.SUPER_BREAKDOWN_COUNT] = zone.breakdown.superCount;
  row[col.SUPPORT_REFRESH_COUNT] = zone.support.refreshCount;
  row[col.RESIST_REFRESH_COUNT] = zone.resistance.refreshCount;
  row[col.FLAT_COUNT] = zone.volatility.flatCount;

  // 區間邊界
  row[col.BUY_LOWER] = zone.zone.buy.lower ?? '';
  row[col.BUY_UPPER] = zone.zone.buy.upper ?? '';
  row[col.SELL_LOWER] = zone.zone.sell.lower ?? '';
  row[col.SELL_UPPER] = zone.zone.sell.upper ?? '';

  // 高低點與歷史
  row[col.RANGE_HIGH] = zone.range.high ?? '';
  row[col.RANGE_LOW] = zone.range.low ?? '';
  row[col.HISTORY_HIGH6M] = zone.history.high6m ?? '';
  row[col.HISTORY_LOW6M] = zone.history.low6m ?? '';

  // 狀態與保留字串
  row[col.BUY_STATUS] = zone.zone.buy.status;
  row[col.SELL_STATUS] = zone.zone.sell.status;
  row[col.RECOMMENDATION] = zone.zone.recommendation;
  row[col.HIGHLIGHTS] = zone.zone.highlights;

  // 觀察日期 (若是 Date 則轉為 yyyy/MM/dd)
  const fmtDate = (d: Date | string | null): string => {
    if (!d) return '';
    if (d instanceof Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}/${m}/${day}`;
    }
    return String(d).trim();
  };

  row[col.BUY_OBS_DATE] = fmtDate(zone.zone.buy.obsDate);
  row[col.SELL_OBS_DATE] = fmtDate(zone.zone.sell.obsDate);

  // 風控
  row[col.TAKE_PROFIT] = zone.risk.takeProfit ?? '';
  row[col.STOP_LOSS] = zone.risk.stopLoss ?? '';

  // 通知
  row[col.PRICE_ALERT] = zone.alert.price;
  row[col.VOL_SIGNAL] = zone.alert.volume;

  return row;
}

/**
 * 組合 StockRow 寫回陣列
 */
export function stockRowToRow(stockRow: StockRow, existingRow?: unknown[]): unknown[] {
  let row = stockToRow(stockRow.stock, existingRow);
  row = zoneStateToRow(stockRow.zone, row);
  return row;
}

/**
 * 將 TradeMeta 轉回 meta 工作表的 values
 */
export function tradeMetaToMetaValues(meta: TradeMeta): unknown[][] {
  const fmtDate = (d: Date | string | null): string => {
    if (!d) return '';
    if (d instanceof Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}/${m}/${day}`;
    }
    return String(d).trim();
  };

  return [
    ['項目', '數值'],
    ['交易日', fmtDate(meta.tradeDate)],
    ['次交易日', fmtDate(meta.nextDate)],
    ['觀察日', fmtDate(meta.obsDate)],
  ];
}

/**
 * 將 TradeSettings 轉回 RawSettingsMap
 */
export function tradeSettingsToRawMap(settings: TradeSettings): RawSettingsMap {
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

/**
 * 將 TradeSettings 轉回 settings 工作表的 values
 */
export function tradeSettingsToSheetValues(settings: TradeSettings): unknown[][] {
  return [
    ['參數名稱', '數值', '說明'],
    ['range_upper_mult', settings.rangeUpperMult, '區間上緣倍數'],
    ['range_lower_mult', settings.rangeLowerMult, '區間下緣倍數'],
    ['buy_signal_mult', settings.buySignalMult, '買訊倍數'],
    ['sell_signal_mult', settings.sellSignalMult, '賣訊倍數'],
    ['vol_burst_mult', settings.volBurstMult, '爆量倍數'],
    ['vol_inc_dec_mult', settings.volIncDecMult, '量增or量縮倍數'],
    ['vol_dec_mult', settings.volDecMult, '量減倍數'],
  ];
}

