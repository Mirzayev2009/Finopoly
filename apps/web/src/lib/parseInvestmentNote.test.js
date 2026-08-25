import { describe, it, expect } from 'vitest';
import { parseInvestmentNote } from './parseInvestmentNote.js';

describe('parseInvestmentNote', () => {
  it('parses a plain gain', () => {
    expect(parseInvestmentNote('Bet $500 on Bitcoin (BTC) at +250%')).toEqual({
      betAmount: 500,
      cardName: 'Bitcoin (BTC)',
      percentage: 250,
    });
  });

  it('parses a loss', () => {
    expect(parseInvestmentNote('Bet $1000 on Terra (LUNA) at -100%')).toEqual({
      betAmount: 1000,
      cardName: 'Terra (LUNA)',
      percentage: -100,
    });
  });

  it('parses a force-submitted note with the host prefix', () => {
    expect(parseInvestmentNote('(host force-submitted) Bet $2000 on Gold (Commodity) at +12%')).toEqual({
      betAmount: 2000,
      cardName: 'Gold (Commodity)',
      percentage: 12,
    });
  });

  it('parses a decimal percentage', () => {
    expect(parseInvestmentNote('Bet $300 on iShares 1-3 Year Treasury Bond ETF (SHY) at +1.8%')).toEqual({
      betAmount: 300,
      cardName: 'iShares 1-3 Year Treasury Bond ETF (SHY)',
      percentage: 1.8,
    });
  });

  it('parses a thousands-separated bet amount', () => {
    expect(parseInvestmentNote('Bet $12,500 on U.S. Blue-Chip Stocks (e.g., IBM) at +1000%')).toEqual({
      betAmount: 12500,
      cardName: 'U.S. Blue-Chip Stocks (e.g., IBM)',
      percentage: 1000,
    });
  });

  it('returns null for unrelated notes (e.g. SKIPPED, ADJUST)', () => {
    expect(parseInvestmentNote('Turn skipped (frozen)')).toBeNull();
    expect(parseInvestmentNote('reason (shows in history)')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(parseInvestmentNote(null)).toBeNull();
    expect(parseInvestmentNote(undefined)).toBeNull();
  });
});
