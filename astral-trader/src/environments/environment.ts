export const environment = {
  production: false,
  alphaVantageApiKey: 'YOUR_ALPHA_VANTAGE_KEY',
  // Phase 2: Unusual Whales
  // unusualWhalesApiKey: 'YOUR_UW_KEY',
  // Phase 3: Claude AI
  // claudeApiKey: 'YOUR_CLAUDE_KEY',
  api: {
    alphaVantage: 'https://www.alphavantage.co/query',
    // Phase 2
    // unusualWhales: 'https://api.unusualwhales.com',
    // Phase 4
    // alpaca: 'https://paper-api.alpaca.markets',
  },
  // Polling interval in milliseconds (15 min during market hours)
  pollingInterval: 900000,
};
