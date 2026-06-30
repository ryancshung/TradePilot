import React, { useState, useEffect } from 'react';
import { api } from '../lib/api/client';
import { ImportLog } from '../lib/types';
import { X, Upload, Download, FileText, Clock } from 'lucide-react';

interface ImportExportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportExportDrawer({ isOpen, onClose, onSuccess }: ImportExportDrawerProps) {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'backup' | 'logs'>('sync');

  const loadLogs = () => {
    api.getImportLogs().then(setLogs);
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportJson = async () => {
    setIsProcessing(true);
    try {
      const res = await api.exportDatabaseBackup();
      const blob = new Blob([res.content], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('匯出資料庫 JSON 失敗');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await api.importDatabaseBackup(text);
        if (res.success) {
          alert(`資料庫還原成功！\n來源系統：${res.meta.sourceAppName}\n版本：${res.meta.sourceAppVersion}`);
          onSuccess();
          loadLogs();
        }
      } catch (err: any) {
        alert('匯入失敗：' + err.message);
      } finally {
        setIsProcessing(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        // 傳真實 CSV 內容給 mock client（mock 只記錄日誌，不實際解析欄位）
        const res = await api.importCsv(text);
        if (res.success) {
          alert('CSV 已記錄。注意：前端 Mock 模式不會實際解析 CSV 欄位，請至 Google Sheets 執行 Apps Script 進行真正同步。');
          onSuccess();
          loadLogs();
        }
      } catch (err: any) {
        alert('CSV 匯入失敗：' + err.message);
      } finally {
        setIsProcessing(false);
        if (e.target) e.target.value = '';
      }
    };
    // 嘗試 UTF-8 讀取，大多數現代匯出為 UTF-8；若出現亂碼請轉檔後重試
    reader.readAsText(file, 'utf-8');
  };

  const handleResetDb = async () => {
    if (!confirm('警告：這將會清除您所有的個股筆記、標籤與修改過的參數，並恢復至系統預設的 Mock 資料狀態。確定要重設嗎？')) return;
    setIsProcessing(true);
    await api.resetDatabase();
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess();
      loadLogs();
      alert('資料庫已重設！');
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      {/* 遮罩背景 */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* 抽屜主體 */}
      <div className="relative w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-xl border-l border-slate-200 dark:border-slate-800 flex flex-col p-6 animate-slide-up">
        {/* 頂部 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2">
            📂 資料同步與備份
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 頁籤 */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 my-4 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex-1 pb-3 text-center transition-colors ${activeTab === 'sync' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-slate-500 dark:text-slate-400'}`}
          >
            CSV 同步說明
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 pb-3 text-center transition-colors ${activeTab === 'backup' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-slate-500 dark:text-slate-400'}`}
          >
            JSON 同步與備份
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 pb-3 text-center transition-colors ${activeTab === 'logs' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-slate-500 dark:text-slate-400'}`}
          >
            系統日誌
          </button>
        </div>

        {/* 內容 */}
        <div className="flex-1 overflow-y-auto py-2">
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="text-xs text-amber-600 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 space-y-2 leading-relaxed">
                <p className="font-bold text-sm flex items-center gap-1">⚠️ 重要邊界限制 (Phase A 流程)</p>
                <p>
                  本系統的 <strong>CSV 檔案解析與指標運算</strong> 高度依賴 Google Sheets (Apps Script) 的運算引擎。
                </p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  前端在此處「選擇 CSV」僅會產生一筆「待處理」系統日誌以供備查，不會實際更新前端股票資料。
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                <h3 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">
                  📥 模擬接收個股 CSV
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  僅用於記錄日誌。如需真正執行數據同步，請至 <strong>Google Sheets 介面</strong> 使用「手動匯入 CSV」選單執行運算。
                </p>

                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl cursor-pointer bg-white dark:bg-slate-900 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-4 text-center">
                        {isProcessing ? '正在同步中...' : '選擇個股 CSV 檔案 (僅供紀錄日誌)'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">此操作不會更新前端股票資料</p>
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleImportCsv}
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="text-xs text-blue-600 bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 space-y-1 leading-relaxed">
                <p className="font-bold text-sm">💡 數據同步指引</p>
                <p>
                  請先在 <strong>Google Sheets 匯入 CSV</strong> 並完成 Apps Script 運算，接著透過試算表工具 <strong>下載/導出 JSON 備份檔</strong>，最後在下方點擊 <strong>「還原系統資料庫」</strong> 匯入此 JSON 檔案。這是將 Sheets 最新數據同步至前端的唯一正式路徑。
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-brand-500" />
                    備份前端資料庫 (JSON)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    將目前網頁中的 stock_db、參數設定、觀察日中繼資料及系統日誌打包下載成單一 JSON 備份檔。
                  </p>
                  <button
                    onClick={handleExportJson}
                    disabled={isProcessing}
                    className="mt-3 w-full bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white rounded-lg p-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    下載資料庫 JSON
                  </button>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-brand-500" />
                    還原系統資料庫 (JSON 數據同步)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    選擇先前從 Google Sheets 導出（或前端備份）的 JSON 檔案。匯入後將覆蓋您目前前端所有的資料庫與參數設定。
                  </p>
                  <label className="mt-3 w-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-950 rounded-lg p-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
                    <FileText className="w-4 h-4 text-slate-400" />
                    {isProcessing ? '正在還原中...' : '選擇 JSON 檔案匯入還原 (數據同步)'}
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImportJson}
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <button
                  onClick={handleResetDb}
                  disabled={isProcessing}
                  className="w-full border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg p-2 text-xs font-semibold transition-colors"
                >
                  💣 重設資料庫 (回歸預設 Mock 資料)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                最新操作日誌
              </h3>
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">無日誌紀錄</p>
                ) : (
                  logs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className="text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.status === '成功' ? 'bg-emerald-500/10 text-emerald-500' :
                          log.status === '待處理' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {log.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                        {log.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
