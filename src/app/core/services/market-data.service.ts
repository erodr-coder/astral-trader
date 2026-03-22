import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
 * NOW USING: Yahoo Finance (via public chart/quote endpoints)
 * - No daily call limits
 * - Real price data with full history
 * - Quotes + OHLC candles in a single request
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

  readonly watchlist = computed(() => this._watchlist());

  readonly allMarketData = computed(() =>
    Array.from(this.marketDataMap().values())
  );

  readonly selectedData = computed(() => {
    const ticker = this._selectedTicker();
    if (!ticker) return null;
    return this.marketDataMap().get(ticker) ?? null;
  });

  readonly selectedTicker = computed(() => this._selectedTicker());
  readonly loading = computed(() => this._loading());
  readonly error = computed(() => this._error());

  // ─── Yahoo Finance Config ──────────────────────────────────

  // Public Yahoo Finance endpoints that work from the browser
  // Using a CORS proxy to handle cross-origin requests
  private readonly corsProxy = 'https://corsproxy.io/?';
  private readonly yahooChartBase = 'https://query1.finance.yahoo.com/v8/finance/chart/';
  private readonly yahooQuoteBase = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=';

  constructor(private http: HttpClient) {
    this.initializeData();
  }

  // ─── Watchlist Management ──────────────────────────────────

  addToWatchlist(ticker: string, name: string): void {
    const current = this._watchlist();
    const upperTicker = ticker.toUpperCase();
    if (current.some((item) => item.ticker === upperTicker)) return;

    const newItem: WatchlistItem = {
      ticker: upperTicker,
      name,
      addedAt: new Date(),
    };

    this._watchlist.set([...current, newItem]);
    this.saveWatchlist();
    this.fetchTickerData(upperTicker);
  }

  removeFromWatchlist(ticker: string): void {
    this._watchlist.set(
      this._watchlist().filter((item) => item.ticker !== ticker)
    );
    this.saveWatchlist();

    const map = new Map(this.marketDataMap());
    map.delete(ticker);
    this.marketDataMap.set(map);
  }

  selectTicker(ticker: string | null): void {
    this._selectedTicker.set(ticker);
    // Fetch full history if we only have a quote
    if (ticker) {
      const data = this.marketDataMap().get(ticker);
      if (!data || data.priceHistory.length === 0) {
        this.fetchTickerData(ticker);
      }
    }
  }

  // ─── Data Fetching ─────────────────────────────────────────

  /**
   * Fetch quote + history for a ticker in ONE request.
   * Yahoo's chart endpoint returns both current price and OHLC history.
   * This is much more efficient than Alpha Vantage's separate endpoints.
   */
  async fetchTickerData(ticker: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      // Yahoo chart API: returns OHLC + current quote in one call
      // range=6mo gives ~130 trading days of daily candles
      const url = `${this.corsProxy}${encodeURIComponent(
        `${this.yahooChartBase}${ticker}?range=6mo&interval=1d&includePrePost=false`
      )}`;

      const response: any = await this.http.get(url).toPromise();

      const result = response?.chart?.result?.[0];
      if (!result) {
        throw new Error(`No data returned for ${ticker}`);
      }

      // Extract quote data from the meta field
      const meta = result.meta;
      const quote: Quote = {
        ticker,
        price: meta.regularMarketPrice ?? 0,
        open: meta.regularMarketOpen ?? 0,
        high: meta.regularMarketDayHigh ?? 0,
        low: meta.regularMarketDayLow ?? 0,
        previousClose: meta.chartPreviousClose ?? meta.previousClose ?? 0,
        volume: meta.regularMarketVolume ?? 0,
        changeDollar: (meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? meta.previousClose ?? 0),
        changePercent:
          meta.chartPreviousClose || meta.previousClose
            ? (((meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? meta.previousClose ?? 0)) /
                (meta.chartPreviousClose ?? meta.previousClose ?? 1)) *
              100
            : 0,
        timestamp: new Date(),
      };

      // Extract OHLC candles
      const timestamps = result.timestamp ?? [];
      const ohlc = result.indicators?.quote?.[0] ?? {};
      const priceHistory: OHLC[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const open = ohlc.open?.[i];
        const high = ohlc.high?.[i];
        const low = ohlc.low?.[i];
        const close = ohlc.close?.[i];
        const volume = ohlc.volume?.[i];

        // Skip null candles (holidays, missing data)
        if (open == null || high == null || low == null || close == null) continue;

        const date = new Date(timestamps[i] * 1000);
        const dateStr = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'

        priceHistory.push({
          time: dateStr,
          open,
          high,
          low,
          close,
          volume: volume ?? 0,
        });
      }

      // Sort chronologically
      priceHistory.sort((a, b) => a.time.localeCompare(b.time));

      // Compute technicals from the history
      const technicals = this.computeTechnicals(priceHistory);

      // Update the market data map
      this.updateMarketData(ticker, {
        quote,
        priceHistory,
        technicals,
        name: meta.longName ?? meta.shortName ?? this.getTickerName(ticker),
      });
    } catch (err: any) {
      const msg = `Failed to fetch data for ${ticker}: ${err.message}`;
      this._error.set(msg);
      console.error(msg, err);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Refresh all watchlist data.
   * With Yahoo Finance, we can fetch much faster than Alpha Vantage.
   */
  async refreshAll(): Promise<void> {
    this._loading.set(true);
    const tickers = this._watchlist().map((item) => item.ticker);
    for (const ticker of tickers) {
      await this.fetchTickerData(ticker);
      // Small delay to be polite to Yahoo's servers
      await this.delay(500);
    }
    this._loading.set(false);
  }

  // ─── Technical Indicator Computation ───────────────────────

  /**
   * Compute technical indicators from OHLC data.
   * This runs client-side — no API call needed.
   */
  private computeTechnicals(data: OHLC[]): TechnicalIndicators {
    const closes = data.map((d) => d.close);
    const volumes = data.map((d) => d.volume);

    const ema12 = this.computeEMA(closes, 12);
    const ema26 = this.computeEMA(closes, 26);
    const macd = this.computeMACD(closes);

    return {
      rsi14: this.computeRSI(closes, 14),
      sma20: this.computeSMA(closes, 20),
      sma50: this.computeSMA(closes, 50),
      sma200: this.computeSMA(closes, 200),
      ema12,
      ema26,
      macdLine: macd.line,
      macdSignal: macd.signal,
      macdHistogram: macd.histogram,
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

  /** MACD (12, 26, 9) — full proper computation */
  private computeMACD(closes: number[]): {
    line: number | null;
    signal: number | null;
    histogram: number | null;
  } {
    if (closes.length < 26) {
      return { line: null, signal: null, histogram: null };
    }

    // Compute EMA12 and EMA26 series
    const multiplier12 = 2 / 13;
    const multiplier26 = 2 / 27;
    const multiplier9 = 2 / 10;

    let ema12 = closes.slice(0, 12).reduce((s, v) => s + v, 0) / 12;
    let ema26 = closes.slice(0, 26).reduce((s, v) => s + v, 0) / 26;

    const macdLine: number[] = [];

    for (let i = 26; i < closes.length; i++) {
      ema12 = (closes[i] - ema12) * multiplier12 + ema12;
      ema26 = (closes[i] - ema26) * multiplier26 + ema26;
      macdLine.push(ema12 - ema26);
    }

    if (macdLine.length < 9) {
      return { line: macdLine[macdLine.length - 1] ?? null, signal: null, histogram: null };
    }

    // Signal line = 9-period EMA of MACD line
    let signal = macdLine.slice(0, 9).reduce((s, v) => s + v, 0) / 9;
    for (let i = 9; i < macdLine.length; i++) {
      signal = (macdLine[i] - signal) * multiplier9 + signal;
    }

    const line = macdLine[macdLine.length - 1];
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

  private updateMarketData(
    ticker: string,
    partial: Partial<MarketData> & { name?: string }
  ): void {
    const map = new Map(this.marketDataMap());
    const existing = map.get(ticker);

    const updated: MarketData = {
      ticker,
      name: partial.name ?? existing?.name ?? this.getTickerName(ticker),
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

    // Select the first ticker by default
    if (tickers.length > 0) {
      this._selectedTicker.set(tickers[0]);
    }

    // Fetch all tickers — Yahoo Finance can handle rapid requests
    for (const ticker of tickers) {
      await this.fetchTickerData(ticker);
      await this.delay(300); // small courtesy delay
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
