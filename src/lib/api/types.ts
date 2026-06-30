export interface PriceMarkers {
  currPrice: number | null;
  prevPrice: number | null;
  diff: number | null;
  pct: number | null;
  high: number | null;
  low: number | null;
  prevHigh: number | null;
  prevLow: number | null;
  halfYearHigh: number | null;
  halfYearLow: number | null;
  marketCap: number | null;
}

export interface MovingAverageBlock {
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma60: number | null;
  prevMa5: number | null;
  prevMa10: number | null;
  prevMa20: number | null;
  prevMa60: number | null;
  status: string; // 對應舊 maStatus
  keyEvents: string; // 對應舊 maKey
}

export interface ZoneAnalysisBlock {
  buyLowerLimit: number | null;
  buyUpperLimit: number | null;
  sellLowerLimit: number | null;
  sellUpperLimit: number | null;
  buyZoneStatus: string;
  sellZoneStatus: string;
  recommendation: string;
  highlight: string;
  buyObsDate: string | null;
  sellObsDate: string | null;
  breakoutCount: number;
  breakdownCount: number;
  superBreakoutCount: number;
  superBreakdownCount: number;
  refreshSupportCount: number;
  refreshPressureCount: number;
  noVolatilityCount: number;
}

export interface ZoneLine {
  levels: (number | null)[];
  refreshCount: number;
}

export interface ZoneArrow {
  from: number | null;
  to: number | null;
}

export interface TagSummary {
  tags: string[];
}

export interface StockListItem {
  id: string;
  name: string;
  price: PriceMarkers;
  ma: MovingAverageBlock;
  zone: ZoneAnalysisBlock;
  tags: string[];
  volSignal: string;
  priceAlert: string;
}

export interface StockDetail extends StockListItem {
  supports: ZoneLine;
  pressures: ZoneLine;
  notes: string;
  takeProfit: number | null;
  stopLoss: number | null;
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

export interface MetaInfo {
  tradeDate: string;
  nextTradeDate: string;
  obsDate: string;
  appVersion: string;
  lastUpdated: string;
}

export interface ImportLog {
  timestamp: string;
  status: string;
  message: string;
}
