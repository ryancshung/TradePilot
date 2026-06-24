
/**
 * TradePilot - Stock Data Management System (v4.5)
 * [完整整合版] 包含：初始化、選單、上傳、輪替、與 N->BD / O->BE 條件更新邏輯
 */

const CONFIG = {
  SHEETS: {
    DB: 'stock_db',
    SETTINGS: 'settings',
    META: 'meta',
    LOG: 'import_log'
  },
  BLOCK_SIZE: 9, // 資料塊欄位數 (成交,最高,最低,收盤,量,5MA,10MA,20MA,60MA)
  COL_INDEX: {
    BD: 55, // 試算表目標欄位 BD (0-indexed = 55)
    BE: 56  // 試算表目標欄位 BE (0-indexed = 56)
  }
};

/**
 * 1. 選單註冊
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📈 TradePilot')
    .addItem('系統初始化', 'initSystem')
    .addSeparator()
<truncated 6502 bytes>"}
{"step_index":389,"source":"USER_EXPLICIT","type":"USER_INPUT","status":"DONE","created_at":"2026-05-07T07:55:06Z","content":"<USER_REQUEST>
我發現匯入的規格跟之前不一樣, 請檢查以下你之前寫的程式碼.  僅加入新的規則就好
"""
/**
 * TradePilot - Stock Data Management System (v3.1 - 修正日期抓取順序與定位)
 */

const CONFIG = {
  SHEETS: {
    DB: 'stock_db',
    SETTINGS: 'settings',
    META: 'meta',
    LOG: 'import_log'
  },
  BLOCK_SIZE: 9 
};

/**
 * 1. 核心同步匯入函數
 */
function importStockCSV(csvContent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName(CONFIG.SHEETS.DB);
  const metaSheet = ss.getSheetByName(CONFIG.SHEETS.META);
  const setSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  
  if (!dbSheet || !metaSheet || !setSheet) {
    SpreadsheetApp.getUi().alert("系統尚未完整初始化，請檢查工作表！");
    return;
  }
  
  try {
    const rows = Utilities.parseCsv(csvContent);
    const hasHeader = isNaN(parseInt(rows[0][0].match(/(\d+[A-Z]?)$/)?.[0]));
    const csvDataRows = hasHeader ? rows.slice(1) : rows;
<truncated 10359 bytes>"}
{"step_index":391,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:55:06Z"}
{"step_index":393,"source":"USER_EXPLICIT","type":"USER_INPUT","status":"DONE","created_at":"2026-05-07T07:55:09Z","content":"<USER_REQUEST>
Continue
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-05-07T15:55:09+08:00.

The user's current state is as follows:
Active Document: d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
No browser pages are currently open.
</ADDITIONAL_METADATA>"}
{"step_index":395,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:55:09Z","content":"好的，沒問題！我會完全保留您提供的 **v3.1 版程式碼結構**（包含 Big5 編碼、Regex 股票名稱解析、Meta 自動更新等），僅在現有的流程中插入 **「N 欄 → 6個月最高(BD)」、「O 欄 → 6個月最低(BE)」** 的條件判斷規則。

### 修改重點：
1.  **Schema 定位**：在 `col` 物件中新增 `bd` 與 `be` 的索引抓取。
2.  **條件寫入**：在「處理現有股票」與「處理新股票」的迴圈中，加入有效數字判定。若 CSV 有值才寫入，否則保留原樣。
3.  **輔助函式**：新增 `isValidValue` 確保判定精準。

以下是更新後的完整程式碼：

