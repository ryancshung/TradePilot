
/**
 * TradePilot - Stock Data Management System (v4.0 - 整合條件式欄位更新)
 */

const CONFIG = {
  SHEETS: {
    DB: 'stock_db',
    SETTINGS: 'settings',
    META: 'meta',
    LOG: 'import_log'
  },
  // 假設每組資料塊的大小（例如：成交、漲跌等共 9 欄）
  BLOCK_SIZE: 9,
  // 目標欄位定義 (0 基索引)
  COL_INDEX: {
    BD: 55, // 欄位 BD (0-indexed)
    BE: 56  // 欄位 BE (0-indexed)
  }
};

/**
 * 1. 核心匯入入口函數
 */
function importStockCSV(csvContent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName(CONFIG.SHEETS.DB);
  const metaSheet = ss.getSheetByName(CONFIG.SHEETS.META);
  
<truncated 5347 bytes>"}
{"step_index":276,"source":"USER_EXPLICIT","type":"USER_INPUT","status":"DONE","created_at":"2026-05-07T07:29:56Z","content":"<USER_REQUEST>
找不到以下指令碼函式：initSystem
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-05-07T15:29:56+08:00.

The user's current state is as follows:
Active Document: d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
No browser pages are currently open.
</ADDITIONAL_METADATA>"}
{"step_index":278,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:29:56Z","tool_calls":[{"name":"run_command","args":{"CommandLine":""python -c \"import json; f = open(r'C:\\Users\\ryanhung\\.gemini\\antigravity\\brain\\8d9ed907-0103-42d8-b310-664271d3becb\\.system_generated\\logs\\overview.txt', 'r', encoding='utf-8'); [print(line) for line in f if 'function initSystem' in line]\""","Cwd":""d:\\Vibecoding\\TradePilot"","SafeToAutoRun":"true","WaitMsBeforeAsync":"0"}}]}
{"step_index":281,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:30:02Z"}
{"step_index":283,"source":"USER_EXPLICIT","type":"USER_INPUT","status":"DONE","created_at":"2026-05-07T07:30:04Z","content":"<USER_REQUEST>
Continue
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-05-07T15:30:04+08:00.

The user's current state is as follows:
Active Document: d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
No browser pages are currently open.
</ADDITIONAL_METADATA>"}
{"step_index":285,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:30:05Z"}
{"step_index":287,"source":"USER_EXPLICIT","type":"USER_INPUT","status":"DONE","created_at":"2026-05-07T07:30:06Z","content":"<USER_REQUEST>
Continue
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-05-07T15:30:06+08:00.

The user's current state is as follows:
Active Document: d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
No browser pages are currently open.
</ADDITIONAL_METADATA>"}
{"step_index":289,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:30:06Z"}
{"step_index":291,"source":"USER_EXPLICIT","type":"USER_INPUT","status":"DONE","created_at":"2026-05-07T07:30:07Z","content":"<USER_REQUEST>
Continue
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-05-07T15:30:07+08:00.

The user's current state is as follows:
Active Document: d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
No browser pages are currently open.
</ADDITIONAL_METADATA>"}
{"step_index":293,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:30:07Z"}
{"step_index":295,"source":"USER_EXPLICIT","type":"USER_INPUT","status":"DONE","created_at":"2026-05-07T07:30:10Z","content":"<USER_REQUEST>
Continue
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-05-07T15:30:10+08:00.

The user's current state is as follows:
Active Document: d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- d:\Vibecoding\TradePilot\ryan.pub (LANGUAGE_UNSPECIFIED)
No browser pages are currently open.
</ADDITIONAL_METADATA>"}
{"step_index":297,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-07T07:30:10Z","content":"抱歉，因為剛才提供的版本只集中在匯入邏輯，漏掉了系統初始化與選單功能的輔助函式。

以下是 **完整版 (v4.1)**，包含了 `initSystem` (初始化工作表)、`onOpen` (自訂選單)、`updateMetaData` 以及核心的匯入邏輯。請直接**全選覆蓋**目前的 Apps Script 即可：

