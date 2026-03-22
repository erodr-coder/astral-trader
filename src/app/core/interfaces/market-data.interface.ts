/**
 * Core market data interfaces for AstralTrader.
 *
 * These types flow through the entire system:
 * Data Service → Scanner → AI Analyzer → Dashboard
 *
 * Phase 1: MarketData, Quote, OHLC, TechnicalIndicators
 * Phase 2: SmartMoneyData and sub-types (Unusual Whales)
 * Phase 3: PredictionMarketData
 */

// ─── Quote & Price Data ────────────────────────────────────────

/** Real-time quote for a single ticker */
export interface Quote {
  ticker: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  changeDollar: number;
  changePercent: number;
  timestamp: Date;
}

/** Single OHLC candle for chart rendering */
export interface OHLC {
  time: string;     // 'YYYY-MM-DD' format for lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── Technical Indicators ──────────────────────────────────────

/** Computed technical indicators for a ticker */
export interface TechnicalIndicators {
  rsi14: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bollingerUpper: number | null;
  bollingerLower: number | null;
  avgVolume30d: number | null;
  volumeRatio: number | null;     // current vol / avg vol
}

// ─── Enriched Market Data ──────────────────────────────────────

/**
 * The main data object for each ticker.
 * Combines price data, technicals, and (later) smart money signals.
 */
export interface MarketData {
  ticker: string;
  name: string;
  sector: string;
  quote: Quote;
  technicals: TechnicalIndicators;
  priceHistory: OHLC[];
  smartMoney?: SmartMoneyData;          // Phase 2: Unusual Whales
  predictionContext?: PredictionData;    // Phase 3
  lastUpdated: Date;
}

// ─── Watchlist ─────────────────────────────────────────────────

/** A ticker in the user's watchlist */
export interface WatchlistItem {
  ticker: string;
  name: string;
  addedAt: Date;
  notes?: string;
  tags?: string[];    // e.g., 'tech', 'dividend', 'earnings-soon'
}

// ─── Smart Money (Phase 2 - Unusual Whales) ────────────────────

export interface SmartMoneyData {
  darkPool: DarkPoolActivity;
  optionsFlow: OptionsFlowSummary;
  insiderTrades: InsiderTrade[];
  congressTrades: CongressTrade[];
  institutionalOwnership: InstitutionHolding[];
}

export interface DarkPoolActivity {
  volume: number;
  avgVolume30d: number;
  sentiment: 'accumulation' | 'distribution' | 'neutral';
  largeTrades: { price: number; size: number; time: Date }[];
}

export interface OptionsFlowSummary {
  netCallPremium: number;
  netPutPremium: number;
  sweepCount: number;
  unusualAlerts: FlowAlert[];
}

export interface FlowAlert {
  id: string;
  ticker: string;
  contractType: 'call' | 'put';
  strike: number;
  expiry: Date;
  premium: number;
  volume: number;
  openInterest: number;
  sentiment: 'bullish' | 'bearish';
  timestamp: Date;
}

export interface InsiderTrade {
  name: string;
  title: string;
  action: 'buy' | 'sell';
  shares: number;
  pricePerShare: number;
  totalValue: number;
  filingDate: Date;
}

export interface CongressTrade {
  politician: string;
  party: string;
  chamber: 'senate' | 'house';
  action: 'buy' | 'sell';
  ticker: string;
  estimatedAmount: string;   // "$1,001 - $15,000" format
  filingDate: Date;
  isLate: boolean;
}

export interface InstitutionHolding {
  institution: string;
  shares: number;
  value: number;
  changePercent: number;    // quarter-over-quarter
  filingDate: Date;
}

// ─── Prediction Markets (Phase 3) ──────────────────────────────

export interface PredictionData {
  events: PredictionEvent[];
  lastUpdated: Date;
}

export interface PredictionEvent {
  title: string;
  probability: number;          // 0-100
  smartMoneyBias: 'yes' | 'no' | 'neutral';
  relevantTickers: string[];
  category: 'fed' | 'earnings' | 'policy' | 'election' | 'other';
}
