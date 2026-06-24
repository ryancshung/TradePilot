
/**
 * TradePilot - Stock Data Management System (v4.3)
 * 更新規則：
 * 1. 兩批資料自動輪替 (Prev <- Curr)
 * 2. 條件更新：CSV N -> BD (Index 55), CSV O -> BE (Index 56)
 * 3. 數值保護：CSV 為空時保留原有值，不覆蓋。
 */

const CONFIG = {
  SHEETS: {
    DB: 'stock_db',
    META: 'meta',
    LOG: 'import_log'
  },
  BLOCK_SIZE: 9, // 資料塊欄位數
  COL_INDEX: {
    BD: 55, // 試算表第 56 欄 (BD)
    BE: 56  // 試算表第 57 欄 (BE)
  }
};

/**
 * [選單]
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📈 TradePilot')
    .addItem('1. 系統初始化', 'initSystem')
    .addSeparator()
<truncated 4769 bytes>"}
{"step_index":383,"source":"USER_EXPLICIT","type":"USER_INPUT","status":"DONE","created_at":"2026-05-07T07:49:53Z","content":"<USER_REQUEST>
找不到以下指令碼函式：showImportDialog
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-05-07T15:49:53+08:00.

The user's current state is as follows:
Active Document: d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
No browser pages are currently open.
</ADDITIONAL_METADATA>"}
{"step_index":385,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:49:53Z","content":"對不起，我會錯意了。既然您原本的流程是點擊選單後會觸發 `showImportDialog`（顯示上傳視窗），那我應該將這個函式保留，僅更新它背後的處理邏輯。

請使用這個 **包含 `showImportDialog` 的完整版本**，這樣您的選單就不會報錯了：

### 1. `Code.gs` (後端邏輯)

