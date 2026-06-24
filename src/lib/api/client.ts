import { StockData, SystemMeta, SystemSettings, ImportLog } from '../types';
import { INITIAL_STOCKS, INITIAL_SETTINGS, INITIAL_META, INITIAL_LOGS } from './mockData';

export interface ApiClient {
  getStocks(): Promise<StockData[]>;
  getStockById(id: string): Promise<StockData | null>;
  updateStock(id: string, update: Partial<StockData>): Promise<StockData>;
  getSystemMeta(): Promise<SystemMeta>;
  getSettings(): Promise<SystemSettings>;
  updateSettings(settings: SystemSettings): Promise<SystemSettings>;
  getImportLogs(): Promise<ImportLog[]>;
  importCsv(csvContent: string): Promise<{ success: boolean; deletedIds: string[] }>;
  importDatabaseBackup(jsonContent: string): Promise<{ success: boolean; meta: any }>;
  exportDatabaseBackup(): Promise<{ fileName: string; content: string }>;
  resetDatabase(): Promise<void>;
}

const STORAGE_KEYS = {
  STOCKS: 'tradepilot_stocks',
  SETTINGS: 'tradepilot_settings',
  META: 'tradepilot_meta',
  LOGS: 'tradepilot_logs',
};

class MockApiClientImpl implements ApiClient {
  private getStorageItem<T>(key: string, defaultValue: T): T {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }

  private setStorageItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async getStocks(): Promise<StockData[]> {
    return this.getStorageItem<StockData[]>(STORAGE_KEYS.STOCKS, INITIAL_STOCKS);
  }

  async getStockById(id: string): Promise<StockData | null> {
    const stocks = await this.getStocks();
    return stocks.find(s => s.id === id) || null;
  }

  async updateStock(id: string, update: Partial<StockData>): Promise<StockData> {
    const stocks = await this.getStocks();
    const idx = stocks.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('找不到該股票資料');
    
    const updatedStock = { ...stocks[idx], ...update };
    stocks[idx] = updatedStock;
    this.setStorageItem(STORAGE_KEYS.STOCKS, stocks);
    return updatedStock;
  }

  async getSystemMeta(): Promise<SystemMeta> {
    return this.getStorageItem<SystemMeta>(STORAGE_KEYS.META, INITIAL_META);
  }

  async getSettings(): Promise<SystemSettings> {
    return this.getStorageItem<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  async updateSettings(settings: SystemSettings): Promise<SystemSettings> {
    this.setStorageItem(STORAGE_KEYS.SETTINGS, settings);
    
    // 當系統設定被修改時，同步重新計算各股的買入/賣出上下緣以模擬真實後端邏輯
    const stocks = await this.getStocks();
    const updatedStocks = stocks.map(stock => {
      const lowVal = stock.low || 0;
      const highVal = stock.high || 0;
      return {
        ...stock,
        buyLowerLimit: lowVal * settings.buy_signal_mult,
        buyUpperLimit: lowVal * settings.range_upper_mult,
        sellLowerLimit: highVal * settings.sell_signal_mult,
        sellUpperLimit: highVal * settings.range_lower_mult,
      };
    });
    this.setStorageItem(STORAGE_KEYS.STOCKS, updatedStocks);

    return settings;
  }

  async getImportLogs(): Promise<ImportLog[]> {
    return this.getStorageItem<ImportLog[]>(STORAGE_KEYS.LOGS, INITIAL_LOGS);
  }

  async importCsv(_csvContent: string): Promise<{ success: boolean; deletedIds: string[] }> {
    // 模擬 CSV 匯入邏輯
    // 在真實環境中，此功能由 Google Sheets API 計算後寫入，此處我們做模擬更新
    try {
      const logs = await this.getImportLogs();
      const meta = await this.getSystemMeta();

      // 新增一筆記錄
      const newLog: ImportLog = {
        timestamp: new Date().toISOString(),
        status: '成功',
        message: 'CSV 同步匯入成功 (Mock：已更新股票價格並重新計算買賣狀態)'
      };
      
      this.setStorageItem(STORAGE_KEYS.LOGS, [newLog, ...logs]);
      
      // 更新 meta
      const updatedMeta: SystemMeta = {
        ...meta,
        tradeDate: '2026/06/23',
        nextTradeDate: '2026/06/24',
        obsDate: '2026/06/24',
        lastUpdated: new Date().toISOString()
      };
      this.setStorageItem(STORAGE_KEYS.META, updatedMeta);

      return { success: true, deletedIds: [] };
    } catch (e: any) {
      return { success: false, deletedIds: [] };
    }
  }

  async importDatabaseBackup(jsonContent: string): Promise<{ success: boolean; meta: any }> {
    try {
      const data = JSON.parse(jsonContent);
      if (!data.sheets || !data.backup) {
        throw new Error('不合法的備份檔案格式');
      }

      // 還原至 localStorage
      // mock 還原時，我們可以直接讀取資料庫
      if (data.sheets.stock_db) {
        // 在真實備份中，值是二維陣列。我們在此處將其還原為 StockData 結構
        // 為了簡單起見，如果 mock 匯入的備份中有 stocks 直接物件，就用它，否則從 INITIAL_STOCKS 覆蓋
        this.setStorageItem(STORAGE_KEYS.STOCKS, INITIAL_STOCKS);
      }
      
      if (data.sheets.settings) {
        this.setStorageItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
      }

      const logs = await this.getImportLogs();
      const newLog: ImportLog = {
        timestamp: new Date().toISOString(),
        status: '成功',
        message: `已從 JSON 還原整個資料庫｜來源系統=${data.app?.name || '未知'}｜來源版本=${data.app?.version || '未知'}｜schema=${data.backup?.schemaVersion || '1.0.0'}`
      };
      this.setStorageItem(STORAGE_KEYS.LOGS, [newLog, ...logs]);

      return {
        success: true,
        meta: {
          sourceAppName: data.app?.name || 'TradePilot_StockSystem',
          sourceAppVersion: data.app?.version || 'v4.5-mock',
          schemaVersion: data.backup?.schemaVersion || '1.0.0',
          exportedAtLocal: data.backup?.exportedAtLocal || '未知'
        }
      };
    } catch (e: any) {
      const logs = await this.getImportLogs();
      this.setStorageItem(STORAGE_KEYS.LOGS, [{
        timestamp: new Date().toISOString(),
        status: '失敗',
        message: 'JSON 匯入失敗：' + e.toString()
      }, ...logs]);
      throw e;
    }
  }

  async exportDatabaseBackup(): Promise<{ fileName: string; content: string }> {
    const stocks = await this.getStocks();
    const settings = await this.getSettings();
    const meta = await this.getSystemMeta();
    const logs = await this.getImportLogs();

    const payload = {
      app: {
        name: 'TradePilot_StockSystem',
        version: 'v4.5-json-1.2-final-spec+price-vol'
      },
      backup: {
        schemaVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        exportedAtLocal: new Date().toLocaleString(),
      },
      sheets: {
        stock_db: { name: 'stock_db', values: stocks },
        settings: { name: 'settings', values: settings },
        meta: { name: 'meta', values: meta },
        import_log: { name: 'import_log', values: logs }
      }
    };

    const fileName = `TradePilot_StockSystem_v4.5_${new Date().toISOString().replace(/[^\w.-]/g, '_')}.json`;
    return {
      fileName,
      content: JSON.stringify(payload, null, 2)
    };
  }

  async resetDatabase(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.STOCKS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.META);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
  }
}

export const api = new MockApiClientImpl();
