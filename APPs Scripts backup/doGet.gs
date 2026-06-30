/**
 * TradePilot — GAS Web App Read-Side Endpoint
 * 
 * 部署說明：
 *   1. 將此檔案貼入 Google Sheets Apps Script 專案。
 *   2. 點擊「部署」->「新部署」，選擇類型為「Web 應用程式」。
 *   3. 將「誰有權存取」設定為「任何人」(Anyone)，部署後複製 Web App URL。
 */
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (!action) {
    return jsonResponse({ error: 'Missing action parameter' }, 400);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    if (action === 'getStocks') {
      var sheet = ss.getSheetByName(CONFIG.SHEETS.DB);
      if (!sheet) return jsonResponse({ error: 'Sheet ' + CONFIG.SHEETS.DB + ' not found' }, 404);
      var values = sheet.getDataRange().getValues();
      values = formatDatesInValues(ss, values);
      return jsonResponse({ values: values });
    }
    
    if (action === 'getSettings') {
      var sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
      if (!sheet) return jsonResponse({ error: 'Sheet ' + CONFIG.SHEETS.SETTINGS + ' not found' }, 404);
      var values = sheet.getDataRange().getValues();
      return jsonResponse({ values: values });
    }
    
    if (action === 'getMeta') {
      var sheet = ss.getSheetByName(CONFIG.SHEETS.META);
      if (!sheet) return jsonResponse({ error: 'Sheet ' + CONFIG.SHEETS.META + ' not found' }, 404);
      var values = sheet.getDataRange().getValues();
      values = formatDatesInValues(ss, values);
      return jsonResponse({ values: values });
    }
    
    if (action === 'getImportLogs') {
      var sheet = ss.getSheetByName(CONFIG.SHEETS.LOG);
      if (!sheet) return jsonResponse({ error: 'Sheet ' + CONFIG.SHEETS.LOG + ' not found' }, 404);
      var values = sheet.getDataRange().getValues();
      return jsonResponse({ values: values });
    }

    return jsonResponse({ error: 'Invalid action: ' + action }, 400);
  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}

function formatDatesInValues(ss, values) {
  return values.map(function(row) {
    return row.map(function(cell) {
      if (cell instanceof Date) {
        return Utilities.formatDate(cell, ss.getSpreadsheetTimeZone(), 'yyyy/MM/dd');
      }
      return cell;
    });
  });
}

function jsonResponse(data, status) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
