import { useState, useEffect } from 'react';
import { api } from './lib/api/client';
import { StockListItem, MetaInfo } from './lib/types';
import ThemeToggle from './components/ThemeToggle';
import StockListPage from './pages/StockListPage';
import StockDetailPage from './pages/StockDetailPage';
import { RefreshCw, BarChart2 } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'list' | 'detail'>('list');
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allStocks = await api.getStocks();
      const sysMeta = await api.getSystemMeta();
      setStocks(allStocks);
      setMeta(sysMeta);
    } catch (e) {
      console.error('載入資料庫失敗：', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectStock = (id: string) => {
    setSelectedStockId(id);
    setCurrentPage('detail');
  };

  const handleBackToList = () => {
    setCurrentPage('list');
    setSelectedStockId(null);
    loadData(); // 返回列表時，重新載入資料以更新狀態
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 font-sans flex flex-col">
      {/* 頂部導覽列 */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleBackToList}
          >
            <div className="p-2 bg-brand-500 rounded-lg text-white">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-sans tracking-tight bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400 bg-clip-text text-transparent">
                TradePilot
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 -mt-1 font-mono">
                Stock Management System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="重新載入資料"
              id="reload-btn"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && stocks.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse font-sans">
              正在載入股票系統數據...
            </p>
          </div>
        ) : currentPage === 'list' ? (
          <StockListPage 
            stocks={stocks} 
            meta={meta} 
            onSelectStock={handleSelectStock} 
            onRefresh={loadData} 
          />
        ) : (
          selectedStockId && (
            <StockDetailPage 
              stockId={selectedStockId} 
              onBack={handleBackToList} 
            />
          )
        )}
      </main>

      {/* 底部資訊列 */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 bg-white dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <p>© 2026 TradePilot StockSystem. All rights reserved.</p>
          <div className="flex items-center gap-3 font-mono">
            <span>Schema: 1.0.0</span>
            <span>•</span>
            <span>Version: {meta?.appVersion || 'v4.5-mock'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
