function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📈 股票管理系統')
    .addItem('初始化系統', 'initSystem')
    .addItem('手動匯入 CSV', 'showImportDialog')
    .addSeparator()
    .addItem('匯出整個資料庫(JSON)', 'exportDatabaseJson')
    .addItem('匯入整個資料庫(JSON)', 'showImportDatabaseJsonDialog')
    .addToUi();
}

function initSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let dbSheet = ss.getSheetByName(CONFIG.SHEETS.DB);
  if (!dbSheet) dbSheet = ss.insertSheet(CONFIG.SHEETS.DB);

  const dbHeaders = getDbHeaders();

  dbSheet.clear();
  dbSheet.getRange(1, 1, 1, dbHeaders.length)
    .setValues([dbHeaders])
    .setFontWeight('bold')
    .setBackground('#f3f3f3');

  dbSheet.setFrozenRows(1);
  dbSheet.setFrozenColumns(2);
  applyDbSheetFormatting(dbSheet, dbHeaders);

  let setSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (!setSheet) setSheet = ss.insertSheet(CONFIG.SHEETS.SETTINGS);
  const setData = [
    ['參數名稱', '數值', '說明'],
    ['range_upper_mult', 1.1, '區間上緣倍數'],
    ['range_lower_mult', 0.9, '區間下緣倍數'],
    ['buy_signal_mult', 1.03, '買訊倍數'],
    ['sell_signal_mult', 0.97, '賣訊倍數'],
    ['vol_burst_mult', 1.5, '爆量倍數'],
    ['vol_inc_dec_mult', 1, '量增or量縮倍數'],
    ['vol_dec_mult', 0.6, '量減倍數']
  ];
  setSheet.clear();
  setSheet.getRange(1, 1, setData.length, 3).setValues(setData);

  let metaSheet = ss.getSheetByName(CONFIG.SHEETS.META);
  if (!metaSheet) metaSheet = ss.insertSheet(CONFIG.SHEETS.META);
  metaSheet.clear();
  metaSheet.getRange(1, 1, 4, 2).setValues([
    ['項目', '數值'],
    ['交易日', ''],
    ['次交易日', ''],
    ['觀察日', '']
  ]);

  let logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG);
  if (!logSheet) logSheet = ss.insertSheet(CONFIG.SHEETS.LOG);
  logSheet.clear();
  logSheet.getRange(1, 1, 1, 3).setValues([['時間', '狀態', '訊息']]);

  SpreadsheetApp.getUi().alert('系統初始化完成！');
}

function showImportDialog() {
  const html = HtmlService.createHtmlOutputFromFile('ImportDialog')
    .setWidth(400)
    .setHeight(180);
  SpreadsheetApp.getUi().showModalDialog(html, '同步匯入股票 CSV');
}

function exportDatabaseJson() {
  const html = HtmlService.createHtmlOutputFromFile('BackupDownload')
    .setWidth(420)
    .setHeight(220);
  SpreadsheetApp.getUi().showModalDialog(html, '下載資料庫 JSON');
}

function showImportDatabaseJsonDialog() {
  const html = HtmlService.createHtmlOutputFromFile('ImportDatabaseJson')
    .setWidth(420)
    .setHeight(240);
  SpreadsheetApp.getUi().showModalDialog(html, '匯入資料庫 JSON');
}

function getDatabaseBackupPayload() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const exportTime = new Date();

  const payload = {
    app: {
      name: APP_INFO.APP_NAME,
      version: APP_INFO.APP_VERSION
    },
    backup: {
      schemaVersion: APP_INFO.BACKUP_SCHEMA_VERSION,
      exportedAt: exportTime.toISOString(),
      exportedAtLocal: Utilities.formatDate(
        exportTime,
        Session.getScriptTimeZone(),
        'yyyy/MM/dd HH:mm:ss'
      ),
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      timezone: Session.getScriptTimeZone()
    },
    summary: {
      totalSheets: 0,
      totalRows: 0
    },
    sheets: {}
  };

  [
    CONFIG.SHEETS.DB,
    CONFIG.SHEETS.SETTINGS,
    CONFIG.SHEETS.META,
    CONFIG.SHEETS.LOG
  ].forEach(function(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const values = sheet.getDataRange().getValues();
    const rowCount = values.length;
    const colCount = rowCount > 0 ? values[0].length : 0;

    payload.sheets[sheetName] = {
      name: sheetName,
      rowCount: rowCount,
      colCount: colCount,
      values: values
    };

    payload.summary.totalSheets += 1;
    payload.summary.totalRows += Math.max(rowCount - 1, 0);
  });

  const fileName = [
    APP_INFO.APP_NAME,
    APP_INFO.APP_VERSION.replace(/[^\w.-]/g, '_'),
    Utilities.formatDate(exportTime, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss')
  ].join('_') + '.json';

  return {
    fileName: fileName,
    content: JSON.stringify(payload, null, 2)
  };
}

function importDatabaseJson(jsonText) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const payload = JSON.parse(jsonText);

    if (!payload || !payload.sheets) {
      throw new Error('JSON 格式不正確，找不到 sheets 資料。');
    }

    const schemaVersion =
      payload.backup &&
      payload.backup.schemaVersion
        ? String(payload.backup.schemaVersion).trim()
        : '';

    if (!schemaVersion) {
      throw new Error('此備份檔缺少 schemaVersion，無法確認版本相容性。');
    }

    if (APP_INFO.COMPATIBLE_SCHEMA_VERSIONS.indexOf(schemaVersion) === -1) {
      throw new Error(
        '備份檔 schemaVersion=' + schemaVersion +
        '，與目前程式可接受版本不相容。'
      );
    }

    const sourceAppName =
      payload.app && payload.app.name ? payload.app.name : '未知系統';
    const sourceAppVersion =
      payload.app && payload.app.version ? payload.app.version : '未知版本';
    const exportedAtLocal =
      payload.backup && payload.backup.exportedAtLocal
        ? payload.backup.exportedAtLocal
        : '未知時間';

    const targetSheets = [
      CONFIG.SHEETS.DB,
      CONFIG.SHEETS.SETTINGS,
      CONFIG.SHEETS.META,
      CONFIG.SHEETS.LOG
    ];

    targetSheets.forEach(function(sheetName) {
      const sheetData = payload.sheets[sheetName];
      if (!sheetData || !sheetData.values) return;

      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) sheet = ss.insertSheet(sheetName);

      sheet.clear();

      const values = sheetData.values;
      if (values.length > 0 && values[0].length > 0) {
        sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
      }
    });

    SpreadsheetApp.flush();
    postRestoreFormatting();

    logImport(
      '成功',
      '已從 JSON 還原整個資料庫' +
      '｜來源系統=' + sourceAppName +
      '｜來源版本=' + sourceAppVersion +
      '｜schema=' + schemaVersion +
      '｜匯出時間=' + exportedAtLocal
    );

    ss.toast(
      '資料庫 JSON 匯入完成｜' + sourceAppVersion + '｜schema ' + schemaVersion,
      '系統通知',
      5
    );

    return {
      success: true,
      meta: {
        sourceAppName: sourceAppName,
        sourceAppVersion: sourceAppVersion,
        schemaVersion: schemaVersion,
        exportedAtLocal: exportedAtLocal
      }
    };

  } catch (e) {
    logImport('失敗', 'JSON 匯入失敗：' + e.toString());
    return { success: false, error: e.toString() };
  }
}

function importStockCSV(csvContent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName(CONFIG.SHEETS.DB);
  const metaSheet = ss.getSheetByName(CONFIG.SHEETS.META);
  const setSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);

  if (!dbSheet || !metaSheet || !setSheet) {
    throw new Error('系統尚未完整初始化，請先執行初始化系統！');
  }

  try {
    const rows = Utilities.parseCsv(csvContent);
    if (!rows || rows.length === 0) throw new Error('CSV 無有效數據');

    const firstCell = String(rows[0][0] || '').trim();
    const headerMatch = firstCell.match(/(\d+[A-Z*]?)$/);
    const hasHeader = isNaN(parseInt(headerMatch ? headerMatch[0] : '', 10));
    const csvDataRows = hasHeader ? rows.slice(1) : rows;
    if (csvDataRows.length === 0) throw new Error('CSV 無有效數據');

    const currentCSVDate = csvDataRows[0][12];
    updateMetaData(csvDataRows[0][10], csvDataRows[0][11], currentCSVDate);

    const metaValues = metaSheet.getDataRange().getValues();
    let obsDateValue = '';
    metaValues.forEach(function(row) {
      if (String(row[0]).trim() === '觀察日') obsDateValue = row[1];
    });

    let obsDateStr = '';
    if (obsDateValue instanceof Date) {
      obsDateStr = Utilities.formatDate(obsDateValue, ss.getSpreadsheetTimeZone(), 'yyyy/MM/dd');
    } else {
      obsDateStr = String(obsDateValue || '').trim();
    }

    const settings = getSettingsMap(setSheet);

    const csvMap = {};
    csvDataRows.forEach(function(row) {
      const fullInfo = String(row[0] || '').trim();
      if (!fullInfo) return;

      const match = fullInfo.match(/^(.*?)(\d+[A-Z*]?)$/);
      const rawId = match ? match[2] : fullInfo;
      const id = normalizeStockId(rawId);
      const name = match ? String(match[1] || '').trim() : fullInfo;

      const clean = function(val) {
        return parseFloat(String(val || '').replace(/[↑↓,]/g, '')) || 0;
      };

      csvMap[id] = {
        id: id,
        rawId: rawId,
        name: name,
        raw: row,
        hV: clean(row[2]),
        lV: clean(row[3])
      };
    });

    const dbValues = dbSheet.getDataRange().getValues();
    if (!dbValues || dbValues.length === 0) {
      throw new Error('stock_db 工作表沒有標題列，請先初始化系統。');
    }

    const dbHeaders = dbValues[0].map(function(h) { return String(h).trim(); });

    requireHeaders(dbHeaders, [
      '股票名稱', '股票代號',
      '前-成交', '現-成交',
      '買入下緣', '買入上緣',
      '賣出下緣', '賣出上緣',
      '最高', '最低',
      '區間買進狀態', '區間賣出狀態',
      '買進觀察日期', '賣出觀察日期',
      '6個月最高', '6個月最低'
    ]);

    const col = {
      name: dbHeaders.indexOf('股票名稱'),
      id: dbHeaders.indexOf('股票代號'),
      prevS: dbHeaders.indexOf('前-成交'),
      currS: dbHeaders.indexOf('現-成交'),
      bLow: dbHeaders.indexOf('買入下緣'),
      bUpp: dbHeaders.indexOf('買入上緣'),
      sLow: dbHeaders.indexOf('賣出下緣'),
      sUpp: dbHeaders.indexOf('賣出上緣'),
      dbH: dbHeaders.indexOf('最高'),
      dbL: dbHeaders.indexOf('最低'),
      bStat: dbHeaders.indexOf('區間買進狀態'),
      sStat: dbHeaders.indexOf('區間賣出狀態'),
      bDate: dbHeaders.indexOf('買進觀察日期'),
      sDate: dbHeaders.indexOf('賣出觀察日期'),
      bd: dbHeaders.indexOf('6個月最高'),
      be: dbHeaders.indexOf('6個月最低')
    };

    const oldData = dbValues.slice(1);
    const finalData = [];
    const processedIds = new Set();
    const deletedIds = [];

    oldData.forEach(function(row) {
      const rawDbId = String(row[col.id] || '').trim();
      if (!rawDbId) return;

      const dbId = normalizeStockId(rawDbId);

      if (!csvMap[dbId]) {
        deletedIds.push(dbId + (row[col.name] ? ' ' + row[col.name] : ''));
        return;
      }

      const nS = csvMap[dbId];
      const updatedRow = row.slice();

      updatedRow[col.name] = nS.name;
      updatedRow[col.id] = "'" + nS.id;

      for (let k = 0; k < CONFIG.BLOCK_SIZE; k++) {
        updatedRow[col.prevS + k] = row[col.currS + k];
        updatedRow[col.currS + k] = nS.raw[1 + k];
      }

      const valN = nS.raw[13];
      const valO = nS.raw[14];
      if (col.bd >= 0 && isValidValue(valN)) updatedRow[col.bd] = Number(valN);
      if (col.be >= 0 && isValidValue(valO)) updatedRow[col.be] = Number(valO);

      finalData.push(updatedRow);
      processedIds.add(dbId);
    });

    Object.keys(csvMap).forEach(function(id) {
      if (processedIds.has(id)) return;

      const nS = csvMap[id];
      const newRow = new Array(dbHeaders.length).fill('');

      newRow[col.name] = nS.name;
      newRow[col.id] = "'" + nS.id;

      for (let k = 0; k < CONFIG.BLOCK_SIZE; k++) {
        newRow[col.currS + k] = nS.raw[1 + k];
      }

      if (col.dbH !== -1) newRow[col.dbH] = nS.hV;
      if (col.dbL !== -1) newRow[col.dbL] = nS.lV;
      if (col.bLow !== -1) newRow[col.bLow] = nS.lV * (settings['buy_signal_mult'] || 1);
      if (col.bUpp !== -1) newRow[col.bUpp] = nS.lV * (settings['range_upper_mult'] || 1);
      if (col.sLow !== -1) newRow[col.sLow] = nS.hV * (settings['sell_signal_mult'] || 1);
      if (col.sUpp !== -1) newRow[col.sUpp] = nS.hV * (settings['range_lower_mult'] || 1);
      if (col.bStat !== -1) newRow[col.bStat] = '不低於：' + obsDateStr;
      if (col.sStat !== -1) newRow[col.sStat] = '不高於：' + obsDateStr;
      if (col.bDate !== -1) newRow[col.bDate] = obsDateValue;
      if (col.sDate !== -1) newRow[col.sDate] = obsDateValue;

      const valN = nS.raw[13];
      const valO = nS.raw[14];
      if (col.bd >= 0 && isValidValue(valN)) newRow[col.bd] = Number(valN);
      if (col.be >= 0 && isValidValue(valO)) newRow[col.be] = Number(valO);

      finalData.push(newRow);
    });

    dbSheet.clearContents();
    dbSheet.getRange(1, 1, 1, dbHeaders.length).setValues([dbHeaders]);

    if (finalData.length > 0) {
      dbSheet.getRange(2, 1, finalData.length, dbHeaders.length).setValues(finalData);
    }

    SpreadsheetApp.flush();

    applyDbSheetFormatting(dbSheet, dbHeaders);
    updateCalculations(dbSheet);
    updateBuyZoneStatus(dbSheet, metaSheet);

    const deleteMsg = deletedIds.length > 0
      ? '｜已刪除(' + deletedIds.length + ')：' + deletedIds.join('、')
      : '';

    logImport('成功', '資料同步完成且日期已更新' + deleteMsg);
    ss.toast('CSV 匯入完成！' + deleteMsg, '系統通知', 5);

    return {
      success: true,
      deletedIds: deletedIds
    };

  } catch (e) {
    logImport('失敗', e.toString());
    return { success: false, error: e.toString() };
  }
}

function updateCalculations(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colDiff = headers.indexOf('股價差額') + 1;
  const colPct = headers.indexOf('漲跌幅%') + 1;
  const colCurrPrice = headers.indexOf('現-成交') + 1;
  const colPrevPrice = headers.indexOf('前-成交') + 1;

  if (colDiff > 0 && colPct > 0 && colCurrPrice > 0 && colPrevPrice > 0) {
    const cleanVal = function(c) {
      return 'IFERROR(VALUE(REGEXREPLACE(TEXT(R[0]C[' + (c - colDiff) + '], "@"), "[^0-9\\\\.-]", "")), 0)';
    };

    const diffFormula =
      '=IF(OR(R[0]C[' + (colCurrPrice - colDiff) + ']="" , R[0]C[' + (colPrevPrice - colDiff) + ']="" ), "", ' +
      cleanVal(colCurrPrice) + ' - ' + cleanVal(colPrevPrice) + ')';
    sheet.getRange(2, colDiff, lastRow - 1, 1).setFormulaR1C1(diffFormula);

    const pctFormula =
      '=IF(OR(R[0]C[' + (colDiff - colPct) + ']="" , ' + cleanVal(colPrevPrice) + '=0), "", R[0]C[' +
      (colDiff - colPct) + '] / ' + cleanVal(colPrevPrice) + ')';
    sheet.getRange(2, colPct, lastRow - 1, 1).setFormulaR1C1(pctFormula);
    sheet.getRange(2, colPct, lastRow - 1, 1).setNumberFormat('0.00%');
  }
}

function getDbHeaders() {
  return [
    '股票名稱', '股票代號',

    '前-成交', '前-最高', '前-最低', '前-爆量', '前-5MA', '前-10MA', '前-20MA', '前-60MA', '前-市值',
    '現-成交', '現-最高', '現-最低', '現-爆量', '現-5MA', '現-10MA', '現-20MA', '現-60MA', '現-市值',

    '股價差額', '漲跌幅%',

    '支撐1', '支撐2', '支撐3', '支撐4', '支撐5', '支撐6', '支撐7', '支撐8', '支撐9', '支撐10',
    '壓力1', '壓力2', '壓力3', '壓力4', '壓力5', '壓力6', '壓力7', '壓力8', '壓力9', '壓力10',

    '突破次數', '跌破次數', '超級突破次數', '超級跌破次數', '刷新支撐次數', '刷新壓力次數',
    '無波動計數',

    '買入下緣', '買入上緣', '賣出下緣', '賣出上緣',

    '最高', '最低', '6個月最高', '6個月最低',

    '區間買進狀態', '區間賣出狀態', '區間買賣建議', '區間亮點',
    '買進觀察日期', '賣出觀察日期',

    '停利點', '停損點',

    '均線狀況', '均線關鍵',

    '現價5MA乖離', '現價10MA乖離', '現價20MA乖離', '現價60MA乖離',
    '前價5MA乖離', '前價10MA乖離', '前價20MA乖離', '前價60MA乖離',
    '到價通知', '量縮量增'
  ];
}

function applyDbSheetFormatting(dbSheet, headers) {
  if (!dbSheet || !headers || headers.length === 0) return;

  dbSheet.setFrozenRows(1);
  dbSheet.setFrozenColumns(2);

  const maxRows = Math.max(dbSheet.getMaxRows(), 2);

  const colBN = headers.indexOf('均線狀況') + 1;
  const colBO = headers.indexOf('均線關鍵') + 1;
  const awColIdx = headers.indexOf('無波動計數') + 1;

  if (colBN > 0) {
    dbSheet.getRange(1, colBN, maxRows, 1)
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
      .setVerticalAlignment('top');
  }

  if (colBO > 0) {
    dbSheet.getRange(1, colBO, maxRows, 1)
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
      .setVerticalAlignment('top');
  }

  if (awColIdx > 0 && maxRows > 1) {
    dbSheet.getRange(2, awColIdx, maxRows - 1, 1).setNumberFormat('[>=4]0;""');
  }
}

function postRestoreFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName(CONFIG.SHEETS.DB);
  if (!dbSheet) return;

  const values = dbSheet.getDataRange().getValues();
  if (!values || values.length === 0) return;

  const headers = values[0].map(function(h) { return String(h).trim(); });

  applyDbSheetFormatting(dbSheet, headers);
  updateCalculations(dbSheet);

  const metaSheet = ss.getSheetByName(CONFIG.SHEETS.META);
  if (metaSheet) {
    updateBuyZoneStatus(dbSheet, metaSheet);
  }
}