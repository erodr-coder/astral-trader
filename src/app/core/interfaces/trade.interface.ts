/**
 * Trade interfaces for Phase 3 (paper) and Phase 4 (live).
 *
 * Covers stock trades, options trades (Phase 5), and the
 * AI analysis structure that Claude returns.
 */

// ─── AI Analysis ───────────────────────────────────────────────

export interface AIAnalysis {
  id: string;
  ticker: string;
  bullCase: string;
  bearCase: string;
  riskScore: number;              // 1-10
  catalysts: string[];
  suggestedEntry: number;
  suggestedStop: number;
  suggestedTarget: number;
  confidence: number;             // 0-100
  smartMoneyVerdict: string;      // AI summary of UW signals
  signalConvergence: number;      // how many signals align
  predictionContext?: string;     // macro context from prediction markets
  timestamp: Date;
  outcome?: 'correct' | 'incorrect' | 'pending';
}

// ─── Stock Trades ──────────────────────────────────────────────

export interface Trade {
  id: string;
  ticker: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  target: number;
  reasoning: string;
  aiAnalysisId?: string;
  isPaper: boolean;
  status: 'open' | 'closed';
  outcome?: 'win' | 'loss';
  pnl?: number;
  pnlPercent?: number;
  entryDate: Date;
  exitDate?: Date;
  tags?: string[];
}

// ─── Options Trades (Phase 5) ──────────────────────────────────

export interface OptionTrade extends Trade {
  contractType: 'call' | 'put';
  strike: number;
  expiry: Date;
  premiumPaid: number;
  contracts: number;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  strategy: 'long_call' | 'long_put' | 'covered_call' | 'spread' | 'custom';
  maxLoss: number;
  uwFlowMatchId?: string;        // linked UW flow alert
}

// ─── Portfolio ─────────────────────────────────────────────────

export interface Portfolio {
  id: string;
  name: string;
  type: 'paper' | 'live';
  market: 'stocks' | 'crypto' | 'options';
  startingBalance: number;
  currentBalance: number;
  positions: Position[];
  closedTrades: Trade[];
  metrics: PortfolioMetrics;
  createdAt: Date;
}

export interface Position {
  ticker: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  stopLoss: number;
  target: number;
}

export interface PortfolioMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalTrades: number;
  profitFactor: number;           // gross wins / gross losses
  benchmarkComparison: number;    // vs S&P 500
}
