import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { OHLC } from '../../core/interfaces/market-data.interface';

@Component({
  selector: 'app-chart',
  standalone: true,
  template: `
    <div class="chart-wrapper">
      @if (priceHistory.length === 0) {
        <div class="chart-loading">
          <span class="loading-text">Loading chart data...</span>
        </div>
      }
      <div #chartContainer class="chart-container"></div>
    </div>
  `,
  styles: [`
    .chart-wrapper {
      position: relative;
      width: 100%;
      min-height: 400px;
    }

    .chart-container {
      width: 100%;
      height: 400px;
    }

    .chart-loading {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-card);
      z-index: 1;
    }

    .loading-text {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-muted);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `],
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() priceHistory: OHLC[] = [];
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  private chart: any = null;
  private candleSeries: any = null;
  private volumeSeries: any = null;

  async ngAfterViewInit(): Promise<void> {
    await this.initChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['priceHistory'] && this.chart) {
      this.updateChartData();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
  }

  private async initChart(): Promise<void> {
    try {
      const lc = await import('lightweight-charts');

      this.chart = lc.createChart(this.chartContainer.nativeElement, {
        width: this.chartContainer.nativeElement.clientWidth,
        height: 400,
        layout: {
          background: { type: lc.ColorType.Solid, color: '#131820' },
          textColor: '#8494a7',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: '#1e273622' },
          horzLines: { color: '#1e273622' },
        },
        crosshair: {
          mode: 0,
          vertLine: {
            color: '#00d4ff33',
            labelBackgroundColor: '#00d4ff',
          },
          horzLine: {
            color: '#00d4ff33',
            labelBackgroundColor: '#00d4ff',
          },
        },
        rightPriceScale: {
          borderColor: '#1e2736',
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: '#1e2736',
          timeVisible: false,
        },
      });

      // v5 syntax: pass the series constructor as first argument
      this.candleSeries = this.chart.addSeries(lc.CandlestickSeries, {
        upColor: '#00e68a',
        downColor: '#ff4466',
        borderUpColor: '#00e68a',
        borderDownColor: '#ff4466',
        wickUpColor: '#00e68a88',
        wickDownColor: '#ff446688',
      });

      this.volumeSeries = this.chart.addSeries(lc.HistogramSeries, {
        color: '#00d4ff22',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });

      this.volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      this.updateChartData();

      // Handle resize
      const resizeObserver = new ResizeObserver((entries) => {
        if (this.chart) {
          const { width } = entries[0].contentRect;
          this.chart.applyOptions({ width });
        }
      });
      resizeObserver.observe(this.chartContainer.nativeElement);
    } catch (err) {
      console.error('Failed to initialize chart:', err);
    }
  }

  private updateChartData(): void {
    if (!this.candleSeries || this.priceHistory.length === 0) return;

    // Deduplicate and ensure ascending order by time
    const seen = new Set<string>();
    const cleanData = this.priceHistory
      .filter((d) => {
        if (seen.has(d.time)) return false;
        seen.add(d.time);
        return true;
      })
      .sort((a, b) => a.time.localeCompare(b.time));

    this.candleSeries.setData(cleanData);

    this.volumeSeries.setData(
      cleanData.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? '#00e68a22' : '#ff446622',
      }))
    );

    this.chart.timeScale().fitContent();
  }
}
