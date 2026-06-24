/**
 * TradePilot - updateBuyZoneStatus()
 * 針對主資料表每一列，更新欄位 BF「區間買進狀態」與 BJ「買進觀察日」
 *
 * 欄位對照（均使用 dbHeaders.indexOf() 動態定位，以下為預期標題名稱）：
 *   C  = 前-成交
 *   L  = 現-成交
 *   M  = 現-最高
 *   N  = 現-最低
 *   U  = 股價差額
 *   AX = 買入下緣
 *   AY = 買入上緣
 *   AZ = 賣出下緣
 *   BA = 賣出上緣
 *   W~AF = 支撐1~10
 *   AG~AP = 壓力1~10
 *   BB = 最高
 *   BC = 最低
 *   BD = 6個月最高
 *   BE = 6個月最低
 *   AQ = 突破次數
 *   AR = 跌破次數
 *   AS = 超級突破次數
 *   AT = 超級跌破次數
 *   AU = 刷新支撐次數
 *   AV = 刷新壓力次數
 *   AW = 無波動計數
 *   BF = 區間買進狀態
 *   BJ = 買進觀察日
 */

// ─── 輔助：日期格式化（Date 或 string → YYYY/MM/DD）─────────────────────────
function _formatDate(d) {
  if (!d) return '';
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${dd}`;
  }
  return String(d).trim();
}

// ─── 輔助：日期比較（a >= b），兩者均接受 Date 或 YYYY/MM/DD 字串 ──────────
function _dateGte(a, b) {
  if (!a || !b) return true; // 空白視為「符合」
  const toTs = v => {
    if (v instanceof Date) return v.getTime();
    // YYYY/MM/DD → Date
    const parts = String(v).split('/');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
    }
    return new Date(v).getTime();
  };
  return toTs(a) >= toTs(b);
}

// ─── 輔助：判斷數值是否有效（非空白、非 null、可轉換為數字）────────────────
function _hasValue(v) {
  if (v === null || v === undefined || v === '') return false;
  const n = Number(v);
  return !isNaN(n);
}

// ─── 輔助：判斷 BF 是否屬於合法格式 ─────────────────────────────────────────
function _isValidBF(bf) {
  if (!bf || String(bf).trim() === '') return false;
  const s = String(bf).trim();
  if (s === '等一長紅') return true;
  if (/^可買進：\d{4}\/\d{2}\/\d{2} \(\d+(\.\d+)?\)$/.test(s)) return true;
  if (/^突破等待：/.test(s)) return true;
  if (/^不低於：/.test(s)) return true;
  return false;
}

// ─── 輔助：判斷 BF 是否為「可買進」格式 ──────────────────────────────────────
function _isBuyable(bf) {
  return /^可買進：\d{4}\/\d{2}\/\d{2} \(\d+(\.\d+)?\)$/.test(String(bf || '').trim());
}

// ─── 輔助：判斷 BF 是否為「突破等待」格式 ────────────────────────────────────
function _isBreakoutWaiting(bf) {
  return /^突破等待：/.test(String(bf || '').trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// 主函式
// ─────────────────────────────────────────────────────────────────────────────
function updateBuyZoneStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName('stock_db');
  const metaSheet = ss.getSheetByName('meta');

  if (!dbSheet || !metaSheet) {
    SpreadsheetApp.getUi().alert('找不到 stock_db 或 meta 工作表！');
    return;
  }

  // ── 讀取 meta 全域參數 ────────────────────────────────────────────────────
  const metaVals = metaSheet.getRange('B2:B4').getValues();
  const meta交易日  = metaVals[0][0]; // B2
  const meta次交易日 = metaVals[1][0]; // B3
  const meta觀察日  = metaVals[2][0]; // B4

  const meta交易日Str  = _formatDate(meta交易日);
  const meta次交易日Str = _formatDate(meta次交易日);
  const meta觀察日Str  = _formatDate(meta觀察日);

  // ── 讀取主資料表全部資料 ──────────────────────────────────────────────────
  const allData   = dbSheet.getDataRange().getValues();
  const headers   = allData[0].map(h => String(h).trim());
  const lastRow   = allData.length;

  // 欄位索引（0-based）
  const iC   = headers.indexOf('前-成交');
  const iL   = headers.indexOf('現-成交');
  const iM   = headers.indexOf('現-最高');
  const iN   = headers.indexOf('現-最低');
  const iU   = headers.indexOf('股價差額');
  const iAX  = headers.indexOf('買入下緣');
  const iAY  = headers.indexOf('買入上緣');
  const iBB  = headers.indexOf('最高');
  const iBC  = headers.indexOf('最低');
  const iBD  = headers.indexOf('6個月最高');
  const iBE  = headers.indexOf('6個月最低');
  const iAQ  = headers.indexOf('突破次數');
  const iAR  = headers.indexOf('跌破次數');
  const iAS  = headers.indexOf('超級突破次數');
  const iAT  = headers.indexOf('超級跌破次數');
  const iAU  = headers.indexOf('刷新支撐次數');
  const iAV  = headers.indexOf('刷新壓力次數');
  const iAW  = headers.indexOf('無波動計數');
  const iBF  = headers.indexOf('區間買進狀態');
  const iBJ  = headers.indexOf('買進觀察日');

  // 支撐 1~10（W:AF）的索引陣列
  const supportColNames = ['支撐1','支撐2','支撐3','支撐4','支撐5',
                           '支撐6','支撐7','支撐8','支撐9','支撐10'];
  const iSupports = supportColNames.map(n => headers.indexOf(n));

  // 壓力 1~10（AG:AP）的索引陣列
  const pressureColNames = ['壓力1','壓力2','壓力3','壓力4','壓力5',
                            '壓力6','壓力7','壓力8','壓力9','壓力10'];
  const iPressures = pressureColNames.map(n => headers.indexOf(n));

  // ── 逐列處理（跳過第 0 列 header）─────────────────────────────────────────
  for (let r = 1; r < lastRow; r++) {
    const row = allData[r];

    // 讀取本列欄位值
    const C  = row[iC];
    const L  = Number(row[iL])  || 0;
    const M  = Number(row[iM])  || 0;
    const N  = Number(row[iN])  || 0;
    const U  = Number(row[iU])  || 0;
    const AX = Number(row[iAX]) || 0;
    const AY = Number(row[iAY]) || 0;
    const BB = Number(row[iBB]) || 0;
    const BC = Number(row[iBC]) || 0;
    const BD = Number(row[iBD]) || 0;
    const BE = Number(row[iBE]) || 0;

    const BF_orig = row[iBF];
    const BJ_orig = row[iBJ];

    // ── 通用條件計算 ─────────────────────────────────────────────────────────

    // 一般跌破：N < BC
    const is一般跌破 = _hasValue(row[iBC]) && N < BC;

    // 超級跌破：N 小於任一有值的支撐1~10 或 BE
    let 超級跌破數量 = 0;
    const 超級跌破支撐Indices = []; // 命中的 iSupports 陣列下標
    let 超級跌破包含BE = false;

    for (let si = 0; si < iSupports.length; si++) {
      const idx = iSupports[si];
      if (idx < 0) continue;
      const v = row[idx];
      if (_hasValue(v) && N < Number(v)) {
        超級跌破數量++;
        超級跌破支撐Indices.push(si);
      }
    }
    if (_hasValue(row[iBE]) && N < BE) {
      超級跌破數量++;
      超級跌破包含BE = true;
    }
    const is超級跌破 = 超級跌破數量 > 0;

    // 跌破反漲：U > 0 且 一般跌破
    const is跌破反漲 = U > 0 && is一般跌破;

    // 一般突破：M > BB
    const is一般突破 = _hasValue(row[iBB]) && M > BB;

    // 超級突破數量
    let 超級突破數量 = 0;
    for (let pi = 0; pi < iPressures.length; pi++) {
      const idx = iPressures[pi];
      if (idx < 0) continue;
      const v = row[idx];
      if (_hasValue(v) && M > Number(v)) 超級突破數量++;
    }
    if (_hasValue(row[iBD]) && M > BD) 超級突破數量++;
    const is超級突破 = 超級突破數量 > 0;

    // 突破反跌：U < 0 且 一般突破
    const is突破反跌 = U < 0 && is一般突破;

    // ── 已達買進觀察日判斷 ────────────────────────────────────────────────────
    const BJ_val = BJ_orig;
    const 已到觀察日 = (!BJ_val || String(BJ_val).trim() === '')
      ? true
      : _dateGte(meta交易日, BJ_val);

    const is不低於 = /^不低於：/.test(String(BF_orig || '').trim());
    const BJ_hasValue = BJ_orig !== null && BJ_orig !== undefined && String(BJ_orig).trim() !== '';
    const 不低於已到期 = is不低於 && BJ_hasValue && _dateGte(meta交易日, BJ_orig);

    // ── 試算表列號（1-based）────────────────────────────────────────────────
    const sheetRow = r + 1; // 資料第 1 列 = 試算表第 2 列

    // ── 規則判斷（if / else if 互斥） ────────────────────────────────────────

    // ───────────────────────────────────────────────────────────
    // 規則一：不低於：觀察日期
    // ───────────────────────────────────────────────────────────
    if (
      !不低於已到期 &&
      // 條件1：C 為空或 0，且 BF 非合法格式
      ((!C || C === '' || Number(C) === 0) && !_isValidBF(BF_orig))
    ) {
      // 動作1
      dbSheet.getRange(sheetRow, iBJ + 1).setValue(meta觀察日);
      dbSheet.getRange(sheetRow, iBF + 1).setValue(`不低於：${meta觀察日Str}`);

    } else if (!不低於已到期 && is超級跌破 && is跌破反漲) {
      // 條件2：超級跌破 && 跌破反漲
      dbSheet.getRange(sheetRow, iBJ + 1).setValue(meta觀察日);
      dbSheet.getRange(sheetRow, iBF + 1).setValue(`不低於：${meta觀察日Str}`);

      // AT += 超級跌破數量
      if (iAT >= 0) {
        const curAT = Number(row[iAT]) || 0;
        dbSheet.getRange(sheetRow, iAT + 1).setValue(curAT + 超級跌破數量);
      }
      // AR += 1
      if (iAR >= 0) {
        const curAR = Number(row[iAR]) || 0;
        dbSheet.getRange(sheetRow, iAR + 1).setValue(curAR + 1);
      }
      // N → BC
      if (iBC >= 0) dbSheet.getRange(sheetRow, iBC + 1).setValue(N);

      // 清除命中的支撐欄位
      for (const si of 超級跌破支撐Indices) {
        const idx = iSupports[si];
        if (idx >= 0) dbSheet.getRange(sheetRow, idx + 1).setValue('');
      }
      // 若包含 BE → N 寫入 BE
      if (超級跌破包含BE && iBE >= 0) {
        dbSheet.getRange(sheetRow, iBE + 1).setValue(N);
      }

    } else if (!不低於已到期 && is超級跌破 && !is跌破反漲) {
      // 條件3：超級跌破 && !跌破反漲
      dbSheet.getRange(sheetRow, iBJ + 1).setValue(meta觀察日);
      dbSheet.getRange(sheetRow, iBF + 1).setValue(`不低於：${meta觀察日Str}`);

      if (iAT >= 0) {
        const curAT = Number(row[iAT]) || 0;
        dbSheet.getRange(sheetRow, iAT + 1).setValue(curAT + 超級跌破數量);
      }
      if (iAR >= 0) {
        const curAR = Number(row[iAR]) || 0;
        dbSheet.getRange(sheetRow, iAR + 1).setValue(curAR + 1);
      }
      if (iBC >= 0) dbSheet.getRange(sheetRow, iBC + 1).setValue(N);

      for (const si of 超級跌破支撐Indices) {
        const idx = iSupports[si];
        if (idx >= 0) dbSheet.getRange(sheetRow, idx + 1).setValue('');
      }
      if (超級跌破包含BE && iBE >= 0) {
        dbSheet.getRange(sheetRow, iBE + 1).setValue(N);
      }
      // 條件3 額外：清除 AQ, AS
      if (iAQ >= 0) dbSheet.getRange(sheetRow, iAQ + 1).setValue('');
      if (iAS >= 0) dbSheet.getRange(sheetRow, iAS + 1).setValue('');

    } else if (!不低於已到期 && is一般跌破 && !is超級跌破 && _isBreakoutWaiting(BF_orig)) {
      // 條件4：一般跌破 && !超級跌破 && BF 原本是突破等待
      dbSheet.getRange(sheetRow, iBJ + 1).setValue(meta觀察日);
      dbSheet.getRange(sheetRow, iBF + 1).setValue(`不低於：${meta觀察日Str}`);
      if (iBC >= 0) dbSheet.getRange(sheetRow, iBC + 1).setValue(N);

    // ───────────────────────────────────────────────────────────
    // 規則二：突破等待：觀察日期
    // ───────────────────────────────────────────────────────────
    } else if (L > AY) {
      dbSheet.getRange(sheetRow, iBJ + 1).setValue(meta觀察日);
      dbSheet.getRange(sheetRow, iBF + 1).setValue(`突破等待：${meta觀察日Str}`);

      // BC → 寫入第一個空白支撐，或取代最小支撐
      if (iBC >= 0) {
        const bcVal = Number(row[iBC]) || 0;
        let firstEmpty = -1;
        let minVal = Infinity;
        let minIdx = -1;
        for (let si = 0; si < iSupports.length; si++) {
          const idx = iSupports[si];
          if (idx < 0) continue;
          const v = row[idx];
          if (!_hasValue(v)) {
            if (firstEmpty < 0) firstEmpty = idx;
          } else {
            const n = Number(v);
            if (n < minVal) { minVal = n; minIdx = idx; }
          }
        }
        if (firstEmpty >= 0) {
          dbSheet.getRange(sheetRow, firstEmpty + 1).setValue(bcVal);
        } else if (minIdx >= 0) {
          dbSheet.getRange(sheetRow, minIdx + 1).setValue(bcVal);
        }
      }

      // N → BC
      if (iBC >= 0) dbSheet.getRange(sheetRow, iBC + 1).setValue(N);
      // AU += 1
      if (iAU >= 0) {
        const curAU = Number(row[iAU]) || 0;
        dbSheet.getRange(sheetRow, iAU + 1).setValue(curAU + 1);
      }
      // 清除 AV
      if (iAV >= 0) dbSheet.getRange(sheetRow, iAV + 1).setValue('');

    // ───────────────────────────────────────────────────────────
    // 規則三：等一長紅
    // ───────────────────────────────────────────────────────────
    } else if (
      U <= 0 &&
      已到觀察日 &&
      L <= AX &&
      !is一般跌破 &&
      !is超級跌破 &&
      !_isBuyable(BF_orig)
    ) {
      dbSheet.getRange(sheetRow, iBJ + 1).setValue('');
      dbSheet.getRange(sheetRow, iBF + 1).setValue('等一長紅');

    // ───────────────────────────────────────────────────────────
    // 規則四：可買進：日期 (價位)
    // ───────────────────────────────────────────────────────────
    } else if (
      !_isBuyable(BF_orig) &&
      U > 0 &&
      L > AX &&
      已到觀察日 &&
      L <= AY &&
      !is一般跌破 &&
      !is超級跌破
    ) {
      dbSheet.getRange(sheetRow, iBJ + 1).setValue('');
      dbSheet.getRange(sheetRow, iBF + 1).setValue(`可買進：${meta次交易日Str} (${L})`);

    }
    // 否則 BF / BJ 不動

  } // end for each row

  SpreadsheetApp.getActiveSpreadsheet().toast('BF / BJ 更新完成', 'TradePilot', 3);
}
