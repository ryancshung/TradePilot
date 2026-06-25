const APP_INFO = {
  APP_NAME: 'TradePilot_StockSystem',
  APP_VERSION: 'v4.5-json-1.2-final-spec+price-vol',
  BACKUP_SCHEMA_VERSION: '1.0.0',
  COMPATIBLE_SCHEMA_VERSIONS: ['1.0.0']
};

const CONFIG = {
  SHEETS: {
    DB: 'stock_db',
    SETTINGS: 'settings',
    META: 'meta',
    LOG: 'import_log'
  },
  BLOCK_SIZE: 9
};

function normalizeStockId(id) {
  let s = String(id || '').trim().replace(/^'/, '');
  if (!s) return '';

  const m = s.match(/^(\d+)([A-Z*]?)$/i);
  if (!m) return s.toUpperCase();

  const numPart = m[1];
  const suffix = (m[2] || '').toUpperCase();
  const normalizedNum = numPart.padStart(5, '0');
  return normalizedNum + suffix;
}

function requireHeaders(headers, requiredNames) {
  const missing = requiredNames.filter(function(name) {
    return headers.indexOf(name) === -1;
  });
  if (missing.length > 0) {
    throw new Error('工作表缺少必要欄位：' + missing.join('、'));
  }
}

function isValidValue(val) {
  if (val === '' || val === null || val === undefined) return false;
  const s = String(val).trim();
  if (s === '') return false;
  const num = Number(s);
  return !isNaN(num) && isFinite(num);
}

function _toNum(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s === '') return null;
  s = s.replace(/[^0-9.\-]/g, '');
  if (s === '') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function _toNumOrZero(v) {
  const n = _toNum(v);
  return n === null ? 0 : n;
}

function toNum(v) {
  return _toNum(v);
}

function toNumOrZero(v) {
  return _toNumOrZero(v);
}

function getSettingsMap(sheet) {
  const data = sheet.getDataRange().getValues();
  const map = {};
  data.forEach(function(row) {
    if (row[0]) map[String(row[0]).trim()] = row[1];
  });
  return map;
}

function updateMetaData(tradeDate, nextDate, obsDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const metaSheet = ss.getSheetByName(CONFIG.SHEETS.META);
  if (!metaSheet) return;

  const data = metaSheet.getDataRange().getValues();
  data.forEach(function(row, idx) {
    const rowNum = idx + 1;
    const label = String(row[0]).trim();
    if (label === '交易日') metaSheet.getRange(rowNum, 2).setValue(tradeDate);
    if (label === '次交易日') metaSheet.getRange(rowNum, 2).setValue(nextDate);
    if (label === '觀察日') metaSheet.getRange(rowNum, 2).setValue(obsDate);
  });
  SpreadsheetApp.flush();
}

function logImport(status, msg) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG);
  if (logSheet) logSheet.appendRow([new Date(), status, msg]);
}

function _fmt(d) {
  if (!d) return '';
  if (d instanceof Date) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return Utilities.formatDate(d, ss.getSpreadsheetTimeZone(), 'yyyy/MM/dd');
  }
  return String(d).trim();
}

function _dateGte(a, b) {
  if (!a || !b) return true;
  const ts = function(v) {
    if (v instanceof Date) return v.getTime();
    const p = String(v).split('/');
    if (p.length === 3) return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
    return new Date(v).getTime();
  };
  return ts(a) >= ts(b);
}

function _isBuyReadyFormat(s) {
  return /^可買進：\d{4}\/\d{2}\/\d{2} \(\d+(\.\d+)?\)$/.test(String(s || '').trim());
}

function _isSellReadyFormat(s) {
  return /^可賣出：\d{4}\/\d{2}\/\d{2} \(\d+(\.\d+)?\)$/.test(String(s || '').trim());
}

function _isBuyWaitBreakoutFormat(s) {
  return /^突破等待：\d{4}\/\d{2}\/\d{2}$/.test(String(s || '').trim());
}

function _isSellWaitBreakdownFormat(s) {
  return /^跌破等待：\d{4}\/\d{2}\/\d{2}$/.test(String(s || '').trim());
}

function _isBuyNotBelowFormat(s) {
  return /^不低於：\d{4}\/\d{2}\/\d{2}$/.test(String(s || '').trim());
}

function _isSellNotAboveFormat(s) {
  return /^不高於：\d{4}\/\d{2}\/\d{2}$/.test(String(s || '').trim());
}

function _fmtPrice(v) {
  const n = _toNum(v);
  if (n === null) return '';
  return String(Number(n.toFixed(4))).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function _setBlank(row, idx) {
  if (idx >= 0) row[idx] = '';
}

function _setValue(row, idx, val) {
  if (idx >= 0) row[idx] = val;
}

function _incCell(row, idx, delta) {
  if (idx >= 0) row[idx] = _toNumOrZero(row[idx]) + delta;
}

function _clearCells(row, idxList) {
  idxList.forEach(function(idx) {
    if (idx >= 0) row[idx] = '';
  });
}

function _findFirstBlankIndex(row, idxList) {
  for (let i = 0; i < idxList.length; i++) {
    const idx = idxList[i];
    if (idx >= 0 && String(row[idx] || '').trim() === '') return idx;
  }
  return -1;
}

function _findMinIndexAmongFilled(row, idxList) {
  let minIdx = -1;
  let minVal = null;
  idxList.forEach(function(idx) {
    const n = _toNum(row[idx]);
    if (n === null) return;
    if (minVal === null || n < minVal) {
      minVal = n;
      minIdx = idx;
    }
  });
  return minIdx;
}

function _findMaxIndexAmongFilled(row, idxList) {
  let maxIdx = -1;
  let maxVal = null;
  idxList.forEach(function(idx) {
    const n = _toNum(row[idx]);
    if (n === null) return;
    if (maxVal === null || n > maxVal) {
      maxVal = n;
      maxIdx = idx;
    }
  });
  return maxIdx;
}

function _buildSuperBreakInfo(nLow, row, supportIdxs, beIdx) {
  const hitSupportIdxs = [];
  let hitCount = 0;
  let hitBE = false;

  if (nLow === null) {
    return {
      isSuperBreak: false,
      count: 0,
      hitSupportIdxs: [],
      hitBE: false
    };
  }

  supportIdxs.forEach(function(idx) {
    const v = _toNum(row[idx]);
    if (v === null) return;
    if (nLow < v) {
      hitSupportIdxs.push(idx);
      hitCount += 1;
    }
  });

  if (beIdx >= 0) {
    const be = _toNum(row[beIdx]);
    if (be !== null && nLow < be) {
      hitBE = true;
      hitCount += 1;
    }
  }

  return {
    isSuperBreak: hitCount > 0,
    count: hitCount,
    hitSupportIdxs: hitSupportIdxs,
    hitBE: hitBE
  };
}

function _buildSuperBreakoutInfo(mHigh, row, pressureIdxs, bdIdx) {
  const hitPressureIdxs = [];
  let hitCount = 0;
  let hitBD = false;

  if (mHigh === null) {
    return {
      isSuperBreakout: false,
      count: 0,
      hitPressureIdxs: [],
      hitBD: false
    };
  }

  pressureIdxs.forEach(function(idx) {
    const v = _toNum(row[idx]);
    if (v === null) return;
    if (mHigh > v) {
      hitPressureIdxs.push(idx);
      hitCount += 1;
    }
  });

  if (bdIdx >= 0) {
    const bd = _toNum(row[bdIdx]);
    if (bd !== null && mHigh > bd) {
      hitBD = true;
      hitCount += 1;
    }
  }

  return {
    isSuperBreakout: hitCount > 0,
    count: hitCount,
    hitPressureIdxs: hitPressureIdxs,
    hitBD: hitBD
  };
}