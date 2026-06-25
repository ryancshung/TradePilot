
function updateBuyZoneStatus(dbSheet, metaSheet) {
  const mv = metaSheet.getRange('B2:B4').getValues();
  const meta交易日 = mv[0][0];
  const meta次交易日 = mv[1][0];
  const meta觀察日 = mv[2][0];

  const tradeDateStr = _fmt(meta交易日);
  const nextDateStr = _fmt(meta次交易日);
  const obsDateStr = _fmt(meta觀察日);

  // 讀取 settings 表的量能閾值，讀不到時 fallback 至原始預設值
  const _ss = SpreadsheetApp.getActiveSpreadsheet();
  const _setSheet = _ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  const _settings = _setSheet ? getSettingsMap(_setSheet) : {};
  const _toSetting = function(key, fallback) {
    const v = Number(_settings[key]);
    return (!isNaN(v) && isFinite(v)) ? v : fallback;
  };
  const volBurstMult   = _toSetting('vol_burst_mult',   1.5);
  const volIncDecMult  = _toSetting('vol_inc_dec_mult',  1.0);
  const volDecMult     = _toSetting('vol_dec_mult',      0.6);

  const sourceRows = dbSheet.getDataRange().getValues();
  if (!sourceRows || sourceRows.length < 2) return;

  const headers = sourceRows[0].map(function(h) { return String(h).trim(); });

  requireHeaders(headers, [
    '前-成交', '現-成交', '現-最高', '現-最低', '股價差額',
    '支撐1', '支撐2', '支撐3', '支撐4', '支撐5', '支撐6', '支撐7', '支撐8', '支撐9', '支撐10',
    '壓力1', '壓力2', '壓力3', '壓力4', '壓力5', '壓力6', '壓力7', '壓力8', '壓力9', '壓力10',
    '突破次數', '跌破次數', '超級突破次數', '超級跌破次數', '刷新支撐次數', '刷新壓力次數', '無波動計數',
    '買入下緣', '買入上緣', '賣出下緣', '賣出上緣',
    '最高', '最低', '6個月最高', '6個月最低',
    '區間買進狀態', '區間賣出狀態',
    '買進觀察日期', '賣出觀察日期',
    '停利點', '停損點',
    '前-5MA', '前-10MA', '前-20MA', '前-60MA',
    '現-5MA', '現-10MA', '現-20MA', '現-60MA',
    '均線狀況', '均線關鍵',
    '現價5MA乖離', '現價10MA乖離', '現價20MA乖離', '現價60MA乖離',
    '前價5MA乖離', '前價10MA乖離', '前價20MA乖離', '前價60MA乖離',
    '到價通知', '量縮量增'
  ]);

  const i = {
    C: headers.indexOf('前-成交'),
    L: headers.indexOf('現-成交'),
    M: headers.indexOf('現-最高'),
    N: headers.indexOf('現-最低'),
    O: headers.indexOf('現-爆量'),
    U: headers.indexOf('股價差額'),

    W: headers.indexOf('支撐1'),
    AF: headers.indexOf('支撐10'),
    AG: headers.indexOf('壓力1'),
    AP: headers.indexOf('壓力10'),

    AQ: headers.indexOf('突破次數'),
    AR: headers.indexOf('跌破次數'),
    AS: headers.indexOf('超級突破次數'),
    AT: headers.indexOf('超級跌破次數'),
    AU: headers.indexOf('刷新支撐次數'),
    AV: headers.indexOf('刷新壓力次數'),
    AW: headers.indexOf('無波動計數'),

    AX: headers.indexOf('買入下緣'),
    AY: headers.indexOf('買入上緣'),
    AZ: headers.indexOf('賣出下緣'),
    BA: headers.indexOf('賣出上緣'),

    BB: headers.indexOf('最高'),
    BC: headers.indexOf('最低'),
    BD: headers.indexOf('6個月最高'),
    BE: headers.indexOf('6個月最低'),

    BF: headers.indexOf('區間買進狀態'),
    BG: headers.indexOf('區間賣出狀態'),
    BJ: headers.indexOf('買進觀察日期'),
    BK: headers.indexOf('賣出觀察日期'),
    BL: headers.indexOf('停利點'),
    BM: headers.indexOf('停損點'),

    prev5: headers.indexOf('前-5MA'),
    prev10: headers.indexOf('前-10MA'),
    prev20: headers.indexOf('前-20MA'),
    prev60: headers.indexOf('前-60MA'),
    curr5: headers.indexOf('現-5MA'),
    curr10: headers.indexOf('現-10MA'),
    curr20: headers.indexOf('現-20MA'),
    curr60: headers.indexOf('現-60MA'),

    maStatus: headers.indexOf('均線狀況'),
    maKey: headers.indexOf('均線關鍵'),

    dCurr5: headers.indexOf('現價5MA乖離'),
    dCurr10: headers.indexOf('現價10MA乖離'),
    dCurr20: headers.indexOf('現價20MA乖離'),
    dCurr60: headers.indexOf('現價60MA乖離'),
    dPrev5: headers.indexOf('前價5MA乖離'),
    dPrev10: headers.indexOf('前價10MA乖離'),
    dPrev20: headers.indexOf('前價20MA乖離'),
    dPrev60: headers.indexOf('前價60MA乖離'),

    priceAlert: headers.indexOf('到價通知'),
    volSignal: headers.indexOf('量縮量增')
  };

  const supportIdxs = [];
  for (let c = i.W; c <= i.AF; c++) supportIdxs.push(c);

  const pressureIdxs = [];
  for (let c = i.AG; c <= i.AP; c++) pressureIdxs.push(c);

  const outputRows = [];

  for (let r = 1; r < sourceRows.length; r++) {
    const sourceRow = sourceRows[r];
    const row = sourceRow.slice();

    const C = _toNum(sourceRow[i.C]);
    const L = _toNum(sourceRow[i.L]);
    const M = _toNum(sourceRow[i.M]);
    const N = _toNum(sourceRow[i.N]);
    const O = _toNum(sourceRow[i.O]);
    const U = _toNum(sourceRow[i.U]);

    const AX = _toNum(sourceRow[i.AX]);
    const AY = _toNum(sourceRow[i.AY]);
    const AZ = _toNum(sourceRow[i.AZ]);
    const BA = _toNum(sourceRow[i.BA]);

    const BB = _toNum(sourceRow[i.BB]);
    const BC = _toNum(sourceRow[i.BC]);
    const BL = _toNum(sourceRow[i.BL]);
    const BM = _toNum(sourceRow[i.BM]);

    const oldBF = String(sourceRow[i.BF] || '').trim();
    const oldBG = String(sourceRow[i.BG] || '').trim();
    const oldBJ = sourceRow[i.BJ];
    const oldBK = sourceRow[i.BK];

    const hasReachedBuyObs = !oldBJ || _dateGte(meta交易日, oldBJ);
    const hasReachedSellObs = !oldBK || _dateGte(meta交易日, oldBK);

    const isGeneralBreak = (N !== null && BC !== null && N < BC);
    const isGeneralBreakout = (M !== null && BB !== null && M > BB);

    const superBreakInfo = _buildSuperBreakInfo(N, sourceRow, supportIdxs, i.BE);
    const isSuperBreak = superBreakInfo.isSuperBreak;
    const superBreakCount = superBreakInfo.count;

    const superBreakoutInfo = _buildSuperBreakoutInfo(M, sourceRow, pressureIdxs, i.BD);
    const isSuperBreakout = superBreakoutInfo.isSuperBreakout;
    const superBreakoutCount = superBreakoutInfo.count;

    const isBreakRebound = (U !== null && U > 0 && isGeneralBreak);
    const isBreakoutPullback = (U !== null && U < 0 && isGeneralBreakout);

    if (true) {
      if (C === null || C === 0) {
        _setBlank(row, i.BF);
        _setValue(row, i.BJ, meta觀察日);
        _setValue(row, i.BF, '不低於：' + obsDateStr);

      } else if (isSuperBreak && isBreakRebound) {
        _setBlank(row, i.BF);
        _setValue(row, i.BJ, meta觀察日);
        _setValue(row, i.BF, '不低於：' + obsDateStr);
        if (i.BC >= 0 && N !== null) row[i.BC] = N;
        superBreakInfo.hitSupportIdxs.forEach(function(idx) { row[idx] = ''; });
        if (superBreakInfo.hitBE && i.BE >= 0 && N !== null) row[i.BE] = N;
        _incCell(row, i.AR, 1);
        _incCell(row, i.AT, superBreakCount);

      } else if (isSuperBreak && !isBreakRebound) {
        _setBlank(row, i.BF);
        _setValue(row, i.BJ, meta觀察日);
        _setValue(row, i.BF, '不低於：' + obsDateStr);
        if (i.BC >= 0 && N !== null) row[i.BC] = N;
        superBreakInfo.hitSupportIdxs.forEach(function(idx) { row[idx] = ''; });
        if (superBreakInfo.hitBE && i.BE >= 0 && N !== null) row[i.BE] = N;
        _clearCells(row, [i.AQ, i.AS]);
        _incCell(row, i.AR, 1);
        _incCell(row, i.AT, superBreakCount);

      } else if (isGeneralBreak && !isSuperBreak && _isBuyWaitBreakoutFormat(oldBF)) {
        _setBlank(row, i.BF);
        _setValue(row, i.BJ, meta觀察日);
        _setValue(row, i.BF, '不低於：' + obsDateStr);
        if (i.BC >= 0 && N !== null) row[i.BC] = N;

      } else if (isGeneralBreak && !isSuperBreak && !isBreakRebound && !_isBuyWaitBreakoutFormat(oldBF)) {
        _setBlank(row, i.BF);
        _setValue(row, i.BJ, meta觀察日);
        _setValue(row, i.BF, '不低於：' + obsDateStr);
        if (i.BC >= 0 && N !== null) row[i.BC] = N;
        _incCell(row, i.AR, 1);
        _clearCells(row, [i.AQ]);

      } else if (isGeneralBreak && !isSuperBreak && isBreakRebound && !_isBuyWaitBreakoutFormat(oldBF)) {
        _setBlank(row, i.BF);
        _setValue(row, i.BJ, meta觀察日);
        _setValue(row, i.BF, '不低於：' + obsDateStr);
        if (i.BC >= 0 && N !== null) row[i.BC] = N;
        _incCell(row, i.AR, 1);

      } else if (L !== null && AY !== null && L > AY) {
        _setBlank(row, i.BF);
        _setValue(row, i.BJ, meta觀察日);
        _setValue(row, i.BF, '突破等待：' + obsDateStr);

        const oldBCValue = _toNum(sourceRow[i.BC]);
        if (oldBCValue !== null) {
          const firstBlankSupport = _findFirstBlankIndex(row, supportIdxs);
          if (firstBlankSupport >= 0) {
            row[firstBlankSupport] = oldBCValue;
          } else {
            const minSupportIdx = _findMinIndexAmongFilled(row, supportIdxs);
            if (minSupportIdx >= 0) row[minSupportIdx] = oldBCValue;
          }
        }

        if (i.BC >= 0 && N !== null) row[i.BC] = N;
        _incCell(row, i.AU, 1);
        _clearCells(row, [i.AV]);

      } else if (
        U !== null && U <= 0 &&
        hasReachedBuyObs &&
        !isGeneralBreak &&
        !isSuperBreak &&
        !_isBuyReadyFormat(oldBF)
      ) {
        _setBlank(row, i.BF);
        _setValue(row, i.BF, '等一長紅');
        _setBlank(row, i.BJ);

      } else if (
        U !== null && U > 0 &&
        L !== null && AX !== null && L < AX &&
        hasReachedBuyObs &&
        !isGeneralBreak &&
        !isSuperBreak &&
        !_isBuyReadyFormat(oldBF)
      ) {
        _setBlank(row, i.BF);
        _setValue(row, i.BF, '等一長紅');
        _setBlank(row, i.BJ);

      } else if (
        !_isBuyReadyFormat(oldBF) &&
        U !== null && U > 0 &&
        L !== null && AX !== null && L > AX &&
        hasReachedBuyObs &&
        AY !== null && L <= AY &&
        !isGeneralBreak &&
        !isSuperBreak
      ) {
        _setBlank(row, i.BF);
        _setBlank(row, i.BJ);
        _setValue(row, i.BF, '可買進：' + nextDateStr + ' (' + _fmtPrice(L) + ')');
      }
    }

    if (true) {
      if (C === null || C === 0) {
        _setBlank(row, i.BG);
        _setValue(row, i.BK, meta觀察日);
        _setValue(row, i.BG, '不高於：' + obsDateStr);

      } else if (isSuperBreakout && isBreakoutPullback) {
        _setBlank(row, i.BG);
        _setValue(row, i.BK, meta觀察日);
        _setValue(row, i.BG, '不高於：' + obsDateStr);
        if (i.BB >= 0 && M !== null) row[i.BB] = M;
        superBreakoutInfo.hitPressureIdxs.forEach(function(idx) { row[idx] = ''; });
        if (superBreakoutInfo.hitBD && i.BD >= 0 && M !== null) row[i.BD] = M;
        _incCell(row, i.AQ, 1);
        _incCell(row, i.AS, superBreakoutCount);

      } else if (isSuperBreakout && !isBreakoutPullback) {
        _setBlank(row, i.BG);
        _setValue(row, i.BK, meta觀察日);
        _setValue(row, i.BG, '不高於：' + obsDateStr);
        if (i.BB >= 0 && M !== null) row[i.BB] = M;
        superBreakoutInfo.hitPressureIdxs.forEach(function(idx) { row[idx] = ''; });
        if (superBreakoutInfo.hitBD && i.BD >= 0 && M !== null) row[i.BD] = M;
        _clearCells(row, [i.AR, i.AT]);
        _incCell(row, i.AQ, 1);
        _incCell(row, i.AS, superBreakoutCount);

      } else if (isGeneralBreakout && !isSuperBreakout && _isSellWaitBreakdownFormat(oldBG)) {
        _setBlank(row, i.BG);
        _setValue(row, i.BK, meta觀察日);
        _setValue(row, i.BG, '不高於：' + obsDateStr);
        if (i.BB >= 0 && M !== null) row[i.BB] = M;

      } else if (isGeneralBreakout && !isSuperBreakout && !isBreakoutPullback && !_isSellWaitBreakdownFormat(oldBG)) {
        _setBlank(row, i.BG);
        _setValue(row, i.BK, meta觀察日);
        _setValue(row, i.BG, '不高於：' + obsDateStr);
        if (i.BB >= 0 && M !== null) row[i.BB] = M;
        _incCell(row, i.AQ, 1);
        _clearCells(row, [i.AR]);

      } else if (isGeneralBreakout && !isSuperBreakout && isBreakoutPullback && !_isSellWaitBreakdownFormat(oldBG)) {
        _setBlank(row, i.BG);
        _setValue(row, i.BK, meta觀察日);
        _setValue(row, i.BG, '不高於：' + obsDateStr);
        if (i.BB >= 0 && M !== null) row[i.BB] = M;
        _incCell(row, i.AQ, 1);

      } else if (L !== null && BA !== null && L < BA) {
        _setBlank(row, i.BG);
        _setValue(row, i.BK, meta觀察日);
        _setValue(row, i.BG, '跌破等待：' + obsDateStr);

        const oldBBValue = _toNum(sourceRow[i.BB]);
        if (oldBBValue !== null) {
          const firstBlankPressure = _findFirstBlankIndex(row, pressureIdxs);
          if (firstBlankPressure >= 0) {
            row[firstBlankPressure] = oldBBValue;
          } else {
            const maxPressureIdx = _findMaxIndexAmongFilled(row, pressureIdxs);
            if (maxPressureIdx >= 0) row[maxPressureIdx] = oldBBValue;
          }
        }

        if (i.BB >= 0 && M !== null) row[i.BB] = M;
        _incCell(row, i.AV, 1);
        _clearCells(row, [i.AU]);

      } else if (
        U !== null && U >= 0 &&
        hasReachedSellObs &&
        !isGeneralBreakout &&
        !isSuperBreakout &&
        !_isSellReadyFormat(oldBG)
      ) {
        _setBlank(row, i.BG);
        _setValue(row, i.BG, '等一長黑');
        _setBlank(row, i.BK);

      } else if (
        U !== null && U < 0 &&
        L !== null && AZ !== null && L > AZ &&
        hasReachedSellObs &&
        !isGeneralBreakout &&
        !isSuperBreakout &&
        !_isSellReadyFormat(oldBG)
      ) {
        _setBlank(row, i.BG);
        _setValue(row, i.BG, '等一長黑');
        _setBlank(row, i.BK);

      } else if (
        !_isSellReadyFormat(oldBG) &&
        U !== null && U < 0 &&
        L !== null && AZ !== null && L < AZ &&
        hasReachedSellObs &&
        BA !== null && L >= BA &&
        !isGeneralBreakout &&
        !isSuperBreakout
      ) {
        _setBlank(row, i.BK);
        _setValue(row, i.BG, '可賣出：' + nextDateStr + ' (' + _fmtPrice(L) + ')');
      }
    }

    const currPrice = _toNum(sourceRow[i.L]);
    const ma5c = _toNum(sourceRow[i.curr5]);
    const ma10c = _toNum(sourceRow[i.curr10]);
    const ma20c = _toNum(sourceRow[i.curr20]);
    const ma60c = _toNum(sourceRow[i.curr60]);

    const prevPrice = _toNum(sourceRow[i.C]);
    const ma5p = _toNum(sourceRow[i.prev5]);
    const ma10p = _toNum(sourceRow[i.prev10]);
    const ma20p = _toNum(sourceRow[i.prev20]);
    const ma60p = _toNum(sourceRow[i.prev60]);

    const bias = function(price, ma) {
      if (price === null || ma === null || ma === 0) return null;
      return (price - ma) / ma;
    };

    const dCurr5v = bias(currPrice, ma5c);
    const dCurr10v = bias(currPrice, ma10c);
    const dCurr20v = bias(currPrice, ma20c);
    const dCurr60v = bias(currPrice, ma60c);
    const dPrev5v = bias(prevPrice, ma5p);
    const dPrev10v = bias(prevPrice, ma10p);
    const dPrev20v = bias(prevPrice, ma20p);
    const dPrev60v = bias(prevPrice, ma60p);

    _setValue(row, i.dCurr5, dCurr5v !== null ? dCurr5v : '');
    _setValue(row, i.dCurr10, dCurr10v !== null ? dCurr10v : '');
    _setValue(row, i.dCurr20, dCurr20v !== null ? dCurr20v : '');
    _setValue(row, i.dCurr60, dCurr60v !== null ? dCurr60v : '');
    _setValue(row, i.dPrev5, dPrev5v !== null ? dPrev5v : '');
    _setValue(row, i.dPrev10, dPrev10v !== null ? dPrev10v : '');
    _setValue(row, i.dPrev20, dPrev20v !== null ? dPrev20v : '');
    _setValue(row, i.dPrev60, dPrev60v !== null ? dPrev60v : '');

    if (i.maStatus >= 0) {
      const hasPrevMa = ma5p !== null || ma10p !== null || ma20p !== null || ma60p !== null;

      if (!hasPrevMa) {
        _setValue(row, i.maStatus, '');
        _setValue(row, i.maKey, '');
      } else {
        const oldBO = i.maKey >= 0 ? String(sourceRow[i.maKey] || '').trim() : '';
        const maState = {
          '5MA': null,
          '10MA': null,
          '20MA': null,
          '60MA': null
        };

        if (oldBO) {
          oldBO.split('\n').forEach(function(part) {
            const s = part.trim();
            if (!s) return;

            const m = s.match(/^(\d{4}\/\d{2}\/\d{2})\s+(突破|跌破)(5MA|10MA|20MA|60MA)$/);
            if (!m) return;

            maState[m[3]] = {
              type: m[2],
              date: m[1]
            };
          });
        }

        [
          { key: '5MA', curr: dCurr5v, prev: dPrev5v },
          { key: '10MA', curr: dCurr10v, prev: dPrev10v },
          { key: '20MA', curr: dCurr20v, prev: dPrev20v },
          { key: '60MA', curr: dCurr60v, prev: dPrev60v }
        ].forEach(function(ma) {
          if (ma.curr === null || ma.prev === null) return;

          let newType = '';
          if (ma.curr > 0 && ma.prev < 0) {
            newType = '突破';
          } else if (ma.curr < 0 && ma.prev > 0) {
            newType = '跌破';
          }

          if (!newType) return;

          maState[ma.key] = {
            type: newType,
            date: nextDateStr
          };
        });

        const bnParts = [];
        const boParts = [];

        ['5MA', '10MA', '20MA', '60MA'].forEach(function(key) {
          const state = maState[key];
          if (!state) return;

          const label = state.type + key;
          bnParts.push(label);
          boParts.push(state.date + ' ' + label);
        });

        _setValue(row, i.maStatus, bnParts.join('\n'));
        _setValue(row, i.maKey, boParts.join('\n'));
      }
    }

    if (i.priceAlert >= 0) {
      let priceAlertText = '';
      if (L !== null && BL !== null && L > BL) {
        priceAlertText = '可停利';
      } else if (L !== null && BM !== null && L < BM) {
        priceAlertText = '可停損';
      }
      _setValue(row, i.priceAlert, priceAlertText);
    }

    if (i.volSignal >= 0) {
      let volSignalText = '';
      if (O !== null) {
        if (O >= volBurstMult) {
          volSignalText = '爆量';
        } else if (O >= volIncDecMult) {
          volSignalText = '量增';
        } else if (O <= volDecMult) {
          volSignalText = '量縮';
        } else if (O < volIncDecMult) {
          volSignalText = '量減';
        }
      }
      _setValue(row, i.volSignal, volSignalText);
    }

    outputRows.push(row);
  }

  if (outputRows.length > 0) {
    dbSheet.getRange(2, 1, outputRows.length, headers.length).setValues(outputRows);

    [
      i.dCurr5, i.dCurr10, i.dCurr20, i.dCurr60,
      i.dPrev5, i.dPrev10, i.dPrev20, i.dPrev60
    ].forEach(function(colIdx) {
      if (colIdx >= 0) {
        dbSheet.getRange(2, colIdx + 1, outputRows.length, 1).setNumberFormat('0.00%');
      }
    });
  }

  applyDbSheetFormatting(dbSheet, headers);
  SpreadsheetApp.getActiveSpreadsheet().toast('區間狀態 / 均線狀況 / 新增通知欄位 更新完成', '系統通知', 3);
}