import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  // Phase 2: { path: 'scanner', loadComponent: () => import('./features/scanner/scanner.component').then(m => m.ScannerComponent) },
  // Phase 3: { path: 'analysis', loadComponent: () => import('./features/analysis/analysis.component').then(m => m.AnalysisComponent) },
  // Phase 3: { path: 'paper-trading', loadComponent: () => import('./features/paper-trading/paper-trading.component').then(m => m.PaperTradingComponent) },
  { path: '**', redirectTo: '' },
];
