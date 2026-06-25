<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# antigravity mapping document

## Purpose

This document maps current spreadsheet/code fields to the antigravity domain model for contract-first refactoring.

## Core models

- **Stock**: stock identity, prices, volume, moving averages.
- **ZoneState**: support/resistance, buy/sell zones, observations, breakout/breakdown counters.
- **MetaSettings**: trade dates, observation dates, config parameters.


## Field mapping

| Current field | Domain model | Role | Source / usage |
| :-- | :-- | :-- | :-- |
| 股票名稱 | stock.name | 基本識別 | CSV 匯入、DB 顯示、JSON 備份 |
| 股票代號 | stock.id | 基本識別 | normalizeStockId、CSV 匯入、DB 主鍵 |
| 前-成交 | price.prev.close | 前日收盤/基準價 | updateBuyZoneStatus、updateCalculations |
| 現-成交 | price.curr.close | 目前成交價 | 區間判定、乖離、停利停損、漲跌幅 |
| 前-最高 | price.prev.high | 前日高點 | DB 保留、後續分析 |
| 前-最低 | price.prev.low | 前日低點 | DB 保留、後續分析 |
| 現-最高 | price.curr.high | 今日高點 | 突破判定、停利/區間更新 |
| 現-最低 | price.curr.low | 今日低點 | 跌破判定、支撐刷新 |
| 前-爆量 | volume.prev.signal | 前日量能訊號 | DB 保留 |
| 現-爆量 | volume.curr.signal | 量縮/量增/爆量 | ZoneEngine 量能訊號 |
| 前-5MA | ma.prev.5 | 前日均線 | 均線穿越判斷 |
| 前-10MA | ma.prev.10 | 前日均線 | 均線穿越判斷 |
| 前-20MA | ma.prev.20 | 前日均線 | 均線穿越判斷 |
| 前-60MA | ma.prev.60 | 前日均線 | 均線穿越判斷 |
| 現-5MA | ma.curr.5 | 目前均線 | 均線穿越判斷 |
| 現-10MA | ma.curr.10 | 目前均線 | 均線穿越判斷 |
| 現-20MA | ma.curr.20 | 目前均線 | 均線穿越判斷 |
| 現-60MA | ma.curr.60 | 目前均線 | 均線穿越判斷 |
| 前-市值 | marketCap.prev | 前日市值 | DB 保留 |
| 現-市值 | marketCap.curr | 目前市值 | DB 保留 |
| 股價差額 | price.delta | 價差 | updateCalculations、區間判定 |
| 漲跌幅% | price.changePct | 漲跌幅 | updateCalculations |
| 支撐1~10 | support.levels[] | 支撐層級 | updateBuyZoneStatus、超級跌破判定 |
| 壓力1~10 | resistance.levels[] | 壓力層級 | updateBuyZoneStatus、超級突破判定 |
| 突破次數 | breakout.count | 突破計數 | updateBuyZoneStatus |
| 跌破次數 | breakdown.count | 跌破計數 | updateBuyZoneStatus |
| 超級突破次數 | breakout.superCount | 強突破計數 | updateBuyZoneStatus |
| 超級跌破次數 | breakdown.superCount | 強跌破計數 | updateBuyZoneStatus |
| 刷新支撐次數 | support.refreshCount | 支撐刷新 | updateBuyZoneStatus |
| 刷新壓力次數 | resistance.refreshCount | 壓力刷新 | updateBuyZoneStatus |
| 無波動計數 | volatility.flatCount | 穩定性/無波動 | DB 格式化、後續分析 |
| 買入下緣 | zone.buy.lower | 買入區間 | CSV 匯入初始化、區間狀態更新 |
| 買入上緣 | zone.buy.upper | 買入區間 | CSV 匯入初始化、區間狀態更新 |
| 賣出下緣 | zone.sell.lower | 賣出區間 | CSV 匯入初始化、區間狀態更新 |
| 賣出上緣 | zone.sell.upper | 賣出區間 | CSV 匯入初始化、區間狀態更新 |
| 最高 | range.high | 區間高點 | importStockCSV、updateBuyZoneStatus |
| 最低 | range.low | 區間低點 | importStockCSV、updateBuyZoneStatus |
| 6個月最高 | history.high6m | 長期高點 | CSV 進站欄位 |
| 6個月最低 | history.low6m | 長期低點 | CSV 進站欄位 |
| 區間買進狀態 | zone.buy.status | 買進狀態字串 | ZoneEngine 主輸出欄位 |
| 區間賣出狀態 | zone.sell.status | 賣出狀態字串 | ZoneEngine 主輸出欄位 |
| 區間買賣建議 | zone.recommendation | 綜合建議 | DB 保留，後續 UI/報表使用 |
| 區間亮點 | zone.highlights | 重點摘要 | DB 保留，後續 UI/報表使用 |
| 買進觀察日期 | zone.buy.obsDate | 追蹤日期 | updateMetaData、ZoneEngine |
| 賣出觀察日期 | zone.sell.obsDate | 追蹤日期 | updateMetaData、ZoneEngine |
| 停利點 | risk.takeProfit | 風控價位 | ZoneEngine、priceAlert |
| 停損點 | risk.stopLoss | 風控價位 | ZoneEngine、priceAlert |
| 均線狀況 | ma.status | 均線穿越摘要 | updateBuyZoneStatus 主輸出 |
| 均線關鍵 | ma.keyEvents | 均線事件明細 | updateBuyZoneStatus 主輸出 |
| 現價5MA乖離 | bias.curr.5 | 乖離率 | updateBuyZoneStatus 計算欄位 |
| 現價10MA乖離 | bias.curr.10 | 乖離率 | updateBuyZoneStatus 計算欄位 |
| 現價20MA乖離 | bias.curr.20 | 乖離率 | updateBuyZoneStatus 計算欄位 |
| 現價60MA乖離 | bias.curr.60 | 乖離率 | updateBuyZoneStatus 計算欄位 |
| 前價5MA乖離 | bias.prev.5 | 乖離率 | updateBuyZoneStatus 計算欄位 |
| 前價10MA乖離 | bias.prev.10 | 乖離率 | updateBuyZoneStatus 計算欄位 |
| 前價20MA乖離 | bias.prev.20 | 乖離率 | updateBuyZoneStatus 計算欄位 |
| 前價60MA乖離 | bias.prev.60 | 乖離率 | updateBuyZoneStatus 計算欄位 |
| 到價通知 | alert.price | 到價提示 | priceAlertText 來源 |
| 量縮量增 | alert.volume | 量能提示 | volSignalText 來源 |
| 交易日 | meta.tradeDate | 系統日期 | updateMetaData、區間判定 |
| 次交易日 | meta.nextDate | 系統日期 | updateMetaData、可買/可賣字串 |
| 觀察日 | meta.obsDate | 系統日期 | updateMetaData、狀態追蹤 |
| range_upper_mult | settings.rangeUpperMult | 參數 | importStockCSV 初始化區間上緣 |
| range_lower_mult | settings.rangeLowerMult | 參數 | importStockCSV 初始化區間下緣 |
| buy_signal_mult | settings.buySignalMult | 參數 | importStockCSV 初始化買訊下緣 |
| sell_signal_mult | settings.sellSignalMult | 參數 | importStockCSV 初始化賣訊下緣 |
| vol_burst_mult | settings.volBurstMult | 參數 | 量能判斷參考 |
| vol_inc_dec_mult | settings.volIncDecMult | 參數 | 量能判斷參考 |
| vol_dec_mult | settings.volDecMult | 參數 | 量能判斷參考 |

## Rules

- Keep these names stable as the contract boundary for frontend mock data, Apps Script, and backup/restore.
- Do not rename fields without updating the mapping table and schema version.
- `stock_db` remains the canonical sheet for runtime state.

