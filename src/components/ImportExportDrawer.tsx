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
    reader.onload = async () => {
      try {
        // 在 mock api 中模擬 CSV 處理
        const res = await api.importCsv('');
        if (res.success) {
          alert('CSV 同步完成 (交易日與觀察日已更新)！');
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
    // 依據 spec 大多為 Big5 CSV，模擬讀取
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
            手動同步 CSV
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 pb-3 text-center transition-colors ${activeTab === 'backup' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-slate-500 dark:text-slate-400'}`}
          >
            JSON 備份/還原
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
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                <h3 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">
                  📥 從個股系統 CSV 同步
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  匯入每日產出的 Big5 編碼股票資料 CSV。系統將會比對股票代號，更新前日與今日收盤、最高、最低、均線等數據，並自動更新「觀察日」與重新判定買賣訊號狀態。
                </p>

                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl cursor-pointer bg-white dark:bg-slate-900 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        {isProcessing ? '正在同步中...' : '選擇個股 CSV 檔案開始同步'}
                      </p>
                      <p className="text-[10px] text-slate-400">大宗 CSV (Big5 / UTF-8)</p>
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

              <div className="text-xs text-amber-500 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                ⚠️ 注意：此為 Mock 互動，匯入 CSV 後會模擬將交易日更新至 2026/06/23 並重新渲染股票列表。
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-brand-500" />
                    備份系統整個資料庫
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    將 stock_db、參數設定、觀察日中繼資料及系統日誌打包下載成單一 JSON 備份檔。
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
                    還原系統資料庫
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    選擇先前匯出的 JSON 檔案。匯入後將覆蓋您目前所有的資料庫設定。
                  </p>
                  <label className="mt-3 w-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-950 rounded-lg p-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
                    <FileText className="w-4 h-4 text-slate-400" />
                    {isProcessing ? '正在還原中...' : '選擇 JSON 備份檔匯入還原'}
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
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.status === '成功' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
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
