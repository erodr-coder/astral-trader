import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketDataService } from '../../core/services/market-data.service';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Add Ticker Input -->
    <div class="add-ticker">
      <input
        type="text"
        class="ticker-input"
        placeholder="Add ticker..."
        [(ngModel)]="newTicker"
        (keydown.enter)="addTicker()"
        maxlength="5"
      />
      <button class="add-btn" (click)="addTicker()" [disabled]="!newTicker.trim()">+</button>
    </div>

    <!-- Watchlist Items -->
    <div class="watchlist-items">
      @for (item of marketData.watchlist(); track item.ticker) {
        <div
          class="watchlist-item"
          [class.selected]="item.ticker === marketData.selectedTicker()"
          (click)="select(item.ticker)"
        >
          <div class="item-left">
            <span class="item-ticker mono">{{ item.ticker }}</span>
            <span class="item-name">{{ item.name }}</span>
          </div>
          <button
            class="remove-btn"
            (click)="remove(item.ticker, $event)"
            title="Remove from watchlist"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
    }

    .add-ticker {
      display: flex;
      gap: 4px;
      padding: 12px;
      border-bottom: 1px solid var(--border);
    }

    .ticker-input {
      flex: 1;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 8px 10px;
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 12px;
      text-transform: uppercase;
      outline: none;
      transition: border-color 0.2s;

      &::placeholder {
        color: var(--text-muted);
        text-transform: none;
      }

      &:focus {
        border-color: var(--accent-cyan);
      }
    }

    .add-btn {
      background: var(--accent-cyan-dim);
      border: 1px solid var(--accent-cyan-border);
      color: var(--accent-cyan);
      width: 34px;
      height: 34px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: rgba(0, 212, 255, 0.15);
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
    }

    .watchlist-items {
      display: flex;
      flex-direction: column;
    }

    .watchlist-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      cursor: pointer;
      transition: background 0.15s;
      border-left: 2px solid transparent;

      &:hover {
        background: var(--bg-card-hover);
      }

      &.selected {
        background: var(--accent-cyan-dim);
        border-left-color: var(--accent-cyan);
      }
    }

    .item-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .item-ticker {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .item-name {
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }

    .remove-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 11px;
      padding: 4px 6px;
      border-radius: 4px;
      opacity: 0;
      transition: all 0.15s;

      .watchlist-item:hover & {
        opacity: 1;
      }

      &:hover {
        color: var(--accent-red);
        background: var(--accent-red-dim);
      }
    }
  `],
})
export class WatchlistComponent {
  marketData = inject(MarketDataService);
  newTicker = '';

  addTicker(): void {
    const ticker = this.newTicker.trim().toUpperCase();
    if (!ticker) return;

    this.marketData.addToWatchlist(ticker, ticker);
    this.newTicker = '';
  }

  select(ticker: string): void {
    this.marketData.selectTicker(ticker);
    // Fetch history if we don't have it yet
    const data = this.marketData.allMarketData().find(d => d.ticker === ticker);
    if (data && data.priceHistory.length === 0) {
      this.marketData.fetchDailyHistory(ticker);
    }
  }

  remove(ticker: string, event: Event): void {
    event.stopPropagation();
    this.marketData.removeFromWatchlist(ticker);
  }
}
