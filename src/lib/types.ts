export interface StockData {
  id: string;        // 股票代號，例如 "0050" 或 "2330"
  name: string;      // 股票名稱
  
  // 價格資訊
  currPrice: number | null; // 現-成交
  prevPrice: number | null; // 前-成交
  diff: number | null;      // 股價差額 (現-前)
  pct: number | null;       // 漲跌幅%
  high: number | null;      // 現-最高
  low: number | null;       // 現-最低
  volBurst: boolean;        // 現-爆量
  ma5: number | null;       // 現-5MA
  ma10: number | null;      // 現-10MA
  ma20: number | null;      // 現-20MA
  ma60: number | null;      // 現-60MA
  marketCap: number | null; // 現-市值
  
  // 前日價格資訊
  prevHigh: number | null;
  prevLow: number | null;
  prevMa5: number | null;
  prevMa10: number | null;
  prevMa20: number | null;
  prevMa60: number | null;

  // 支撐與壓力線 (各10條)
  supports: (number | null)[];  // 支撐1 ~ 支撐10
  pressures: (number | null)[]; // 壓力1 ~ 壓力10

  // 波動與突破計數
  breakoutCount: number;      // 突破次數
  breakdownCount: number;     // 跌破次數
  superBreakoutCount: number; // 超級突破次數
  superBreakdownCount: number; // 超級跌破次數
  refreshSupportCount: number; // 刷新支撐次數
  refreshPressureCount: number; // 刷新壓力次數
  noVolatilityCount: number;  // 無波動計數

  // 區間設定
  buyLowerLimit: number | null; // 買入下緣
  buyUpperLimit: number | null; // 買入上緣
  sellLowerLimit: number | null; // 賣出下緣
  sellUpperLimit: number | null; // 賣出上緣

  // 6個月極值
  halfYearHigh: number | null;  // 6個月最高
  halfYearLow: number | null;   // 6個月最低

  // 狀態與建議
  buyZoneStatus: string;   // 區間買進狀態
  sellZoneStatus: string;  // 區間賣出狀態
  recommendation: string;  // 區間買賣建議
  highlight: string;       // 區間亮點
  
  // 觀察日期
  buyObsDate: string | null;  // 買進觀察日期
  sellObsDate: string | null; // 賣出觀察日期
  
  // 使用者設定或編輯欄位
  takeProfit: number | null;  // 停利點
  stopLoss: number | null;    // 停損點
  notes: string;              // 分析筆記
  tags: string[];             // 標籤列表 (例如: ['自選', '科技', 'ETF'])

  // 均線與到價通知
  maStatus: string;       // 均線狀況 (例如 "突破5MA\n突破10MA")
  maKey: string;          // 均線關鍵 (例如 "2026/06/23 突破5MA")
  priceAlert: string;     // 到價通知 (可停利、可停損、空值)
  volSignal: string;      // 量縮量增 (爆量、量增、量縮、量減)
}

export interface SystemMeta {
  tradeDate: string;      // 交易日
  nextTradeDate: string;  // 次交易日
  obsDate: string;        // 觀察日
  appVersion: string;     // 程式版本號
  lastUpdated: string;    // 最後更新日期
}

export interface ImportLog {
  timestamp: string;
  status: string;
  message: string;
}

export interface SystemSettings {
  range_upper_mult: number;
  range_lower_mult: number;
  buy_signal_mult: number;
  sell_signal_mult: number;
  vol_burst_mult: number;
  vol_inc_dec_mult: number;
  vol_dec_mult: number;
}
