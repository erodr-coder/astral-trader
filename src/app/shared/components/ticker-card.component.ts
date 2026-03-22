import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketData } from '../../core/interfaces/market-data.interface';

@Component({
  selector: 'app-ticker-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="ticker-card"
      [class.selected]="isSelected"
      (click)="select.emit()"
    >
      <div class="card-top">
        <span class="card-ticker mono">{{ data.ticker }}</span>
        <span
          class="card-change mono"
          [class.positive]="data.quote.changePercent > 0"
          [class.negative]="data.quote.changePercent < 0"
        >
          {{ data.quote.changePercent > 0 ? '▲' : data.quote.changePercent < 0 ? '▼' : '—' }}
          {{ data.quote.changePercent !== 0 ? (abs(data.quote.changePercent) | number:'1.2-2') + '%' : '' }}
        </span>
      </div>
      <div class="card-price mono">
        {{ data.quote.price > 0 ? (data.quote.price | number:'1.2-2') : '...' }}
      </div>
      <div class="card-bottom">
        <span class="card-name">{{ data.name }}</span>
        @if (data.technicals.rsi14 !== null) {
          <span
            class="card-rsi mono"
            [class.text-red]="data.technicals.rsi14 > 70"
            [class.text-green]="data.technicals.rsi14 < 30"
          >
            RSI {{ data.technicals.rsi14 | number:'1.0-0' }}
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    .ticker-card {
      padding: 12px 16px;
      background: var(--bg-card);
      cursor: pointer;
      transition: all 0.15s;
      border-left: 2px solid transparent;

      &:hover {
        background: var(--bg-card-hover);
      }

      &.selected {
        background: var(--accent-cyan-dim);
        border-left-color: var(--accent-cyan);
      }
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .card-ticker {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .card-change {
      font-size: 11px;
      font-weight: 500;

      &.positive { color: var(--accent-green); }
      &.negative { color: var(--accent-red); }
    }

    .card-price {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-name {
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
    }

    .card-rsi {
      font-size: 10px;
      color: var(--text-secondary);
    }
  `],
})
export class TickerCardComponent {
  @Input({ required: true }) data!: MarketData;
  @Input() isSelected = false;
  @Output() select = new EventEmitter<void>();

  abs(value: number): number {
    return Math.abs(value);
  }
}
