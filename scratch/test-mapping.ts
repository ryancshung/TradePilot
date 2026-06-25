import {
  rowToStockRow,
  stockRowToRow,
  metaValuesToTradeMeta,
  tradeMetaToMetaValues,
  rawMapToTradeSettings,
  tradeSettingsToRawMap,
} from '../types';

// 隨機 mock 資料來跑 round-trip
const mockRow: unknown[] = [
  '測試股', "'99999", // 0, 1
  100, 105, 95, 1.2, 101, 102, 103, 104, 50000000, // 2-10 (prev)
  105, 110, 102, 1.8, 103, 104, 105, 106, 52000000, // 11-19 (curr)
  5, 0.05, // 20, 21 (delta, pct)
  90, 89, 88, 87, 86, 85, 84, 83, 82, 81, // 22-31 (support)
  120, 121, 122, 123, 124, 125, 126, 127, 128, 129, // 32-41 (resist)
  3, 2, 1, 0, 4, 5, 0, // 42-48 (counters)
  90, 95, 115, 110, // 49-52 (buy/sell bounds)
  115, 95, 120, 80, // 53-56 (range/history)
  '等一長紅', '等一長黑', '', '', // 57-60 (statuses)
  '2026/06/25', '2026/06/26', // 61-62 (obs dates)
  130, 90, // 63-64 (tp, sl)
  '突破5MA\n跌破10MA', '2026/06/25 突破5MA', // 65-66 (ma status)
  0.0194, 0.0096, 0, -0.0094, // 67-70 (curr bias)
  -0.0099, -0.0196, -0.0291, -0.0385, // 71-74 (prev bias)
  '可停利', '爆量' // 75-76 (alerts)
];

console.log('--- 開始測試 Round-trip ---');

// 1. Row -> StockRow -> Row
const stockRow = rowToStockRow(mockRow);
const backRow = stockRowToRow(stockRow);

// 2. 驗證所有欄位一致性 (除了 DELTA 和 CHANGE_PCT 公式以及空值轉換可能產生的微小差異)
let hasError = false;
for (let i = 0; i < mockRow.length; i++) {
  // 將 null / undefined / 空字串 / 數值化處理成統一格式比較
  const orig = mockRow[i];
  const back = backRow[i];
  
  // 特別處理 ID 的單引號
  if (i === 1) {
    if (back !== orig) {
      console.error(`Mismatch at col ${i} (ID): expected "${orig}", got "${back}"`);
      hasError = true;
    }
    continue;
  }

  // 格式化為字串做對比
  const origStr = orig === null || orig === undefined ? '' : String(orig).trim();
  const backStr = back === null || back === undefined ? '' : String(back).trim();

  if (origStr !== backStr) {
    // 容許些微浮點數誤差或空值表示差異
    const origNum = Number(origStr);
    const backNum = Number(backStr);
    if (!isNaN(origNum) && !isNaN(backNum) && Math.abs(origNum - backNum) < 0.0001) {
      continue;
    }
    console.error(`Mismatch at col ${i}: expected "${orig}", got "${back}"`);
    hasError = true;
  }
}

// 3. 測試 TradeMeta
const mockMetaValues = [
  ['項目', '數值'],
  ['交易日', '2026/06/25'],
  ['次交易日', '2026/06/26'],
  ['觀察日', '2026/06/27']
];
const metaObj = metaValuesToTradeMeta(mockMetaValues);
const backMetaValues = tradeMetaToMetaValues(metaObj);
if (JSON.stringify(mockMetaValues) !== JSON.stringify(backMetaValues)) {
  console.error('TradeMeta round-trip mismatch:', { mockMetaValues, backMetaValues });
  hasError = true;
}

// 4. 測試 TradeSettings
const mockSettingsMap = {
  range_upper_mult: 1.1,
  range_lower_mult: 0.9,
  buy_signal_mult: 1.03,
  sell_signal_mult: 0.97,
  vol_burst_mult: 1.5,
  vol_inc_dec_mult: 1.0,
  vol_dec_mult: 0.6
};
const settingsObj = rawMapToTradeSettings(mockSettingsMap);
const backSettingsMap = tradeSettingsToRawMap(settingsObj);
for (const key of Object.keys(mockSettingsMap)) {
  const k = key as keyof typeof mockSettingsMap;
  if (mockSettingsMap[k] !== backSettingsMap[k]) {
    console.error(`TradeSettings mismatch at key "${k}": expected ${mockSettingsMap[k]}, got ${backSettingsMap[k]}`);
    hasError = true;
  }
}

if (!hasError) {
  console.log('✅ 所有 Round-trip 測試成功！');
  process.exit(0);
} else {
  console.error('❌ Round-trip 測試失敗，請檢查上述錯誤。');
  process.exit(1);
}
