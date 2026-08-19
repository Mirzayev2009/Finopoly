/**
 * 24 spaces arranged in a loop. Space 0 is always 'start'. The remainder is
 * weighted toward 'card' spaces with 'bonus'/'penalty' spaces for pacing and
 * two 'safe' landmark spaces. Pure data, no logic.
 */

export const BOARD = [
  { id: 0, type: 'start', label: 'Wall Street' },
  { id: 1, type: 'card', label: 'Ticker Tape', cardDeck: 'market' },
  { id: 2, type: 'card', label: 'Trading Floor', cardDeck: 'market' },
  { id: 3, type: 'bonus', label: 'Bull Run' },
  { id: 4, type: 'card', label: 'The Pit', cardDeck: 'market' },
  { id: 5, type: 'card', label: 'Analyst Row', cardDeck: 'market' },
  { id: 6, type: 'penalty', label: 'Bear Trap' },
  { id: 7, type: 'card', label: 'The Exchange', cardDeck: 'market' },
  { id: 8, type: 'card', label: 'Broker Alley', cardDeck: 'market' },
  { id: 9, type: 'bonus', label: 'Rally Day' },
  { id: 10, type: 'card', label: 'The Bell', cardDeck: 'market' },
  { id: 11, type: 'card', label: 'Options Pit', cardDeck: 'market' },
  { id: 12, type: 'safe', label: 'Safe Harbor' },
  { id: 13, type: 'card', label: 'Ticker Tape South', cardDeck: 'market' },
  { id: 14, type: 'card', label: 'The Vault Steps', cardDeck: 'market' },
  { id: 15, type: 'penalty', label: 'Margin Call' },
  { id: 16, type: 'card', label: 'Research Desk', cardDeck: 'market' },
  { id: 17, type: 'card', label: 'Commodities Row', cardDeck: 'market' },
  { id: 18, type: 'bonus', label: 'Breakout' },
  { id: 19, type: 'card', label: 'Currency Corner', cardDeck: 'market' },
  { id: 20, type: 'card', label: 'The Pit South', cardDeck: 'market' },
  { id: 21, type: 'penalty', label: 'Writedown' },
  { id: 22, type: 'card', label: 'Closing Bell', cardDeck: 'market' },
  { id: 23, type: 'safe', label: 'The Vault' },
];
