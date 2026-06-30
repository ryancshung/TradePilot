import React, { useState, useEffect } from 'react';
import { api } from '../lib/api/client';
import { SystemSettings } from '../lib/types';
import { X, Check, Wifi, WifiOff, RefreshCw } from 'lucide-react';

const API_PROVIDER_KEY = 'tradepilot_api_provider';
const API_URL_KEY = 'tradepilot_api_url';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function SettingsDrawer({ isOpen, onClose, onSaved }: SettingsDrawerProps) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // API 切換
  const [apiProvider, setApiProvider] = useState<'mock' | 'http'>(
    () => (localStorage.getItem(API_PROVIDER_KEY) as 'mock' | 'http') ?? 'mock'
  );
  const [apiUrl, setApiUrl] = useState<string>(
    () => localStorage.getItem(API_URL_KEY) ?? ''
  );

  useEffect(() => {
    if (isOpen) {
      api.getSettings().then(setSettings);
    }
  }, [isOpen]);

  if (!isOpen || !settings) return null;

  const handleChange = (key: keyof SystemSettings, val: string) => {
    const num = parseFloat(val);
    setSettings(prev => prev ? { ...prev, [key]: isNaN(num) ? 0 : num } : null);
  };

  const handleSave = async (e: React.FormEvent) => {
    preventDefault(e);
    if (!settings) return;

    setIsSaving(true);
    try {
      await api.updateSettings(settings);
      setToastMsg('設定已成功更新，個股區間已重算！');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onSaved();
        onClose();
      }, 800);
    } catch (e: any) {
      console.error(e);
      alert('設定儲存失敗：' + (e?.message ?? String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveApiProvider = () => {
    if (apiProvider === 'http' && !apiUrl.trim()) {
      alert('請輸入有效的 GAS Web App URL');
      return;
    }
    localStorage.setItem(API_PROVIDER_KEY, apiProvider);
    if (apiProvider === 'http') {
      localStorage.setItem(API_URL_KEY, apiUrl.trim());
    } else {
      localStorage.removeItem(API_URL_KEY);
    }
    setToastMsg(apiProvider === 'http' ? '已切換至 GAS API 模式，重新載入後生效' : '已切換至 Mock 模式，重新載入後生效');
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      window.location.reload();
    }, 1200);
  };

  function preventDefault(e: React.FormEvent) {
    e.preventDefault();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* 遮罩背景 */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* 抽屜主體 */}
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-xl border-l border-slate-200 dark:border-slate-800 flex flex-col p-6 animate-slide-up">
        {/* 頂部標題 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2">
            ⚙️ 系統參數設定
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 參數編輯表單 */}
        <form onSubmit={handleSave} className="flex-1 py-6 space-y-5 overflow-y-auto pr-1">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                區間上緣倍數 (rangeUpperMult)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.rangeUpperMult}
                onChange={e => handleChange('rangeUpperMult', e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">計算買入上緣：最低價 × 區間上緣倍數 (預設 1.10)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                區間下緣倍數 (rangeLowerMult)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.rangeLowerMult}
                onChange={e => handleChange('rangeLowerMult', e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">計算賣出上緣：最高價 × 區間下緣倍數 (預設 0.90)</p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                買進訊號倍數 (buySignalMult)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.buySignalMult}
                onChange={e => handleChange('buySignalMult', e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">計算買入下緣：最低價 × 買訊倍數 (預設 1.03)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                賣出訊號倍數 (sellSignalMult)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.sellSignalMult}
                onChange={e => handleChange('sellSignalMult', e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">計算賣出下緣：最高價 × 賣訊倍數 (預設 0.97)</p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  爆量倍數
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.volBurstMult}
                  onChange={e => handleChange('volBurstMult', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-sm outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  量增倍數
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.volIncDecMult}
                  onChange={e => handleChange('volIncDecMult', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-sm outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* 儲存按鈕 */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white rounded-lg p-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isSaving ? '儲存中...' : (
                <>
                  <Check className="w-4 h-4" />
                  儲存參數並重算
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 rounded-lg p-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              取消
            </button>
          </div>

          {/* ── 資料來源設定 ── */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              {apiProvider === 'http' ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-slate-400" />}
              資料來源
            </h3>

            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setApiProvider('mock')}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  apiProvider === 'mock'
                    ? 'bg-brand-600 text-white'
                    : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Mock (本地)
              </button>
              <button
                type="button"
                onClick={() => setApiProvider('http')}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  apiProvider === 'http'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                GAS API
              </button>
            </div>

            {apiProvider === 'http' && (
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                  GAS Web App URL
                </label>
                <input
                  type="url"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2 text-xs outline-none focus:border-emerald-400 transition-colors font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  貼上 GAS 部署後的 Web App 執行網址。部署時「誰有權存取」需設為「任何人」。
                </p>
              </div>
            )}

            {apiProvider === 'mock' && (
              <p className="text-[11px] text-slate-400 leading-relaxed">
                目前使用本地 localStorage 作為資料來源（Mock 模式）。JSON 手動備份還原流程維持正常可用。
              </p>
            )}

            <button
              type="button"
              onClick={handleSaveApiProvider}
              className="w-full flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg p-2 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              套用並重新載入
            </button>
          </div>
        </form>

        {/* 儲存成功通知 */}
        {showToast && (
          <div className="absolute top-4 left-4 right-4 bg-emerald-500 text-white p-3 rounded-lg text-sm text-center shadow-lg font-semibold flex items-center justify-center gap-1.5 animate-fade-in">
            <Check className="w-4 h-4" />
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}
