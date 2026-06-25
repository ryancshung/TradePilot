/**
 * TradePilot — Domain Model Types (v1)
 *
 * 這些型別是 stock_db / meta / settings 工作表的資料契約。
 * 對應來源：mapping document.md、getDbHeaders()（APPcode.gs）
 *
 * 欄位 index 對照：
 *   0-1   identity
 *   2-10  前-* (BLOCK_SIZE=9)
 *   11-19 現-* (BLOCK_SIZE=9)
 *   20-21 計算欄位
 *   22-31 支撐1~10
 *   32-41 壓力1~10
 *   42-48 計數器
 *   49-52 買賣區間邊界
 *   53-56 高低點 / 6個月高低
 *   57-62 區間狀態 / 觀察日期
 *   63-64 停利停損
 *   65-66 均線狀況
 *   67-74 乖離率 (現價×4 + 前價×4)
 *   75-76 通知欄位
 */

// ─────────────────────────────────────────────
// 基本 Scalars
// ─────────────────────────────────────────────

/** 日期字串統一格式：yyyy/MM/dd */
export type DateString = string;

/** 價格，null 表示欄位為空或無效 */
export type Price = number | null;

/** 量能比值（現量 / 均量），null 表示無資料 */
export type VolumeRatio = number | null;

// ─────────────────────────────────────────────
// 狀態 Literal Types（格式由 Core.gs 驗證函數保證）
// ─────────────────────────────────────────────

/**
 * zone.buy.status 的所有可能值
 *   - 不低於：yyyy/MM/dd
 *   - 突破等待：yyyy/MM/dd
 *   - 等一長紅
 *   - 可買進：yyyy/MM/dd (price)
 *   - ''（空值，初始 / 重設）
 */
export type BuyStatus = string;

/**
 * zone.sell.status 的所有可能值
 *   - 不高於：yyyy/MM/dd
 *   - 跌破等待：yyyy/MM/dd
 *   - 等一長黑
 *   - 可賣出：yyyy/MM/dd (price)
 *   - ''
 */
export type SellStatus = string;

/** alert.price */
export type PriceAlertText = '可停利' | '可停損' | '';

/** alert.volume */
export type VolumeAlertText = '爆量' | '量增' | '量減' | '量縮' | '';

// ─────────────────────────────────────────────
// Stock — 股票本體資料
// ─────────────────────────────────────────────

export interface StockIdentity {
  /** 股票名稱（col 0） */
  name: string;
  /** 股票代號，normalizeStockId 後的值（col 1，含前置 ' 符號） */
  id: string;
}

export interface PriceSnapshot {
  /** 成交價（前-成交 col 2 / 現-成交 col 11） */
  close: Price;
  /** 最高（前-最高 col 3 / 現-最高 col 12） */
  high: Price;
  /** 最低（前-最低 col 4 / 現-最低 col 13） */
  low: Price;
}

export interface VolumeSnapshot {
  /** 爆量比值（前-爆量 col 5 / 現-爆量 col 14） */
  signal: VolumeRatio;
}

export interface MASnapshot {
  /** 5MA（前-5MA col 6 / 現-5MA col 15） */
  ma5: Price;
  /** 10MA（前-10MA col 7 / 現-10MA col 16） */
  ma10: Price;
  /** 20MA（前-20MA col 8 / 現-20MA col 17） */
  ma20: Price;
  /** 60MA（前-60MA col 9 / 現-60MA col 18） */
  ma60: Price;
}

export interface BiasSnapshot {
  /** 現價/前價 5MA 乖離率（col 67/71） */
  bias5: number | null;
  /** 現價/前價 10MA 乖離率（col 68/72） */
  bias10: number | null;
  /** 現價/前價 20MA 乖離率（col 69/73） */
  bias20: number | null;
  /** 現價/前價 60MA 乖離率（col 70/74） */
  bias60: number | null;
}

export interface Stock {
  identity: StockIdentity;

  price: {
    prev: PriceSnapshot;
    curr: PriceSnapshot;
    /** 股價差額 = curr.close - prev.close（col 20，公式欄位） */
    delta: Price;
    /** 漲跌幅%（col 21，公式欄位，格式 0.00%） */
    changePct: number | null;
  };

  volume: {
    prev: VolumeSnapshot;
    curr: VolumeSnapshot;
  };

  marketCap: {
    /** 前-市值（col 10） */
    prev: number | null;
    /** 現-市值（col 19） */
    curr: number | null;
  };

  ma: {
    prev: MASnapshot;
    curr: MASnapshot;
    /**
     * 均線狀況（col 65），多行文字
     * 格式：突破5MA\n跌破10MA（每 MA 一行）
     */
    status: string;
    /**
     * 均線關鍵（col 66），多行文字
     * 格式：yyyy/MM/dd 突破/跌破 {MA}
     */
    keyEvents: string;
  };

  bias: {
    curr: BiasSnapshot;
    prev: BiasSnapshot;
  };
}

// ─────────────────────────────────────────────
// ZoneState — 區間/支撐壓力/計數器/狀態
// ─────────────────────────────────────────────

export interface ZoneState {
  support: {
    /** 支撐1~10（col 22–31），空字串表示未填 */
    levels: (number | null)[];
    /** 刷新支撐次數（col 46） */
    refreshCount: number;
  };

  resistance: {
    /** 壓力1~10（col 32–41） */
    levels: (number | null)[];
    /** 刷新壓力次數（col 47） */
    refreshCount: number;
  };

  breakout: {
    /** 突破次數（col 42） */
    count: number;
    /** 超級突破次數（col 44） */
    superCount: number;
  };

  breakdown: {
    /** 跌破次數（col 43） */
    count: number;
    /** 超級跌破次數（col 45） */
    superCount: number;
  };

  volatility: {
    /** 無波動計數（col 48），格式 [>=4]0;"" */
    flatCount: number;
  };

  range: {
    /** 最高（col 53） */
    high: Price;
    /** 最低（col 54） */
    low: Price;
  };

  history: {
    /** 6個月最高（col 55） */
    high6m: Price;
    /** 6個月最低（col 56） */
    low6m: Price;
  };

  zone: {
    buy: {
      /** 買入下緣（col 49） */
      lower: Price;
      /** 買入上緣（col 50） */
      upper: Price;
      /** 區間買進狀態（col 57） */
      status: BuyStatus;
      /** 買進觀察日期（col 61），Date 物件或 DateString */
      obsDate: Date | DateString | null;
    };
    sell: {
      /** 賣出下緣（col 51） */
      lower: Price;
      /** 賣出上緣（col 52） */
      upper: Price;
      /** 區間賣出狀態（col 58） */
      status: SellStatus;
      /** 賣出觀察日期（col 62） */
      obsDate: Date | DateString | null;
    };
    /** 區間買賣建議（col 59），目前為空保留欄 */
    recommendation: string;
    /** 區間亮點（col 60），目前為空保留欄 */
    highlights: string;
  };

  risk: {
    /** 停利點（col 63） */
    takeProfit: Price;
    /** 停損點（col 64） */
    stopLoss: Price;
  };

  alert: {
    /** 到價通知（col 75）：'可停利' | '可停損' | '' */
    price: PriceAlertText;
    /** 量縮量增（col 76）：'爆量' | '量增' | '量減' | '量縮' | '' */
    volume: VolumeAlertText;
  };
}

// ─────────────────────────────────────────────
// MetaSettings — 系統日期與參數設定
// ─────────────────────────────────────────────

export interface TradeMeta {
  /** 交易日（meta 工作表 B2） */
  tradeDate: Date | DateString | null;
  /** 次交易日（meta 工作表 B3） */
  nextDate: Date | DateString | null;
  /** 觀察日（meta 工作表 B4） */
  obsDate: Date | DateString | null;
}

export interface TradeSettings {
  /** range_upper_mult：區間上緣倍數（預設 1.1） */
  rangeUpperMult: number;
  /** range_lower_mult：區間下緣倍數（預設 0.9） */
  rangeLowerMult: number;
  /** buy_signal_mult：買訊倍數（預設 1.03） */
  buySignalMult: number;
  /** sell_signal_mult：賣訊倍數（預設 0.97） */
  sellSignalMult: number;
  /** vol_burst_mult：爆量閾值（預設 1.5） */
  volBurstMult: number;
  /** vol_inc_dec_mult：量增量減分界（預設 1.0） */
  volIncDecMult: number;
  /** vol_dec_mult：量縮閾值（預設 0.6） */
  volDecMult: number;
}

/** settings 工作表的原始鍵值對，來自 getSettingsMap() */
export type RawSettingsMap = Record<string, string | number>;

// ─────────────────────────────────────────────
// 組合型：一行 DB 的完整資料
// ─────────────────────────────────────────────

export interface StockRow {
  stock: Stock;
  zone: ZoneState;
}
