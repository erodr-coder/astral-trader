import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Quote,
  OHLC,
  MarketData,
  TechnicalIndicators,
  WatchlistItem,
} from '../interfaces/market-data.interface';

/**
 * MarketDataService — the central data engine for AstralTrader.
 *
 * Responsibilities:
 * - Fetches quotes and price history from Alpha Vantage
 * - Computes technical indicators from raw OHLC data
 * - Manages the watchlist (add/remove/persist)
 * - Exposes reactive signals that components subscribe to
 *
 * Phase 2 will add: UnusualWhalesService (separate service, data merges here)
 * Phase 3 will add: Claude API calls triggered from here
 */
@Injectable({
  providedIn: 'root',
})
export class MarketDataService {
  // ─── Reactive State (Signals) ──────────────────────────────

  /** All market data keyed by ticker */
  private marketDataMap = signal<Map<string, MarketData>>(new Map());

  /** The user's watchlist */
  private _watchlist = signal<WatchlistItem[]>(this.loadWatchlist());

  /** Currently selected ticker for detail view */
  private _selectedTicker = signal<string | null>(null);

  /** Loading state */
  private _loading = signal<boolean>(false);

  /** Error state */
  private _error = signal<string | null>(null);

  // ─── Public Computed Signals ───────────────────────────────

  /** Watchlist as a read-only signal */
  readonly watchlist = computed(() => this._watchlist());

  /** All market data as an array (for dashboard grid) */
  readonly allMarketData = computed(() =>
    Array.from(this.marketDataMap().values())
  );

  /** Market data for the selected ticker */
  readonly selectedData = computed(() => {
    const ticker = this._selectedTicker();
    if (!ticker) return null;
    return this.marketDataMap().get(ticker) ?? null;
  });

  readonly selectedTicker = computed(() => this._selectedTicker());
  readonly loading = computed(() => this._loading());
  readonly error = computed(() => this._error());

  // ─── API Config ────────────────────────────────────────────

  private readonly apiKey = environment.alphaVantageApiKey;
  private readonly baseUrl = environment.api.alphaVantage;

  constructor(private http: HttpClient) {
    // Load data for existing watchlist items on startup
    this.initializeData();
  }

  // ─── Watchlist Management ──────────────────────────────────

  addToWatchlist(ticker: string, name: string): void {
    const current = this._watchlist();
    if (current.some((item) => item.ticker === ticker)) return;

    const newItem: WatchlistItem = {
      ticker: ticker.toUpperCase(),
      name,
      addedAt: new Date(),
    };

    this._watchlist.set([...current, newItem]);
    this.saveWatchlist();
    this.fetchQuote(ticker.toUpperCase());
    this.fetchDailyHistory(ticker.toUpperCase());
  }

  removeFromWatchlist(ticker: string): void {
    this._watchlist.set(
      this._watchlist().filter((item) => item.ticker !== ticker)
    );
    this.saveWatchlist();

    // Remove from market data map
    const map = new Map(this.marketDataMap());
    map.delete(ticker);
    this.marketDataMap.set(map);
  }

  selectTicker(ticker: string | null): void {
    this._selectedTicker.set(ticker);
  }

  // ─── Data Fetching ─────────────────────────────────────────

  /**
   * Fetch a real-time quote for a ticker.
   * Uses Alpha Vantage GLOBAL_QUOTE endpoint.
   */
  async fetchQuote(ticker: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${this.apiKey}`;
      const response: any = await this.http.get(url).toPromise();

      const raw = response['Global Quote'];
      if (!raw || !raw['05. price']) {
        throw new Error(`No data returned for ${ticker}`);
      }

      const quote: Quote = {
        ticker,
        price: parseFloat(raw['05. price']),
        open: parseFloat(raw['02. open']),
        high: parseFloat(raw['03. high']),
        low: parseFloat(raw['04. low']),
        previousClose: parseFloat(raw['08. previous close']),
        volume: parseInt(raw['06. volume'], 10),
        changeDollar: parseFloat(raw['09. change']),
        changePercent: parseFloat(raw['10. change percent']?.replace('%', '')),
        timestamp: new Date(),
      };

      this.updateMarketData(ticker, { quote });
    } catch (err: any) {
      this._error.set(`Failed to fetch quote for ${ticker}: ${err.message}`);
      console.error(err);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Fetch daily OHLC history for charts.
   * Uses Alpha Vantage TIME_SERIES_DAILY endpoint.
   */
  async fetchDailyHistory(ticker: string): Promise<void> {
    try {
      const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${this.apiKey}`;
      const response: any = await this.http.get(url).toPromise();

      const timeSeries = response['Time Series (Daily)'];
      if (!timeSeries) {
        throw new Error(`No history data for ${ticker}`);
      }

      const priceHistory: OHLC[] = Object.entries(timeSeries)
        .map(([date, values]: [string, any]) => ({
          time: date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'], 10),
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

      const technicals = this.computeTechnicals(priceHistory);

      this.updateMarketData(ticker, { priceHistory, technicals });
    } catch (err: any) {
      console.error(`Failed to fetch history for ${ticker}:`, err.message);
    }
  }

  /**
   * Refresh all watchlist data.
   * Called on init and can be triggered manually.
   */
  async refreshAll(): Promise<void> {
    const tickers = this._watchlist().map((item) => item.ticker);
    for (const ticker of tickers) {
      await this.fetchQuote(ticker);
      // Alpha Vantage free tier: 25 req/day, 5 req/min
      // Add delay between requests to avoid rate limiting
      await this.delay(12000);
      await this.fetchDailyHistory(ticker);
      await this.delay(12000);
    }
  }

  // ─── Technical Indicator Computation ───────────────────────

  /**
   * Compute technical indicators from OHLC data.
   * This runs client-side — no API call needed.
   *
   * Phase 2 will use these values in scanner rule evaluation.
   */
  private computeTechnicals(data: OHLC[]): TechnicalIndicators {
    const closes = data.map((d) => d.close);
    const volumes = data.map((d) => d.volume);

    return {
      rsi14: this.computeRSI(closes, 14),
      sma20: this.computeSMA(closes, 20),
      sma50: this.computeSMA(closes, 50),
      sma200: this.computeSMA(closes, 200),
      ema12: this.computeEMA(closes, 12),
      ema26: this.computeEMA(closes, 26),
      macdLine: this.computeMACD(closes).line,
      macdSignal: this.computeMACD(closes).signal,
      macdHistogram: this.computeMACD(closes).histogram,
      bollingerUpper: this.computeBollinger(closes, 20).upper,
      bollingerLower: this.computeBollinger(closes, 20).lower,
      avgVolume30d: this.computeSMA(volumes, 30),
      volumeRatio:
        volumes.length > 0 && this.computeSMA(volumes, 30)
          ? volumes[volumes.length - 1] / this.computeSMA(volumes, 30)!
          : null,
    };
  }

  /** Relative Strength Index */
  private computeRSI(closes: number[], period: number): number | null {
    if (closes.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    // Initial average gain/loss
    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /** Simple Moving Average */
  private computeSMA(values: number[], period: number): number | null {
    if (values.length < period) return null;
    const slice = values.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  /** Exponential Moving Average */
  private computeEMA(values: number[], period: number): number | null {
    if (values.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((s, v) => s + v, 0) / period;

    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  /** MACD (12, 26, 9) */
  private computeMACD(closes: number[]): {
    line: number | null;
    signal: number | null;
    histogram: number | null;
  } {
    const ema12 = this.computeEMA(closes, 12);
    const ema26 = this.computeEMA(closes, 26);

    if (ema12 === null || ema26 === null) {
      return { line: null, signal: null, histogram: null };
    }

    const line = ema12 - ema26;
    // Simplified: for a proper signal line, you'd compute EMA of the MACD line
    // over the full series. This is an approximation for Phase 1.
    const signal = line * 0.8; // placeholder
    const histogram = line - signal;

    return { line, signal, histogram };
  }

  /** Bollinger Bands (20-period, 2 std dev) */
  private computeBollinger(
    closes: number[],
    period: number
  ): { upper: number | null; lower: number | null } {
    const sma = this.computeSMA(closes, period);
    if (sma === null || closes.length < period) {
      return { upper: null, lower: null };
    }

    const slice = closes.slice(-period);
    const variance =
      slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: sma + 2 * stdDev,
      lower: sma - 2 * stdDev,
    };
  }

  // ─── State Helpers ─────────────────────────────────────────

  /**
   * Update or create a MarketData entry.
   * Merges partial data so quote and history can arrive separately.
   */
  private updateMarketData(
    ticker: string,
    partial: Partial<MarketData>
  ): void {
    const map = new Map(this.marketDataMap());
    const existing = map.get(ticker);

    const updated: MarketData = {
      ticker,
      name: existing?.name ?? this.getTickerName(ticker),
      sector: existing?.sector ?? '',
      quote: partial.quote ?? existing?.quote ?? this.emptyQuote(ticker),
      technicals:
        partial.technicals ?? existing?.technicals ?? this.emptyTechnicals(),
      priceHistory: partial.priceHistory ?? existing?.priceHistory ?? [],
      lastUpdated: new Date(),
    };

    map.set(ticker, updated);
    this.marketDataMap.set(map);
  }

  private emptyQuote(ticker: string): Quote {
    return {
      ticker,
      price: 0,
      open: 0,
      high: 0,
      low: 0,
      previousClose: 0,
      volume: 0,
      changeDollar: 0,
      changePercent: 0,
      timestamp: new Date(),
    };
  }

  private emptyTechnicals(): TechnicalIndicators {
    return {
      rsi14: null,
      sma20: null,
      sma50: null,
      sma200: null,
      ema12: null,
      ema26: null,
      macdLine: null,
      macdSignal: null,
      macdHistogram: null,
      bollingerUpper: null,
      bollingerLower: null,
      avgVolume30d: null,
      volumeRatio: null,
    };
  }

  // ─── Persistence ───────────────────────────────────────────

  private saveWatchlist(): void {
    localStorage.setItem(
      'astraltrader_watchlist',
      JSON.stringify(this._watchlist())
    );
  }

  private loadWatchlist(): WatchlistItem[] {
    const stored = localStorage.getItem('astraltrader_watchlist');
    if (!stored) {
      // Default watchlist for first-time users
      return [
        { ticker: 'AAPL', name: 'Apple Inc.', addedAt: new Date() },
        { ticker: 'MSFT', name: 'Microsoft Corp.', addedAt: new Date() },
        { ticker: 'NVDA', name: 'NVIDIA Corp.', addedAt: new Date() },
        { ticker: 'SPY', name: 'S&P 500 ETF', addedAt: new Date() },
      ];
    }
    return JSON.parse(stored);
  }

  private getTickerName(ticker: string): string {
    // Simple lookup — Phase 2 will use a proper search API
    const names: Record<string, string> = {
      AAPL: 'Apple Inc.',
      MSFT: 'Microsoft Corp.',
      NVDA: 'NVIDIA Corp.',
      GOOGL: 'Alphabet Inc.',
      AMZN: 'Amazon.com Inc.',
      META: 'Meta Platforms',
      TSLA: 'Tesla Inc.',
      SPY: 'S&P 500 ETF',
      QQQ: 'Nasdaq 100 ETF',
      AMD: 'AMD Inc.',
      NFLX: 'Netflix Inc.',
      DIS: 'Walt Disney Co.',
    };
    return names[ticker] ?? ticker;
  }

  private async initializeData(): Promise<void> {
    const tickers = this._watchlist().map((item) => item.ticker);
    for (const ticker of tickers) {
      // Stagger requests to respect rate limits
      this.fetchQuote(ticker);
      await this.delay(12000);
    }
    // Then fetch history for the first ticker
    if (tickers.length > 0) {
      this._selectedTicker.set(tickers[0]);
      await this.delay(12000);
      this.fetchDailyHistory(tickers[0]);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
