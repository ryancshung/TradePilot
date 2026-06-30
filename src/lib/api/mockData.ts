import { ImportLog } from '../types';

export interface RawSystemSettings {
  range_upper_mult: number;
  range_lower_mult: number;
  buy_signal_mult: number;
  sell_signal_mult: number;
  vol_burst_mult: number;
  vol_inc_dec_mult: number;
  vol_dec_mult: number;
}

export interface RawSystemMeta {
  tradeDate: string;
  nextTradeDate: string;
  obsDate: string;
  appVersion: string;
  lastUpdated: string;
}

export const INITIAL_SETTINGS: RawSystemSettings = {
  range_upper_mult: 1.1,
  range_lower_mult: 0.9,
  buy_signal_mult: 1.03,
  sell_signal_mult: 0.97,
  vol_burst_mult: 1.5,
  vol_inc_dec_mult: 1.0,
  vol_dec_mult: 0.6
};

export const INITIAL_META: RawSystemMeta = {
  tradeDate: '2026/06/22',
  nextTradeDate: '2026/06/23',
  obsDate: '2026/06/23',
  appVersion: 'v4.5-json-1.2-final-spec+price-vol',
  lastUpdated: new Date().toISOString()
};

export const INITIAL_LOGS: ImportLog[] = [
  { timestamp: '2026-06-22T17:30:00.000Z', status: '成功', message: '系統初始化完成！' },
  { timestamp: '2026-06-22T17:35:12.000Z', status: '成功', message: '已從 JSON 還原整個資料庫｜來源系統=TradePilot_StockSystem｜來源版本=v4.5-json-1.2｜schema=1.0.0' }
];

export const INITIAL_STOCKS: any[] = [
  {
    id: '0050',
    name: '元大台灣50',
    currPrice: 184.50,
    prevPrice: 182.30,
    diff: 2.20,
    pct: 0.0121,
    high: 185.00,
    low: 182.00,
    volBurst: false,
    ma5: 183.10,
    ma10: 181.80,
    ma20: 180.20,
    ma60: 175.40,
    marketCap: 412500, // 百萬

    prevHigh: 183.00,
    prevLow: 181.20,
    prevMa5: 182.50,
    prevMa10: 181.50,
    prevMa20: 179.80,
    prevMa60: 175.20,

    supports: [181.5, 180.0, 178.5, 177.0, 175.0, 173.2, 171.0, 168.5, 165.0, 162.0],
    pressures: [186.0, 188.0, 190.0, 192.5, 195.0, 198.0, 200.0, 204.0, 208.0, 212.0],

    breakoutCount: 2,
    breakdownCount: 0,
    superBreakoutCount: 1,
    superBreakdownCount: 0,
    refreshSupportCount: 3,
    refreshPressureCount: 1,
    noVolatilityCount: 0,

    buyLowerLimit: 176.54,
    buyUpperLimit: 183.22,
    sellLowerLimit: 181.20,
    sellUpperLimit: 189.50,

    halfYearHigh: 188.50,
    halfYearLow: 158.00,

    buyZoneStatus: '突破等待：2026/06/23',
    sellZoneStatus: '不高於：2026/06/23',
    recommendation: '觀望，等回測支撐',
    highlight: '突破歷史高點箱型上緣',
    buyObsDate: '2026/06/23',
    sellObsDate: '2026/06/23',

    takeProfit: 195.00,
    stopLoss: 178.00,
    notes: '0050 持續沿著 5MA 走揚，由於權值股台積電走勢強勁，帶動大盤與 ETF 創下高點。建議買點在 181 元支撐線附近。',
    tags: ['自選', 'ETF', '權值股'],

    maStatus: '突破5MA\n突破10MA',
    maKey: '2026/06/22 突破5MA\n2026/06/22 突破10MA',
    priceAlert: '',
    volSignal: '量增'
  },
  {
    id: '2330',
    name: '台積電',
    currPrice: 978.00,
    prevPrice: 970.00,
    diff: 8.00,
    pct: 0.0082,
    high: 984.00,
    low: 968.00,
    volBurst: true,
    ma5: 962.40,
    ma10: 954.20,
    ma20: 940.80,
    ma60: 912.50,
    marketCap: 25360000,

    prevHigh: 975.00,
    prevLow: 958.00,
    prevMa5: 957.20,
    prevMa10: 950.50,
    prevMa20: 938.00,
    prevMa60: 911.20,

    supports: [960.0, 950.0, 942.0, 930.0, 920.0, 905.0, 890.0, 875.0, 860.0, 840.0],
    pressures: [985.0, 995.0, 1000.0, 1010.0, 1025.0, 1040.0, 1060.0, 1080.0, 1100.0, 1150.0],

    breakoutCount: 4,
    breakdownCount: 0,
    superBreakoutCount: 2,
    superBreakdownCount: 0,
    refreshSupportCount: 5,
    refreshPressureCount: 2,
    noVolatilityCount: 0,

    buyLowerLimit: 928.00,
    buyUpperLimit: 968.00,
    sellLowerLimit: 955.00,
    sellUpperLimit: 998.00,

    halfYearHigh: 984.00,
    halfYearLow: 750.00,

    buyZoneStatus: '可買進：2026/06/23 (978)',
    sellZoneStatus: '不高於：2026/06/23',
    recommendation: '強烈推薦買進，量增突破',
    highlight: '爆量突破關鍵均線',
    buyObsDate: null,
    sellObsDate: '2026/06/23',

    takeProfit: 1050.00,
    stopLoss: 940.00,
    notes: '受惠於先進製程需求極度強勁及AI伺服器晶片大賣，台積電股價即將挑戰千元關卡。本季資本支出可能再度上修。目前沿5MA偏多操作。',
    tags: ['自選', '半導體', '權值股', 'AI'],

    maStatus: '突破5MA',
    maKey: '2026/06/22 突破5MA',
    priceAlert: '',
    volSignal: '爆量'
  },
  {
    id: '2317',
    name: '鴻海',
    currPrice: 200.50,
    prevPrice: 204.00,
    diff: -3.50,
    pct: -0.0172,
    high: 206.00,
    low: 199.00,
    volBurst: false,
    ma5: 201.20,
    ma10: 198.50,
    ma20: 193.40,
    ma60: 182.20,
    marketCap: 2779000,

    prevHigh: 208.00,
    prevLow: 202.00,
    prevMa5: 200.80,
    prevMa10: 197.80,
    prevMa20: 192.50,
    prevMa60: 181.80,

    supports: [198.0, 195.0, 192.0, 188.0, 185.0, 181.0, 178.0, 174.0, 170.0, 165.0],
    pressures: [205.0, 208.0, 212.0, 216.0, 220.0, 225.0, 230.0, 238.0, 245.0, 255.0],

    breakoutCount: 1,
    breakdownCount: 1,
    superBreakoutCount: 0,
    superBreakdownCount: 0,
    refreshSupportCount: 2,
    refreshPressureCount: 1,
    noVolatilityCount: 1,

    buyLowerLimit: 190.50,
    buyUpperLimit: 199.50,
    sellLowerLimit: 196.80,
    sellUpperLimit: 209.50,

    halfYearHigh: 212.00,
    halfYearLow: 135.00,

    buyZoneStatus: '不低於：2026/06/23',
    sellZoneStatus: '跌破等待：2026/06/23',
    recommendation: '逢低承接，回測 5MA 與 10MA',
    highlight: '黑K拉回至支撐區',
    buyObsDate: '2026/06/23',
    sellObsDate: '2026/06/23',

    takeProfit: 220.00,
    stopLoss: 190.00,
    notes: '輝達 GB200 主要組裝供應商。近日股價在 200 元關卡有震盪整理，回檔 195 - 198 是不錯的分批佈局點。',
    tags: ['自選', 'AI', '電子代工'],

    maStatus: '跌破5MA',
    maKey: '2026/06/22 跌破5MA',
    priceAlert: '',
    volSignal: '量縮'
  },
  {
    id: '2454',
    name: '聯發科',
    currPrice: 1385.00,
    prevPrice: 1400.00,
    diff: -15.00,
    pct: -0.0107,
    high: 1410.00,
    low: 1370.00,
    volBurst: false,
    ma5: 1392.00,
    ma10: 1368.00,
    ma20: 1320.00,
    ma60: 1250.00,
    marketCap: 2215000,

    prevHigh: 1420.00,
    prevLow: 1390.00,
    prevMa5: 1390.00,
    prevMa10: 1362.00,
    prevMa20: 1312.00,
    prevMa60: 1246.00,

    supports: [1360.0, 1340.0, 1310.0, 1290.0, 1260.0, 1230.0, 1200.0, 1170.0, 1140.0, 1100.0],
    pressures: [1420.0, 1440.0, 1460.0, 1490.0, 1520.0, 1550.0, 1600.0, 1650.0, 1700.0, 1800.0],

    breakoutCount: 3,
    breakdownCount: 1,
    superBreakoutCount: 1,
    superBreakdownCount: 0,
    refreshSupportCount: 2,
    refreshPressureCount: 3,
    noVolatilityCount: 0,

    buyLowerLimit: 1280.00,
    buyUpperLimit: 1370.00,
    sellLowerLimit: 1360.00,
    sellUpperLimit: 1440.00,

    halfYearHigh: 1440.00,
    halfYearLow: 980.00,

    buyZoneStatus: '不低於：2026/06/23',
    sellZoneStatus: '不高於：2026/06/23',
    recommendation: '區間高檔震盪，不建議追高',
    highlight: '天璣 9400 預期出貨良好',
    buyObsDate: '2026/06/23',
    sellObsDate: '2026/06/23',

    takeProfit: 1500.00,
    stopLoss: 1300.00,
    notes: 'IC設計龍頭，旗艦手機晶片將採用 3 奈米製程，市場預期 ASP 調漲。短線爆漲後拉回震盪。',
    tags: ['IC設計', '半導體'],

    maStatus: '跌破5MA',
    maKey: '2026/06/22 跌破5MA',
    priceAlert: '',
    volSignal: '量減'
  },
  {
    id: '2603',
    name: '陽明',
    currPrice: 72.80,
    prevPrice: 75.30,
    diff: -2.50,
    pct: -0.0332,
    high: 76.00,
    low: 72.10,
    volBurst: false,
    ma5: 75.20,
    ma10: 76.80,
    ma20: 74.50,
    ma60: 68.20,
    marketCap: 254000,

    prevHigh: 76.50,
    prevLow: 74.20,
    prevMa5: 75.80,
    prevMa10: 77.00,
    prevMa20: 74.20,
    prevMa60: 67.90,

    supports: [72.0, 70.2, 68.0, 66.5, 64.8, 62.0, 60.0, 58.0, 55.0, 52.0],
    pressures: [76.5, 78.2, 80.0, 82.5, 85.0, 88.0, 92.0, 96.0, 100.0, 105.0],

    breakoutCount: 0,
    breakdownCount: 2,
    superBreakoutCount: 0,
    superBreakdownCount: 1,
    refreshSupportCount: 1,
    refreshPressureCount: 0,
    noVolatilityCount: 0,

    buyLowerLimit: 68.20,
    buyUpperLimit: 74.50,
    sellLowerLimit: 72.00,
    sellUpperLimit: 78.50,

    halfYearHigh: 84.20,
    halfYearLow: 48.00,

    buyZoneStatus: '不低於：2026/06/23',
    sellZoneStatus: '跌破等待：2026/06/23',
    recommendation: '跌破季線與月線，暫時觀望',
    highlight: '運價走勢轉弱，面臨修正',
    buyObsDate: '2026/06/23',
    sellObsDate: '2026/06/23',

    takeProfit: 80.00,
    stopLoss: 68.00,
    notes: 'SCFI運價指數近期出現小幅拉回，紅海危機紅利似乎漸漸鈍化。短線上季線有撐，若跌破 72 元則要小心停損。',
    tags: ['航運', '景氣循環'],

    maStatus: '跌破5MA\n跌破10MA\n跌破20MA',
    maKey: '2026/06/22 跌破5MA\n2026/06/22 跌破10MA\n2026/06/22 跌破20MA',
    priceAlert: '可停損',
    volSignal: '量減'
  }
];
