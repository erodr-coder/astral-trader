import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketDataService } from '../../core/services/market-data.service';
import { WatchlistComponent } from '../watchlist/watchlist.component';
import { ChartComponent } from '../chart/chart.component';
import { TickerCardComponent } from '../../shared/components/ticker-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, WatchlistComponent, ChartComponent, TickerCardComponent],
  template: `
    <div class="dashboard">
      <!-- Top Bar: Quick Stats -->
      <section class="quick-stats">
        <div class="stat-item">
          <span class="stat-label">Watchlist</span>
          <span class="stat-value">{{ marketData.watchlist().length }} tickers</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Selected</span>
          <span class="stat-value mono">{{ marketData.selectedTicker() ?? 'None' }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Phase</span>
          <span class="stat-value phase-badge">1 — Foundation</span>
        </div>
        <!-- Phase 2: Scanner alerts count will go here -->
        <!-- Phase 3: Paper P&L will go here -->
      </section>

      <!-- Main Grid -->
      <div class="dashboard-grid">
        <!-- Left: Watchlist -->
        <aside class="panel watchlist-panel">
          <div class="panel-header">
            <h2 class="panel-title">Watchlist</h2>
            <button class="refresh-btn" (click)="refresh()" [disabled]="marketData.loading()">
              {{ marketData.loading() ? '↻' : '⟳' }}
            </button>
          </div>
          <app-watchlist />
        </aside>

        <!-- Center: Chart + Details -->
        <main class="panel chart-panel">
          <div class="panel-header">
            <h2 class="panel-title">
              @if (marketData.selectedData(); as data) {
                {{ data.ticker }}
                <span class="ticker-name">{{ data.name }}</span>
              } @else {
                Select a ticker
              }
            </h2>
            @if (marketData.selectedData(); as data) {
              <div class="price-display">
                <span class="current-price mono">
                  {{ data.quote.price | number:'1.2-2' }}
                </span>
                <span
                  class="price-change mono"
                  [class.positive]="data.quote.changePercent > 0"
                  [class.negative]="data.quote.changePercent < 0"
                >
                  {{ data.quote.changePercent > 0 ? '+' : '' }}{{ data.quote.changePercent | number:'1.2-2' }}%
                </span>
              </div>
            }
          </div>

          @if (marketData.selectedData(); as data) {
            <app-chart [priceHistory]="data.priceHistory" />

            <!-- Technical Indicators Panel -->
            <div class="technicals-grid">
              <div class="tech-item">
                <span class="tech-label">RSI (14)</span>
                <span
                  class="tech-value mono"
                  [class.text-red]="data.technicals.rsi14 !== null && data.technicals.rsi14 > 70"
                  [class.text-green]="data.technicals.rsi14 !== null && data.technicals.rsi14 < 30"
                >
                  {{ data.technicals.rsi14 !== null ? (data.technicals.rsi14 | number:'1.1-1') : '—' }}
                </span>
              </div>
              <div class="tech-item">
                <span class="tech-label">SMA 20</span>
                <span class="tech-value mono">
                  {{ data.technicals.sma20 !== null ? (data.technicals.sma20 | number:'1.2-2') : '—' }}
                </span>
              </div>
              <div class="tech-item">
                <span class="tech-label">SMA 50</span>
                <span class="tech-value mono">
                  {{ data.technicals.sma50 !== null ? (data.technicals.sma50 | number:'1.2-2') : '—' }}
                </span>
              </div>
              <div class="tech-item">
                <span class="tech-label">SMA 200</span>
                <span class="tech-value mono">
                  {{ data.technicals.sma200 !== null ? (data.technicals.sma200 | number:'1.2-2') : '—' }}
                </span>
              </div>
              <div class="tech-item">
                <span class="tech-label">MACD</span>
                <span
                  class="tech-value mono"
                  [class.text-green]="data.technicals.macdHistogram !== null && data.technicals.macdHistogram > 0"
                  [class.text-red]="data.technicals.macdHistogram !== null && data.technicals.macdHistogram < 0"
                >
                  {{ data.technicals.macdLine !== null ? (data.technicals.macdLine | number:'1.2-2') : '—' }}
                </span>
              </div>
              <div class="tech-item">
                <span class="tech-label">Volume Ratio</span>
                <span
                  class="tech-value mono"
                  [class.text-amber]="data.technicals.volumeRatio !== null && data.technicals.volumeRatio > 1.5"
                >
                  {{ data.technicals.volumeRatio !== null ? (data.technicals.volumeRatio | number:'1.2-2') + 'x' : '—' }}
                </span>
              </div>
            </div>
          } @else {
            <div class="empty-state">
              <span class="empty-icon">◆</span>
              <p>Select a ticker from your watchlist to view chart and indicators</p>
            </div>
          }
        </main>

        <!-- Right: Ticker Cards Overview -->
        <aside class="panel cards-panel">
          <div class="panel-header">
            <h2 class="panel-title">Overview</h2>
          </div>
          <div class="cards-list">
            @for (data of marketData.allMarketData(); track data.ticker) {
              <app-ticker-card
                [data]="data"
                [isSelected]="data.ticker === marketData.selectedTicker()"
                (select)="marketData.selectTicker(data.ticker)"
              />
            }
            @if (marketData.allMarketData().length === 0) {
              <p class="text-muted" style="padding: 16px; font-size: 13px;">
                Loading market data...
              </p>
            }
          </div>
        </aside>
      </div>

      <!-- Error Display -->
      @if (marketData.error(); as error) {
        <div class="error-bar">
          <span>⚠ {{ error }}</span>
          <button (click)="dismissError()">✕</button>
        </div>
      }

      <!-- Phase Roadmap Hint -->
      <footer class="phase-hint">
        <div class="phase-items">
          <span class="phase-item active">① Foundation</span>
          <span class="phase-item">② Scanner + UW</span>
          <span class="phase-item">③ AI + Paper Trading</span>
          <span class="phase-item">④ Live Trading</span>
          <span class="phase-item">⑤ Options</span>
          <span class="phase-item">⑥ Crypto</span>
        </div>
      </footer>
    </div>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  marketData = inject(MarketDataService);

  refresh(): void {
    this.marketData.refreshAll();
  }

  dismissError(): void {
    // In a full implementation, this would clear the error signal
  }
}
