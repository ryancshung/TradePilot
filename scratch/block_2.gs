
/**
 * 修改選單：加入「匯入股票 CSV」項目
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📈 TradePilot')
    .addItem('系統初始化', 'initSystem')
    .addSeparator()
    .addItem('匯入股票 CSV', 'showImportDialog') // <-- 補上這行
    .addItem('更新 Meta 資訊', 'updateMetaData')
    .addToUi();
}

/**
 * 核心函式：顯示上傳視窗
 */
function showImportDialog() {
  const html = HtmlService.createHtmlOutputFromFile('ImportDialog')
    .setWidth(450)
    .setHeight(300)
    .setTitle('匯入股票 CSV 資料');
  SpreadsheetApp.getUi().showModalDialog(html, '匯入 CSV');
}
