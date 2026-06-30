import React, { useState, useEffect } from 'react';
import { api } from '../lib/api/client';
import { StockData } from '../lib/types';
import StockBoxChart from '../components/StockBoxChart';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  X, 
  Check
} from 'lucide-react';

interface StockDetailPageProps {
  stockId: string;
  onBack: () => void;
}

export default function StockDetailPage({ stockId, onBack }: StockDetailPageProps) {
  const [stock, setStock] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 表單編輯狀態
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.getStockById(stockId).then(data => {
      if (data) {
        setStock(data);
        setTakeProfit(data.takeProfit?.toString() || '');
        setStopLoss(data.stopLoss?.toString() || '');
        setNotes(data.notes || '');
        setTags(data.tags || []);
      }
      setIsLoading(false);
    });
  }, [stockId]);

  if (isLoading) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">找不到該股票數據</p>
        <button onClick={onBack} className="mt-4 text-brand-500 font-semibold flex items-center gap-1 mx-auto">
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>
      </div>
    );
  }

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updated = await api.updateStock(stock.id, {
        takeProfit: takeProfit === '' ? null : parseFloat(takeProfit),
        stopLoss: stopLoss === '' ? null : parseFloat(stopLoss),
        notes: notes,
        tags: tags
      });
      setStock(updated);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (e) {
      console.error(e);
      alert('儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  // 格式化輔助
  const isUp = (stock.price.diff || 0) > 0;
  const isDown = (stock.price.diff || 0) < 0;
  const formatPct = (val: number | null) => {
    if (val === null) return '-';
    const percent = val * 100;
    return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  // 乖離率顏色與百分比轉換
  const renderBiasBar = (bias: number | null) => {
    if (bias === null) return <span className="text-slate-400">-</span>;
    const isPos = bias > 0;
    const absVal = Math.abs(bias * 100).toFixed(2);
    return (
      <div className="flex items-center gap-2 font-mono">
        <span className={`font-semibold ${isPos ? 'text-red-500' : bias < 0 ? 'text-emerald-500' : ''}`}>
          {isPos ? '+' : ''}{absVal}%
        </span>
        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
          <div 
            className={`h-full rounded-full ${isPos ? 'bg-red-500' : 'bg-emerald-500'}`} 
            style={{ width: `${Math.min(parseFloat(absVal) * 5, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 頂部操作與麵包屑 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回股票列表
        </button>
        <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
          股票代號: {stock.id}
        </div>
      </div>

      {/* 區域一：基本資訊 */}
      <div className="dash-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-sans">{stock.name}</h2>
            <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-mono font-bold">
              {stock.id}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
              市值: {stock.price.marketCap ? `${(stock.price.marketCap / 1000).toFixed(1)}B TWD` : '-'}
            </span>
          </div>
          
          {/* 標籤顯示 */}
          <div className="flex flex-wrap gap-1.5">
            {tags.length === 0 ? (
              <span className="text-xs text-slate-400">尚未指派標籤</span>
            ) : (
              tags.map(t => (
                <span key={t} className="px-2.5 py-0.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full text-xs font-semibold">
                  {t}
                </span>
              ))
            )}
          </div>
        </div>

        {/* 右側警示狀態標誌 */}
        <div className="flex items-center gap-3 flex-wrap">
          {stock.volSignal && (
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">量能信號</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                stock.volSignal === '爆量' ? 'bg-red-500/10 text-red-500' :
                stock.volSignal === '量增' ? 'bg-amber-500/10 text-amber-500' :
                stock.volSignal === '量縮' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'
              }`}>
                {stock.volSignal}
              </span>
            </div>
          )}
          
          {stock.priceAlert && (
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">到價觸發</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                stock.priceAlert === '可停利' 
                  ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              }`}>
                {stock.priceAlert}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 區域二：基本價格資訊 */}
        <div className="dash-card lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
            💰 價格與幅度指標
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">今日成交價</span>
              <span className="text-2xl font-black font-mono">{stock.price.currPrice ?? '-'}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">今日漲跌幅</span>
              <span className={`text-xl font-bold font-mono ${isUp ? 'text-red-500' : isDown ? 'text-emerald-500' : ''}`}>
                {formatPct(stock.price.pct)}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs font-semibold">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
              <span className="text-slate-400">昨收價</span>
              <span className="font-mono">{stock.price.prevPrice ?? '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
              <span className="text-slate-400">今日最高 / 最低</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {stock.price.high ?? '-'} / {stock.price.low ?? '-'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850">
              <span className="text-slate-400">昨日最高 / 最低</span>
              <span className="font-mono text-slate-500">
                {stock.price.prevHigh ?? '-'} / {stock.price.prevLow ?? '-'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">6個月最高 / 最低</span>
              <span className="font-mono text-brand-600 dark:text-brand-400">
                {stock.price.halfYearHigh ?? '-'} / {stock.price.halfYearLow ?? '-'}
              </span>
            </div>
          </div>
        </div>

        {/* 區域四：均線分析 */}
        <div className="dash-card lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
            📈 均線乖離與突破信號
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* 乖離率 */}
            <div className="space-y-3">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">今日 vs 昨日 均線乖離率</span>
              <div className="space-y-2 text-xs font-semibold">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">5MA 乖離</span>
                  {renderBiasBar(stock.ma.ma5 ? (stock.price.currPrice! - stock.ma.ma5) / stock.ma.ma5 : null)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">10MA 乖離</span>
                  {renderBiasBar(stock.ma.ma10 ? (stock.price.currPrice! - stock.ma.ma10) / stock.ma.ma10 : null)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">20MA 乖離</span>
                  {renderBiasBar(stock.ma.ma20 ? (stock.price.currPrice! - stock.ma.ma20) / stock.ma.ma20 : null)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">60MA 乖離</span>
                  {renderBiasBar(stock.ma.ma60 ? (stock.price.currPrice! - stock.ma.ma60) / stock.ma.ma60 : null)}
                </div>
              </div>
            </div>

            {/* 均線狀態與關鍵日期 */}
            <div className="space-y-3">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">移動平均訊號狀況</span>
              
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block mb-1">今日均線交叉</span>
                  <div className="text-xs font-bold font-mono whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
                    {stock.ma.status || '無交叉突破'}
                  </div>
                </div>
                
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block mb-1">突破/跌破 歷史紀錄</span>
                  <div className="text-xs font-mono whitespace-pre-line leading-relaxed text-slate-500 dark:text-slate-400">
                    {stock.ma.keyEvents || '無歷史紀錄'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 區域三：箱型區間分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <StockBoxChart stock={stock} />
        </div>
        
        {/* 區域三旁的箱型數據對比與狀態 */}
        <div className="dash-card lg:col-span-1 p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              📋 箱型區間決策數值
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block mb-1">買入下緣 / 上緣</span>
                <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">
                  {stock.zone.buyLowerLimit?.toFixed(2) ?? '-'} / {stock.zone.buyUpperLimit?.toFixed(2) ?? '-'}
                </span>
              </div>
              <div className="bg-rose-500/5 p-3 rounded-lg border border-rose-500/10">
                <span className="text-[9px] text-rose-600 dark:text-rose-400 font-bold block mb-1">賣出下緣 / 上緣</span>
                <span className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">
                  {stock.zone.sellLowerLimit?.toFixed(2) ?? '-'} / {stock.zone.sellUpperLimit?.toFixed(2) ?? '-'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850 font-semibold">
                <span className="text-slate-400">區間買進建議</span>
                <span className="text-slate-700 dark:text-slate-200">{stock.zone.recommendation || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-850 font-semibold">
                <span className="text-slate-400">買進/賣出觀察日期</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {stock.zone.buyObsDate ? stock.zone.buyObsDate : '未設定'} / {stock.zone.sellObsDate ? stock.zone.sellObsDate : '未設定'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">突破/跌破/刷新次數</span>
                <span className="font-mono text-slate-500">
                  {stock.zone.breakoutCount} / {stock.zone.breakdownCount} / {stock.supports.refreshCount}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50 mt-3">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">區間亮點</span>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              {stock.zone.highlight || '本週期無特別亮點。'}
            </p>
          </div>
        </div>
      </div>

      {/* 區域五：分析筆記與自訂設定 (表單編輯) */}
      <div className="dash-card">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
          📝 交易計畫與筆記編輯
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 停利停損點與標籤 */}
            <div className="md:col-span-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold uppercase mb-1.5">
                    自訂停利點 (Take Profit)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="例如: 1050"
                    value={takeProfit}
                    onChange={e => setTakeProfit(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold uppercase mb-1.5">
                    自訂停損點 (Stop Loss)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="例如: 940"
                    value={stopLoss}
                    onChange={e => setStopLoss(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              {/* 標籤編輯器 */}
              <div>
                <label className="block text-xs text-slate-400 font-semibold uppercase mb-1.5">
                  編輯個股標籤
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 min-h-[42px] items-center">
                  {tags.map(t => (
                    <span 
                      key={t} 
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-semibold"
                    >
                      {t}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  
                  <div className="flex items-center flex-1 min-w-[120px]">
                    <input
                      type="text"
                      placeholder="輸入標籤..."
                      value={newTagInput}
                      onChange={e => setNewTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = newTagInput.trim();
                          if (val && !tags.includes(val)) {
                            setTags([...tags, val]);
                            setNewTagInput('');
                          }
                        }
                      }}
                      className="w-full bg-transparent border-none outline-none text-xs px-1 py-0.5"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="p-1 text-slate-400 hover:text-brand-500"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 分析筆記 */}
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 font-semibold uppercase mb-1.5">
                個股分析筆記
              </label>
              <textarea
                placeholder="寫下您對該股的趨勢研判、支撐壓力突破觀察，或是進出場理由..."
                rows={9}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors resize-none font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white rounded-lg px-6 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow hover:shadow-md disabled:opacity-50"
            >
              {isSaving ? '正在儲存...' : (
                <>
                  <Save className="w-4 h-4" />
                  儲存交易計畫
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 儲存成功通知 */}
      {showToast && (
        <div className="fixed top-20 right-6 bg-emerald-500 text-white px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg z-50 animate-fade-in">
          <Check className="w-4 h-4" />
          個股交易計畫已儲存至資料庫！
        </div>
      )}
    </div>
  );
}
