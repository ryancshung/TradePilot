/**
 * TradePilot — Backup JSON Schema & Validation (v1)
 *
 * 對應 APPcode.gs 的 getDatabaseBackupPayload() 輸出格式
 * 與 importDatabaseJson() 的驗證邏輯。
 *
 * Schema 版本：1.0.0
 * 相容版本：['1.0.0']
 */

// ─────────────────────────────────────────────
// Backup JSON 結構型別
// ─────────────────────────────────────────────

/** APP_INFO 區塊 */
export interface BackupAppBlock {
  /** APP_INFO.APP_NAME：'TradePilot_StockSystem' */
  name: string;
  /** APP_INFO.APP_VERSION */
  version: string;
}

/** backup 元資料區塊 */
export interface BackupMetaBlock {
  /** 備份 schema 版本，目前固定 '1.0.0' */
  schemaVersion: string;
  /** ISO 8601 匯出時間（UTC） */
  exportedAt: string;
  /** 本地時間字串，格式 yyyy/MM/dd HH:mm:ss */
  exportedAtLocal: string;
  /** Google Spreadsheet ID */
  spreadsheetId: string;
  /** Spreadsheet 名稱 */
  spreadsheetName: string;
  /** 時區（Session.getScriptTimeZone()） */
  timezone: string;
}

/** 備份統計摘要 */
export interface BackupSummaryBlock {
  /** 包含的工作表數量 */
  totalSheets: number;
  /** 所有工作表資料列總數（不含 header） */
  totalRows: number;
}

/** 單一工作表的備份資料 */
export interface BackupSheetData {
  /** 工作表名稱 */
  name: string;
  /** 包含 header 的總列數 */
  rowCount: number;
  /** 欄數 */
  colCount: number;
  /** getValues() 回傳的二維陣列，含 header 第一列 */
  values: unknown[][];
}

/**
 * 備份包含的工作表名稱集合。
 * 對應 APPcode.gs getDatabaseBackupPayload() 固定備份的 4 個工作表。
 */
export type BackupSheetName = 'stock_db' | 'settings' | 'meta' | 'import_log';

/** 備份 JSON 最上層結構（完整格式） */
export interface BackupPayload {
  app: BackupAppBlock;
  backup: BackupMetaBlock;
  summary: BackupSummaryBlock;
  /**
   * key 為工作表名稱（BackupSheetName），
   * value 為該工作表的備份資料。
   */
  sheets: Partial<Record<BackupSheetName, BackupSheetData>>;
}

// ─────────────────────────────────────────────
// Schema 版本常數
// ─────────────────────────────────────────────

/** 目前寫出的 schema 版本，對應 Core.gs BACKUP_SCHEMA_VERSION */
export const CURRENT_SCHEMA_VERSION = '1.0.0' as const;

/**
 * 可接受匯入的版本列表，對應 Core.gs COMPATIBLE_SCHEMA_VERSIONS。
 * 新增欄位（向後相容）不需升版；重命名或刪除欄位才需要升版。
 */
export const COMPATIBLE_SCHEMA_VERSIONS: readonly string[] = ['1.0.0'];

// ─────────────────────────────────────────────
// Validation 結果型別
// ─────────────────────────────────────────────

export type ValidationResult =
  | { ok: true; payload: BackupPayload }
  | { ok: false; error: string };

// ─────────────────────────────────────────────
// Validation 函數
// ─────────────────────────────────────────────

/**
 * 驗證 JSON 字串是否為合法的 BackupPayload。
 *
 * 對應 importDatabaseJson() 的驗證邏輯，但為純函數、不依賴 GAS API。
 * 可在 GAS 外部（如前端 mock / unit test）單獨使用。
 */
export function validateBackupJson(jsonText: string): ValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return { ok: false, error: 'JSON 解析失敗：' + String(e) };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'JSON 格式不正確，頂層必須是物件。' };
  }

  const obj = parsed as Record<string, unknown>;

  // 必要區塊存在性
  if (!obj.sheets || typeof obj.sheets !== 'object') {
    return { ok: false, error: 'JSON 格式不正確，找不到 sheets 資料。' };
  }

  // schemaVersion 驗證
  const backup = obj.backup as Record<string, unknown> | undefined;
  const schemaVersion =
    backup?.schemaVersion != null ? String(backup.schemaVersion).trim() : '';

  if (!schemaVersion) {
    return { ok: false, error: '此備份檔缺少 schemaVersion，無法確認版本相容性。' };
  }

  if (!COMPATIBLE_SCHEMA_VERSIONS.includes(schemaVersion)) {
    return {
      ok: false,
      error:
        `備份檔 schemaVersion=${schemaVersion}，` +
        `與目前程式可接受版本（${COMPATIBLE_SCHEMA_VERSIONS.join(', ')}）不相容。`,
    };
  }

  return { ok: true, payload: parsed as BackupPayload };
}

/**
 * 從 BackupPayload 中取得指定工作表資料。
 * 若不存在則回傳 null（不拋錯，讓呼叫端決定如何處理）。
 */
export function getSheetFromPayload(
  payload: BackupPayload,
  sheetName: BackupSheetName
): BackupSheetData | null {
  return payload.sheets[sheetName] ?? null;
}

/**
 * 驗證單一 BackupSheetData 是否包含有效資料。
 */
export function isValidSheetData(data: BackupSheetData | null): data is BackupSheetData {
  return (
    data !== null &&
    Array.isArray(data.values) &&
    data.values.length > 0 &&
    Array.isArray(data.values[0])
  );
}

/**
 * 從 BackupPayload 中提取來源資訊（顯示用）。
 */
export function extractBackupInfo(payload: BackupPayload): {
  sourceAppName: string;
  sourceAppVersion: string;
  schemaVersion: string;
  exportedAtLocal: string;
} {
  return {
    sourceAppName: payload.app?.name ?? '未知系統',
    sourceAppVersion: payload.app?.version ?? '未知版本',
    schemaVersion: payload.backup?.schemaVersion ?? '',
    exportedAtLocal: payload.backup?.exportedAtLocal ?? '未知時間',
  };
}

// ─────────────────────────────────────────────
// 工作表名稱常數（對應 Core.gs CONFIG.SHEETS）
// ─────────────────────────────────────────────

export const SHEET_NAMES = {
  DB: 'stock_db' as BackupSheetName,
  SETTINGS: 'settings' as BackupSheetName,
  META: 'meta' as BackupSheetName,
  LOG: 'import_log' as BackupSheetName,
} as const;

/** getDatabaseBackupPayload() 固定備份的工作表順序 */
export const BACKUP_SHEET_ORDER: readonly BackupSheetName[] = [
  SHEET_NAMES.DB,
  SHEET_NAMES.SETTINGS,
  SHEET_NAMES.META,
  SHEET_NAMES.LOG,
];
