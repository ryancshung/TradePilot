import { useState, useMemo } from 'react';
import { StockData, SystemMeta } from '../lib/types';
import { api } from '../lib/api/client';
import SettingsDrawer from '../components/SettingsDrawer';
import ImportExportDrawer from '../components/ImportExportDrawer';
import TagManager from '../components/TagManager';
import { 
  Search, 
  SlidersHorizontal, 
  Database, 
  Tags, 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown
} from 'lucide-react';

interface StockListPageProps {
  stocks: StockData[];
  meta: SystemMeta | null;
  onSelectStock: (id: string) => void;
  onRefresh: () => void;
}

type SortField = keyof StockData | '';
type SortOrder = 'asc' | 'desc';

export default function StockListPage({ stocks, meta, onSelectStock, onRefresh }: StockListPageProps) {
  // UI 抽屜狀態
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  // 篩選與搜尋狀態
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // 排序狀態
  const [sortField, setSortField] = useState<SortField>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // 取出所有現有的標籤 (用於篩選列與標籤管理)
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    stocks.forEach(s => {
      if (s.tags) s.tags.forEach(t => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [stocks]);

  // 全域新增/刪除標籤 (模擬)
  const handleAddTag = async (tag: string) => {
    // 隨意挑選第一支股票加上該標籤作為模擬
    if (stocks.length > 0) {
      const stock = stocks[0];
      const updatedTags = Array.from(new Set([...(stock.tags || []), tag]));
      await api.updateStock(stock.id, { tags: updatedTags });
      onRefresh();
    }
  };

  const handleDeleteTag = async (tag: string) => {
    // 將所有包含此標籤的股票標籤移除
    for (const stock of stocks) {
      if (stock.tags && stock.tags.includes(tag)) {
        const updatedTags = stock.tags.filter(t => t !== tag);
        await api.updateStock(stock.id, { tags: updatedTags });
      }
    }
    onRefresh();
  };

  // 排序處理
  const handleSort = (field: keyof StockData) => {
    if (sortField === field) {
      setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc'); // 預設降序 (大到小較符合看盤直覺)
    }
  };

  // 過濾後的股票清單
  const filteredStocks = useMemo(() => {
    return stocks
      .filter(s => {
        const matchesSearch = 
          s.id.includes(searchQuery) || 
          s.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesTag = selectedTag === '' || (s.tags && s.tags.includes(selectedTag));
        
        return matchesSearch && matchesTag;
      })
      .sort((a, b) => {
        if (!sortField) return 0;

        let aVal = a[sortField];
        let bVal = b[sortField];

        // 處理 null/undefined
        if (aVal === null || aVal === undefined) return sortOrder === 'asc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return sortOrder === 'asc' ? -1 : 1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
  }, [stocks, searchQuery, selectedTag, sortField, sortOrder]);

  // 統計資訊
  const stats = useMemo(() => {
    let buyReady = 0;
    let sellReady = 0;
    stocks.forEach(s => {
      if (s.buyZoneStatus?.startsWith('可買進')) buyReady++;
      if (s.sellZoneStatus?.startsWith('可賣出')) sellReady++;
    });
    return { total: stocks.length, buyReady, sellReady };
  }, [stocks]);

  // 格式化百分比
  const formatPct = (val: number | null) => {
    if (val === null) return '-';
    const percent = val * 100;
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  // 格式化貨幣/數字
  const formatNum = (val: number | null, fractionDigits = 2) => {
    if (val === null) return '-';
    return val.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
  };

  return (
    <div className="space-y-6">
      {/* 頂部統計指標面板 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="dash-card flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">個股總數</span>
          <span className="text-3xl font-bold font-sans mt-2">{stats.total} <span className="text-xs font-normal text-slate-500">檔</span></span>
        </div>
        <div className="dash-card flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-emerald-600 dark:text-emerald-400">買入訊號檔數</span>
          <span className="text-3xl font-bold font-sans mt-2 text-emerald-600 dark:text-emerald-400">{stats.buyReady} <span className="text-xs font-normal text-slate-500">檔</span></span>
        </div>
        <div className="dash-card flex flex-col justify-between border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-rose-600 dark:text-rose-400">賣出訊號檔數</span>
          <span className="text-3xl font-bold font-sans mt-2 text-rose-600 dark:text-rose-400">{stats.sellReady} <span className="text-xs font-normal text-slate-500">檔</span></span>
        </div>
        <div className="dash-card flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">觀察日</span>
          <span className="text-lg font-bold font-mono mt-3">{meta?.obsDate || '-'}</span>
        </div>
      </div>

      {/* 控制列 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* 搜尋與過濾 */}
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋股票代號或名稱..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          
          <div className="relative">
            <select
              value={selectedTag}
              onChange={e => setSelectedTag(e.target.value)}
              className="w-full sm:w-48 appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm outline-none focus:border-brand-500 transition-colors cursor-pointer"
            >
              <option value="">所有標籤</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* 系統操作按鈕 */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTagManagerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
            title="標籤管理"
          >
            <Tags className="w-4 h-4 text-slate-400" />
            標籤管理
          </button>
          <button
            onClick={() => setIsImportExportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            <Database className="w-4 h-4 text-slate-400" />
            同步備份
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            參數設定
          </button>
        </div>
      </div>

      {/* 資料列表表格 (工具型高密度 Dashboard) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full max-h-[62vh]">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold border-b border-slate-200 dark:border-slate-700 z-10">
              <tr>
                {/* 凍結欄位: 代號與名稱 */}
                <th className="sticky left-0 bg-slate-100 dark:bg-slate-800 px-4 py-3.5 w-32 border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none hover:text-brand-500 transition-colors z-20" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-1">代號 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="sticky left-32 bg-slate-100 dark:bg-slate-800 px-4 py-3.5 w-36 border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none hover:text-brand-500 transition-colors z-20" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">股票名稱 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                
                {/* 可滾動欄位 */}
                <th className="px-4 py-3.5 w-28 cursor-pointer select-none hover:text-brand-500 transition-colors" onClick={() => handleSort('currPrice')}>
                  <div className="flex items-center gap-1 justify-end">現價 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-4 py-3.5 w-24 cursor-pointer select-none hover:text-brand-500 transition-colors" onClick={() => handleSort('diff')}>
                  <div className="flex items-center gap-1 justify-end">漲跌 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-4 py-3.5 w-24 cursor-pointer select-none hover:text-brand-500 transition-colors" onClick={() => handleSort('pct')}>
                  <div className="flex items-center gap-1 justify-end">幅度 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-4 py-3.5 w-24 cursor-pointer select-none hover:text-brand-500 transition-colors" onClick={() => handleSort('high')}>
                  <div className="flex items-center gap-1 justify-end">最高 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-4 py-3.5 w-24 cursor-pointer select-none hover:text-brand-500 transition-colors" onClick={() => handleSort('low')}>
                  <div className="flex items-center gap-1 justify-end">最低 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-4 py-3.5 w-44 cursor-pointer select-none hover:text-brand-500 transition-colors" onClick={() => handleSort('buyZoneStatus')}>
                  <div className="flex items-center gap-1">區間買進狀態 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-4 py-3.5 w-44 cursor-pointer select-none hover:text-brand-500 transition-colors" onClick={() => handleSort('sellZoneStatus')}>
                  <div className="flex items-center gap-1">區間賣出狀態 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-4 py-3.5 w-48 cursor-pointer select-none hover:text-brand-500 transition-colors" onClick={() => handleSort('recommendation')}>
                  <div className="flex items-center gap-1">區間買賣建議 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-4 py-3.5 w-44 cursor-pointer select-none hover:text-brand-500 transition-colors" onClick={() => handleSort('highlight')}>
                  <div className="flex items-center gap-1">區間亮點 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-4 py-3.5 w-44">均線狀況</th>
                <th className="px-4 py-3.5 w-44">均線關鍵</th>
                <th className="px-4 py-3.5 w-28 cursor-pointer select-none hover:text-brand-500 transition-colors" onClick={() => handleSort('volSignal')}>
                  <div className="flex items-center gap-1">量縮量增 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-4 py-3.5 w-28 cursor-pointer select-none hover:text-brand-500 transition-colors" onClick={() => handleSort('priceAlert')}>
                  <div className="flex items-center gap-1">到價通知 <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-4 py-3.5 w-36 cursor-pointer select-none hover:text-brand-500 transition-colors" onClick={() => handleSort('marketCap')}>
                  <div className="flex items-center gap-1 justify-end">市值 (百萬) <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={16} className="text-center py-10 text-slate-400">
                    找不到符合條件的股票資料
                  </td>
                </tr>
              ) : (
                filteredStocks.map((stock) => {
                  const isUp = (stock.diff || 0) > 0;
                  const isDown = (stock.diff || 0) < 0;
                  
                  return (
                    <tr 
                      key={stock.id} 
                      className="table-row-hover cursor-pointer"
                      onClick={() => onSelectStock(stock.id)}
                    >
                      {/* 凍結欄位 */}
                      <td className="sticky left-0 bg-white dark:bg-slate-900 px-4 py-3 border-r border-slate-100 dark:border-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 z-10">
                        {stock.id}
                      </td>
                      <td className="sticky left-32 bg-white dark:bg-slate-900 px-4 py-3 border-r border-slate-100 dark:border-slate-800 font-semibold z-10 truncate">
                        <div className="flex flex-col gap-1">
                          <span>{stock.name}</span>
                          <div className="flex flex-wrap gap-1">
                            {stock.tags?.map(t => (
                              <span key={t} className="px-1 py-0.2 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded text-[9px] scale-95 origin-left">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* 可滾動欄位 */}
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {formatNum(stock.currPrice, 2)}
                      </td>
                      
                      <td className={`px-4 py-3 text-right font-mono font-bold ${isUp ? 'text-red-500' : isDown ? 'text-emerald-500' : ''}`}>
                        <div className="flex items-center justify-end gap-0.5">
                          {isUp && <TrendingUp className="w-3 h-3" />}
                          {isDown && <TrendingDown className="w-3 h-3" />}
                          {formatNum(stock.diff, 2)}
                        </div>
                      </td>
                      
                      <td className={`px-4 py-3 text-right font-mono font-bold ${isUp ? 'text-red-500' : isDown ? 'text-emerald-500' : ''}`}>
                        {formatPct(stock.pct)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">
                        {formatNum(stock.high, 2)}
                      </td>
                      
                      <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">
                        {formatNum(stock.low, 2)}
                      </td>

                      {/* 買進狀態 */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded font-semibold text-[10px] ${
                          stock.buyZoneStatus?.startsWith('可買進') 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {stock.buyZoneStatus || '-'}
                        </span>
                      </td>

                      {/* 賣出狀態 */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded font-semibold text-[10px] ${
                          stock.sellZoneStatus?.startsWith('可賣出') 
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {stock.sellZoneStatus || '-'}
                        </span>
                      </td>

                      <td className="px-4 py-3 truncate max-w-xs" title={stock.recommendation}>
                        {stock.recommendation || '-'}
                      </td>

                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 truncate max-w-xs" title={stock.highlight}>
                        {stock.highlight || '-'}
                      </td>

                      <td className="px-4 py-3 font-mono whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-300">
                        {stock.maStatus || '-'}
                      </td>

                      <td className="px-4 py-3 font-mono whitespace-pre-line leading-relaxed text-slate-500 dark:text-slate-400">
                        {stock.maKey || '-'}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          stock.volSignal === '爆量' ? 'bg-red-500/20 text-red-500' :
                          stock.volSignal === '量增' ? 'bg-amber-500/20 text-amber-500' :
                          stock.volSignal === '量縮' ? 'bg-blue-500/20 text-blue-500' :
                          stock.volSignal === '量減' ? 'bg-slate-500/20 text-slate-500' : 'bg-transparent text-slate-400'
                        }`}>
                          {stock.volSignal || '-'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {stock.priceAlert ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            stock.priceAlert === '可停利' 
                              ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                          }`}>
                            {stock.priceAlert}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">
                        {formatNum(stock.marketCap, 0)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* 表格底部中繼資訊列 */}
        <div className="bg-slate-50 dark:bg-slate-800/40 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <div>
            顯示 {filteredStocks.length} 檔個股，共計 {stocks.length} 檔
          </div>
          <div>
            最後更新：{meta?.lastUpdated ? new Date(meta.lastUpdated).toLocaleString() : '-'}
          </div>
        </div>
      </div>

      {/* 浮出元件面板 */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={onRefresh}
      />

      <ImportExportDrawer
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onSuccess={onRefresh}
      />

      <TagManager
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        allTags={allTags}
        onAddTag={handleAddTag}
        onDeleteTag={handleDeleteTag}
      />
    </div>
  );
}
