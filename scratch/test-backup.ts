import { validateBackupJson, getSheetFromPayload, BackupPayload } from '../types';
import { sheetValuesToStockRows, metaValuesToTradeMeta, rawMapToTradeSettings } from '../types';

// 1. 構造 Mock 備份資料，這應完全符合 BackupPayload 介面與 GAS getDatabaseBackupPayload() 格式
const mockBackupData: BackupPayload = {
  app: {
    name: 'TradePilot_StockSystem',
    version: 'v4.5-json-1.2-final-spec+price-vol'
  },
  backup: {
    schemaVersion: '1.0.0',
    exportedAt: '2026-06-25T12:00:00.000Z',
    exportedAtLocal: '2026/06/25 20:00:00',
    spreadsheetId: 'mock-spreadsheet-id-12345',
    spreadsheetName: '我的交易導航儀',
    timezone: 'Asia/Taipei'
  },
  summary: {
    totalSheets: 4,
    totalRows: 1
  },
  sheets: {
    stock_db: {
      name: 'stock_db',
      rowCount: 2, // 1 header + 1 data row
      colCount: 77,
      values: [
        // Header row
        [
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
          '到價通知', '量縮量增'
        ],
        // Data row
        [
          '護國神山', "'2330",
          980, 990, 975, 1.1, 970, 960, 950, 900, 25000000, // 2-10
          1000, 1010, 995, 2.5, 985, 975, 960, 910, 26000000, // 11-19
          20, 0.0204, // 20, 21
          950, 940, 930, '', '', '', '', '', '', '', // 22-31 (support)
          1020, 1030, '', '', '', '', '', '', '', '', // 32-41 (resist)
          1, 0, 0, 0, 2, 1, 0, // 42-48
          960, 1010, 1020, 970, // 49-52
          1010, 975, 1020, 800, // 53-56
          '突破等待：2026/06/25', '不高於：2026/06/25', '建議買入', '強勢突破', // 57-60
          '2026/06/24', '2026/06/24', // 61-62
          1100, 930, // 63-64
          '突破5MA', '2026/06/25 突破5MA', // 65-66
          0.0152, 0.0256, 0.0417, 0.0989, // 67-70
          0.0103, 0.0208, 0.0316, 0.0889, // 71-74
          '可停損', '爆量' // 75-76
        ]
      ]
    },
    settings: {
      name: 'settings',
      rowCount: 8,
      colCount: 3,
      values: [
        ['參數名稱', '數值', '說明'],
        ['range_upper_mult', 1.1, '區間上緣倍數'],
        ['range_lower_mult', 0.9, '區間下緣倍數'],
        ['buy_signal_mult', 1.03, '買訊倍數'],
        ['sell_signal_mult', 0.97, '賣訊倍數'],
        ['vol_burst_mult', 1.5, '爆量倍數'],
        ['vol_inc_dec_mult', 1.0, '量增or量縮倍數'],
        ['vol_dec_mult', 0.6, '量減倍數']
      ]
    },
    meta: {
      name: 'meta',
      rowCount: 4,
      colCount: 2,
      values: [
        ['項目', '數值'],
        ['交易日', '2026/06/25'],
        ['次交易日', '2026/06/26'],
        ['觀察日', '2026/06/27']
      ]
    },
    import_log: {
      name: 'import_log',
      rowCount: 2,
      colCount: 3,
      values: [
        ['時間', '狀態', '訊息'],
        ['2026/06/25 20:01:00', '成功', '備份測試驗證']
      ]
    }
  }
};

const jsonText = JSON.stringify(mockBackupData);

console.log('--- 開始備份與解析整合測試 ---');

// 1. 執行 JSON Schema 驗證
const validationResult = validateBackupJson(jsonText);
if (!validationResult.ok) {
  console.error('❌ JSON 驗證失敗:', validationResult.error);
  process.exit(1);
}
console.log('✅ validateBackupJson 驗證通過！');

const payload = validationResult.payload;

// 2. 驗證與解析 stock_db 表
const dbSheetData = getSheetFromPayload(payload, 'stock_db');
if (!dbSheetData) {
  console.error('❌ 備份中找不到 stock_db 工作表');
  process.exit(1);
}

const stockRows = sheetValuesToStockRows(dbSheetData.values);
if (stockRows.length !== 1) {
  console.error(`❌ 解析出的股票行數與預期不符: 預期 1，實際 ${stockRows.length}`);
  process.exit(1);
}

const isSameDate = (d: Date | string | null, expectedStr: string): boolean => {
  if (!(d instanceof Date)) return false;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}` === expectedStr;
};

const targetStockRow = stockRows[0];
// 檢查核心屬性對齊
if (
  targetStockRow.stock.identity.name !== '護國神山' ||
  targetStockRow.stock.identity.id !== '2330' ||
  targetStockRow.stock.price.curr.close !== 1000 ||
  targetStockRow.zone.zone.buy.status !== '突破等待：2026/06/25'
) {
  console.error('❌ stock_db 解析內容不符合預期:', JSON.stringify(targetStockRow, null, 2));
  process.exit(1);
}

// 驗證日期欄位是否已正確還原為 Date 物件
if (
  !isSameDate(targetStockRow.zone.zone.buy.obsDate, '2026/06/24') ||
  !isSameDate(targetStockRow.zone.zone.sell.obsDate, '2026/06/24')
) {
  console.error('❌ stock_db 日期欄位未正確還原為 Date 物件:', {
    buyObsDate: targetStockRow.zone.zone.buy.obsDate,
    sellObsDate: targetStockRow.zone.zone.sell.obsDate
  });
  process.exit(1);
}
console.log('✅ stock_db 解析與 Mapping 成功，欄位與日期物件完全對齊！');

// 3. 驗證與解析 settings 表
const settingsSheetData = getSheetFromPayload(payload, 'settings');
if (!settingsSheetData) {
  console.error('❌ 備份中找不到 settings 工作表');
  process.exit(1);
}

// 將 settings 二維陣列轉為鍵值對 map，仿 getSettingsMap()
const rawSettingsMap: Record<string, string | number> = {};
settingsSheetData.values.forEach((row) => {
  if (row[0] && row[0] !== '參數名稱') {
    rawSettingsMap[String(row[0]).trim()] = row[1] as string | number;
  }
});

const settings = rawMapToTradeSettings(rawSettingsMap);
if (
  settings.rangeUpperMult !== 1.1 ||
  settings.volBurstMult !== 1.5 ||
  settings.volDecMult !== 0.6
) {
  console.error('❌ settings 解析與 Mapping 失敗:', settings);
  process.exit(1);
}
console.log('✅ settings 解析與 Mapping 成功，設定值符合預期！');

// 4. 驗證與解析 meta 表
const metaSheetData = getSheetFromPayload(payload, 'meta');
if (!metaSheetData) {
  console.error('❌ 備份中找不到 meta 工作表');
  process.exit(1);
}

const meta = metaValuesToTradeMeta(metaSheetData.values);
if (
  !isSameDate(meta.tradeDate, '2026/06/25') ||
  !isSameDate(meta.nextDate, '2026/06/26') ||
  !isSameDate(meta.obsDate, '2026/06/27')
) {
  console.error('❌ meta 解析與 Mapping 失敗，Date 欄位未正確還原或值不符合:', meta);
  process.exit(1);
}
console.log('✅ meta 解析與 Mapping 成功，日期 Date 物件符合預期！');

console.log('✅ 備份與解析整合測試成功！所有 TS 契約與 mapping 層皆與 GAS 格式完全對齊。');
process.exit(0);
