# AstralTrader — Phase 1: Foundation & Data Layer

## What This Is
Phase 1 of your personal AI trading terminal. This phase gives you:
- Live market data dashboard with real prices
- Interactive watchlist with add/remove
- Price charts with candlestick display
- Responsive Angular architecture ready for Phase 2 (scanner) and beyond

## Prerequisites
- Node.js 18+ (you already have this)
- Angular CLI 17+ (`npm install -g @angular/cli`)
- A free Alpha Vantage API key: https://www.alphavantage.co/support/#api-key

## Setup Steps

### 1. Create the Angular project
```bash
ng new astral-trader --style=scss --routing=true --standalone
cd astral-trader
```

### 2. Install dependencies
```bash
npm install lightweight-charts
npm install --save-dev @types/node
```

### 3. Copy the source files
Replace the contents of your `src/` folder with the files from this package.
Keep the following files that `ng new` generated (don't overwrite these):
- `angular.json`
- `package.json` 
- `tsconfig.json`
- `tsconfig.app.json`

### 4. Add your API key
Open `src/environments/environment.ts` and replace `'YOUR_ALPHA_VANTAGE_KEY'` with your actual key.

### 5. Add Google Fonts to index.html
In `src/index.html`, add this in the `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### 6. Run it
```bash
ng serve
```
Navigate to `http://localhost:4200`

## Project Structure
```
src/app/
├── core/
│   ├── interfaces/          # TypeScript types for the entire system
│   │   ├── market-data.interface.ts
│   │   ├── scanner.interface.ts      (Phase 2 - ready)
│   │   └── trade.interface.ts        (Phase 3 - ready)
│   └── services/
│       └── market-data.service.ts    # API calls + data management
├── features/
│   ├── dashboard/
│   │   └── dashboard.component.ts    # Main layout
│   ├── watchlist/
│   │   └── watchlist.component.ts    # Ticker list + add/remove
│   └── chart/
│       └── chart.component.ts        # Price chart display
├── shared/
│   ├── components/
│   │   └── ticker-card.component.ts  # Individual stock card
│   └── pipes/
│       └── format-number.pipe.ts     # Number formatting
├── app.component.ts
├── app.component.scss
└── app.routes.ts
```

## Architecture Notes for Your Study
- **Standalone components** throughout (no NgModules) — this is modern Angular
- **Services use signals** for reactive state management
- **OnPush change detection** where possible for performance
- **SCSS variables** match the design system from your architecture doc
- Each feature folder is self-contained — ready for lazy loading in Phase 2

## What's Next: Phase 2
The scanner engine + Unusual Whales integration. The interfaces for Phase 2 
are already stubbed in `scanner.interface.ts` — the data structures are ready, 
you just need to build the rule engine and UW service.
