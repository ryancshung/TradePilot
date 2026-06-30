import { useMemo } from 'react';
import { StockData } from '../lib/types';

interface StockBoxChartProps {
  stock: StockData;
}

export default function StockBoxChart({ stock }: StockBoxChartProps) {
  // 過濾出有效的壓力與支撐線數值 (取前3條)
  const pressureLevels = useMemo(() => {
    return (stock.pressures?.levels ?? []).filter((p): p is number => p !== null).slice(0, 3);
  }, [stock.pressures]);

  const supportLevels = useMemo(() => {
    return (stock.supports?.levels ?? []).filter((s): s is number => s !== null).slice(0, 3);
  }, [stock.supports]);

  const currPrice = stock.price.currPrice;
  const prevPrice = stock.price.prevPrice;
  const currHigh = stock.price.high;
  const currLow = stock.price.low;
  const prevHigh = stock.price.prevHigh;
  const prevLow = stock.price.prevLow;
  const buyLowerLimit = stock.zone.buyLowerLimit;
  const buyUpperLimit = stock.zone.buyUpperLimit;
  const sellLowerLimit = stock.zone.sellLowerLimit;
  const sellUpperLimit = stock.zone.sellUpperLimit;

  // 收集所有需要進行座標對齊的價格點，以計算 Y 軸比例尺
  const allPrices = useMemo(() => {
    const list = [
      currPrice, prevPrice, currHigh, currLow, prevHigh, prevLow,
      buyLowerLimit, buyUpperLimit, sellLowerLimit, sellUpperLimit,
      ...pressureLevels, ...supportLevels
    ].filter((p): p is number => p !== null && p > 0);

    const maxVal = Math.max(...list, 10);
    const actualMin = Math.min(...list);
    
    // 計算合理的價差，並在此基礎上給上下各 8% 緩衝，避免頂格
    const diff = maxVal - actualMin;
    const pad = diff * 0.08 || 5;

    return {
      max: maxVal + pad,
      min: Math.max(0, actualMin - pad),
    };
  }, [currPrice, prevPrice, currHigh, currLow, prevHigh, prevLow, buyLowerLimit, buyUpperLimit, sellLowerLimit, sellUpperLimit, pressureLevels, supportLevels]);

  // SVG 尺寸
  const width = 600;
  const height = 300; // 從 400 縮小至 300
  const paddingY = 25; // 從 40 縮小至 25
  const chartHeight = height - paddingY * 2;

  // 比例尺函數：價格 -> Y 座標
  const getRefY = (price: number | null): number => {
    if (price === null || price === 0) return 0;
    const { max, min } = allPrices;
    const ratio = (price - min) / (max - min);
    return height - paddingY - ratio * chartHeight;
  };

  // 繪圖座標 (拉大間距，使得昨今日 K 線位置被拓寬)
  const prevX = 140; // 原 180
  const currX = 460; // 原 420

  const points = useMemo(() => {
    return {
      currY: getRefY(currPrice),
      prevY: getRefY(prevPrice),
      currHighY: getRefY(currHigh),
      currLowY: getRefY(currLow),
      prevHighY: getRefY(prevHigh),
      prevLowY: getRefY(prevLow),
      buyLowY: getRefY(buyLowerLimit),
      buyUpY: getRefY(buyUpperLimit),
      sellLowY: getRefY(sellLowerLimit),
      sellUpY: getRefY(sellUpperLimit),
    };
  }, [currPrice, prevPrice, currHigh, currLow, prevHigh, prevLow, buyLowerLimit, buyUpperLimit, sellLowerLimit, sellUpperLimit, allPrices]);

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          📦 股價箱型區間 & 支撐壓力可視化
        </h4>
        <div className="flex gap-4 text-[10px] font-semibold">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-sm"></span>
            買入區間
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-rose-500/20 border border-rose-500/40 rounded-sm"></span>
            賣出區間
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 border-t-2 border-dashed border-red-500/60"></span>
            壓力線
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 border-t-2 border-dashed border-emerald-500/60"></span>
            支撐線
          </span>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[550px] select-none font-mono">
          {/* 背景格線 */}
          <line x1="80" y1={paddingY} x2={width - 40} y2={paddingY} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />
          <line x1="80" y1={height / 2} x2={width - 40} y2={height / 2} className="stroke-slate-200/50 dark:stroke-slate-800/50" strokeWidth="1" strokeDasharray="4" />
          <line x1="80" y1={height - paddingY} x2={width - 40} y2={height - paddingY} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />

          {/* 1. 繪製買入與賣出區間背景色塊 */}
          {buyLowerLimit && buyUpperLimit && (
            <rect
              x="100"
              y={Math.min(points.buyLowY, points.buyUpY)}
              width={width - 160}
              height={Math.abs(points.buyLowY - points.buyUpY)}
              className="fill-emerald-500/10 stroke-emerald-500/20"
              strokeWidth="1"
            />
          )}
          {sellLowerLimit && sellUpperLimit && (
            <rect
              x="100"
              y={Math.min(points.sellLowY, points.sellUpY)}
              width={width - 160}
              height={Math.abs(points.sellLowY - points.sellUpY)}
              className="fill-rose-500/10 stroke-rose-500/20"
              strokeWidth="1"
            />
          )}

          {/* 2. 標記壓力線 (紅虛線) */}
          {pressureLevels.map((price, idx) => {
            const y = getRefY(price);
            return (
              <g key={`pressure-${idx}`} className="opacity-75 hover:opacity-100 transition-opacity">
                <line x1="70" y1={y} x2={width - 40} y2={y} stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="3 3" />
                <text x="15" y={y + 3} className="text-[9px] fill-rose-500 font-bold" textAnchor="start">壓{idx + 1}: {price}</text>
              </g>
            );
          })}

          {/* 3. 標記支撐線 (綠虛線) */}
          {supportLevels.map((price, idx) => {
            const y = getRefY(price);
            return (
              <g key={`support-${idx}`} className="opacity-75 hover:opacity-100 transition-opacity">
                <line x1="70" y1={y} x2={width - 40} y2={y} stroke="#10b981" strokeWidth="1.2" strokeDasharray="3 3" />
                <text x="15" y={y + 3} className="text-[9px] fill-emerald-500 font-bold" textAnchor="start">支{idx + 1}: {price}</text>
              </g>
            );
          })}

          {/* 4. 繪製前日 K 線結構 */}
          {prevLow && prevHigh && prevPrice && (
            <g>
              {/* 高低影線 */}
              <line x1={prevX} y1={points.prevHighY} x2={prevX} y2={points.prevLowY} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth="2" />
              {/* 收盤價定位點 */}
              <circle cx={prevX} cy={points.prevY} r="5" className="fill-slate-400 dark:fill-slate-500" />
              <text x={prevX} y={points.prevHighY - 8} textAnchor="middle" className="text-[9px] fill-slate-400 dark:fill-slate-500 font-bold">前高: {prevHigh}</text>
              <text x={prevX} y={points.prevLowY + 12} textAnchor="middle" className="text-[9px] fill-slate-400 dark:fill-slate-500 font-bold">前低: {prevLow}</text>
              <text x={prevX - 12} y={points.prevY + 3} textAnchor="end" className="text-[10px] fill-slate-500 dark:fill-slate-400 font-mono">前收: {prevPrice}</text>
            </g>
          )}

          {/* 5. 繪製當日 K 線結構 */}
          {currLow && currHigh && currPrice && (
            <g>
              {/* 高低影線 */}
              <line x1={currX} y1={points.currHighY} x2={currX} y2={points.currLowY} className="stroke-brand-500" strokeWidth="3" />
              {/* 收盤價定位點 */}
              <circle cx={currX} cy={points.currY} r="7" className="fill-brand-600 dark:fill-brand-400 stroke-white dark:stroke-slate-900" strokeWidth="2" />
              <text x={currX} y={points.currHighY - 8} textAnchor="middle" className="text-[9px] fill-brand-600 dark:fill-brand-400 font-bold">現高: {currHigh}</text>
              <text x={currX} y={points.currLowY + 12} textAnchor="middle" className="text-[9px] fill-brand-600 dark:fill-brand-400 font-bold">現低: {currLow}</text>
              <text x={currX + 14} y={points.currY + 3} textAnchor="start" className="text-[11px] fill-brand-600 dark:fill-brand-400 font-bold font-mono">現價: {currPrice}</text>
            </g>
          )}

          {/* 6. 繪製三組箭頭連線 (前價 -> 現價、前高 -> 現高、前低 -> 現低) */}
          {prevPrice && currPrice && (
            <g className="opacity-60 dark:opacity-40">
              {/* 收盤價連線 */}
              <path
                d={`M ${prevX + 10} ${points.prevY} Q ${(prevX + currX) / 2} ${(points.prevY + points.currY) / 2 - 15} ${currX - 10} ${points.currY}`}
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                markerEnd="url(#arrow)"
              />
            </g>
          )}
          {prevHigh && currHigh && (
            <g className="opacity-60 dark:opacity-40">
              {/* 最高價連線 */}
              <path
                d={`M ${prevX + 15} ${points.prevHighY} L ${currX - 15} ${points.currHighY}`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1"
                strokeDasharray="2 2"
                markerEnd="url(#arrow-red)"
              />
            </g>
          )}
          {prevLow && currLow && (
            <g className="opacity-60 dark:opacity-40">
              {/* 最低價連線 */}
              <path
                d={`M ${prevX + 15} ${points.prevLowY} L ${currX - 15} ${points.currLowY}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="2 2"
                markerEnd="url(#arrow-green)"
              />
            </g>
          )}

          {/* SVG 箭頭標記定義 */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6366f1" />
            </marker>
            <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 2 L 8 5 L 0 8 L 2 5 z" fill="#f43f5e" />
            </marker>
            <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 2 L 8 5 L 0 8 L 2 5 z" fill="#10b981" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}
