/**
 * 40 spaces, id 0..39, standard Monopoly geometry. Pure data, no logic, no
 * imports. Space 0/10/20/30 are the four corners; 2/7/17/22/33/36 are
 * market-news spaces; everything else is an asset space.
 *
 * Asset spaces are organized into 8 sector-flavoured colour groups, two per
 * board side. 30 asset spaces don't divide evenly into 8 groups of 4-5 (the
 * minimum possible, 8x4=32, already exceeds 30), so six groups run 4 spaces
 * and two run 3.
 */

export const BOARD = [
  { id: 0, type: 'corner', name: 'START' },
  { id: 1, type: 'asset', group: 'financials', name: 'Community Credit Union' },
  { id: 2, type: 'market_news', name: 'Market News' },
  { id: 3, type: 'asset', group: 'financials', name: 'Regional Bank Index' },
  { id: 4, type: 'asset', group: 'financials', name: 'Money Market Desk' },
  { id: 5, type: 'asset', group: 'financials', name: 'Insurance Underwriters' },
  { id: 6, type: 'asset', group: 'consumer', name: 'Grocery & Staples Fund' },
  { id: 7, type: 'market_news', name: 'Market News' },
  { id: 8, type: 'asset', group: 'consumer', name: 'Retail Chain Holdings' },
  { id: 9, type: 'asset', group: 'consumer', name: 'Consumer Goods Co-op' },
  { id: 10, type: 'corner', name: 'ANGEL' },
  { id: 11, type: 'asset', group: 'energy', name: 'Crude Oil Futures' },
  { id: 12, type: 'asset', group: 'energy', name: 'Natural Gas Pipeline' },
  { id: 13, type: 'asset', group: 'energy', name: 'Refinery Row' },
  { id: 14, type: 'asset', group: 'energy', name: 'Solar Power Trust' },
  { id: 15, type: 'asset', group: 'realestate', name: 'Suburban Housing Trust' },
  { id: 16, type: 'asset', group: 'realestate', name: 'Commercial Office Tower' },
  { id: 17, type: 'market_news', name: 'Market News' },
  { id: 18, type: 'asset', group: 'realestate', name: 'Industrial Warehouse Park' },
  { id: 19, type: 'asset', group: 'realestate', name: 'Coastal REIT' },
  { id: 20, type: 'corner', name: 'PRISON' },
  { id: 21, type: 'asset', group: 'tech', name: 'Cloud Computing Stack' },
  { id: 22, type: 'market_news', name: 'Market News' },
  { id: 23, type: 'asset', group: 'tech', name: 'Semiconductor Foundry' },
  { id: 24, type: 'asset', group: 'tech', name: 'AI Research Lab' },
  { id: 25, type: 'asset', group: 'tech', name: 'Cybersecurity Bureau' },
  { id: 26, type: 'asset', group: 'industrials', name: 'Steel Mill Consortium' },
  { id: 27, type: 'asset', group: 'industrials', name: 'Container Freight' },
  { id: 28, type: 'asset', group: 'industrials', name: 'Heavy Machinery Works' },
  { id: 29, type: 'asset', group: 'industrials', name: 'Rail Freight Line' },
  { id: 30, type: 'corner', name: 'BUYOUT' },
  { id: 31, type: 'asset', group: 'macro', name: 'Sovereign Debt Desk' },
  { id: 32, type: 'asset', group: 'macro', name: 'Currency Exchange Floor' },
  { id: 33, type: 'market_news', name: 'Market News' },
  { id: 34, type: 'asset', group: 'macro', name: 'Municipal Bond Office' },
  { id: 35, type: 'asset', group: 'macro', name: 'Treasury Auction House' },
  { id: 36, type: 'market_news', name: 'Market News' },
  { id: 37, type: 'asset', group: 'crypto', name: 'Crypto Exchange Terminal' },
  { id: 38, type: 'asset', group: 'crypto', name: 'Blockchain Mining Rig' },
  { id: 39, type: 'asset', group: 'crypto', name: 'DeFi Liquidity Pool' },
];
