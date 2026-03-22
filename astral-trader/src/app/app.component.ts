import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="app-shell">
      <header class="app-header">
        <div class="header-left">
          <h1 class="logo">
            <span class="logo-icon">◆</span>
            AstralTrader
          </h1>
          <span class="version-badge">Phase 1</span>
        </div>
        <div class="header-right">
          <span class="market-status" [class.open]="isMarketOpen()">
            <span class="status-dot"></span>
            {{ isMarketOpen() ? 'Market Open' : 'Market Closed' }}
          </span>
        </div>
      </header>
      <main class="app-content">
        <router-outlet />
      </main>
    </div>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  isMarketOpen(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const totalMinutes = hours * 60 + minutes;

    // NYSE: 9:30 AM - 4:00 PM ET = 13:30 - 20:00 UTC (approx)
    const isWeekday = day >= 1 && day <= 5;
    const isDuringHours = totalMinutes >= 810 && totalMinutes <= 1200;

    return isWeekday && isDuringHours;
  }
}
