
/**
 * TradePilot - Stock Data Management System (v4.2 - 完整整合版)
 * 整合規則：
 * 1. 兩批資料輪替 (Prev <- Curr)
 * 2. 條件更新：CSV N -> BD (Index 55), CSV O -> BE (Index 56)
 * 3. 數值檢查：有數值才寫入，否則保留舊值
 */

const CONFIG = {
  SHEETS: {
    DB: 'stock_db',
    SETTINGS: 'settings',
    META: 'meta',
    LOG: 'import_log'
  },
  BLOCK_SIZE: 9, // 資料塊欄位數 (例如：成交,最高,最低,收盤,量,5MA,10MA,20MA,60MA)
  COL_INDEX: {
    BD: 55, // 目標欄位 BD
    BE: 56  // 目標欄位 BE
  }
};

/**
 * [選單功能] 建立自訂選單
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📈 TradePilot')
    .addItem('1. 系統初始化', 'initSystem')
    .addSeparator()
<truncated 7734 bytes>"}
{"step_index":355,"source":"USER_EXPLICIT","type":"USER_INPUT","status":"DONE","created_at":"2026-05-07T07:37:50Z","content":"<USER_REQUEST>
先不要做前端程式, 先讓我用現在的方式從Google sheet匯入就好
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-05-07T15:37:50+08:00.

The user's current state is as follows:
Active Document: d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
No browser pages are currently open.
</ADDITIONAL_METADATA>"}
{"step_index":359,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:37:50Z","tool_calls":[{"name":"run_command","args":{"CommandLine":""python -c \"import json; f = open(r'C:\\Users\\ryanhung\\.gemini\\antigravity\\brain\\f607a7d3-ffff-4388-a295-8826026b1dbb\\.system_generated\\logs\\overview.txt', 'r', encoding='utf-8'); [print(line) for line in f if 'DriveApp' in line]\""","Cwd":""d:\\Vibecoding\\TradePilot"","SafeToAutoRun":"true","WaitMsBeforeAsync":"0"}}]}
{"step_index":362,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:37:54Z","tool_calls":[{"name":"run_command","args":{"CommandLine":""python -c \"import json; f = open(r'C:\\Users\\ryanhung\\.gemini\\antigravity\\brain\\bf7f777d-7814-48d2-921e-2696fd1c6eb9\\.system_generated\\logs\\overview.txt', 'r', encoding='utf-8'); [print(line) for line in f if 'DriveApp' in line]\""","Cwd":""d:\\Vibecoding\\TradePilot"","SafeToAutoRun":"true","WaitMsBeforeAsync":"0"}}]}
{"step_index":365,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:37:58Z","tool_calls":[{"name":"run_command","args":{"CommandLine":""Get-ChildItem -Path \"C:\\Users\\ryanhung\\.gemini\\antigravity\\brain\" -Recurse -Filter \"overview.txt\" | ForEach-Object { Select-String -Pattern \"DriveApp\" -Path $_.FullName }"","Cwd":""d:\\Vibecoding\\TradePilot"","SafeToAutoRun":"true","WaitMsBeforeAsync":"0"}}]}
{"step_index":368,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:38:01Z"}
{"step_index":370,"source":"USER_EXPLICIT","type":"USER_INPUT","status":"DONE","created_at":"2026-05-07T07:39:29Z","content":"<USER_REQUEST>
Continue
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-05-07T15:39:29+08:00.

The user's current state is as follows:
Active Document: d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
No browser pages are currently open.
</ADDITIONAL_METADATA>"}
{"step_index":372,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:39:29Z","tool_calls":[{"name":"command_status","args":{"CommandId":""8f857828-21fb-41e4-be84-30a8beec2dfc"","WaitDurationSeconds":"5"}}]}
{"step_index":375,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:39:31Z","content":"好的，明白您的意思。我們跳過前端介面，直接更新您現有的 Apps Script 後端邏輯，讓您維持目前的匯入習慣。

以下是針對 **「N 寫入 BD、O 寫入 BE」** 規則更新後的 `Code.gs` 核心程式碼。請直接將對應的部分替換進您目前的指令碼中即可：

### 1. 核心邏輯更新 (請替換 `applyConditionalFields` 與主迴圈邏輯)

在您目前的匯入迴圈中（處理每一列 CSV 資料的地方），請加入以下判斷：

