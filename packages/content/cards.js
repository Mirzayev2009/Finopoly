/**
 * 18 market event cards drawn when a team lands on a 'card' board space.
 *
 * effect.kind contracts:
 *   REVEAL_SECTOR        { sectorId? } - if omitted, RESOLVE_CARD's `choice` picks the sector
 *   LOSE_PCT_OF_POSITION  { pct, target: 'largest' } - shrinks the team's largest holding
 *   GAIN_FLAT             { amount } - added to holdings.cash
 *   FORCE_TO_CASH_PCT      { pct } - moves pct of every non-cash sector into holdings.cash
 *   DOUBLE_ONE_SECTOR      {} - always needs RESOLVE_CARD's `choice`
 *   HALVE_ONE_SECTOR       {} - always needs RESOLVE_CARD's `choice`
 *   SKIP                   {} - no-op, flavor only
 *
 * Card magnitudes (pct/amount) are draft numbers, not historically grounded —
 * see TODO.md.
 */

export const CARDS = [
  {
    id: 'insider-tip',
    title: 'Insider Tip',
    text: 'A contact at the exchange shares a hint before the close. Pick a sector to reveal its return.',
    effect: { kind: 'REVEAL_SECTOR' },
  },
  {
    id: 'analyst-leak',
    title: 'Analyst Leak',
    text: "A rival firm's research note leaks early. Pick a sector to reveal its return.",
    effect: { kind: 'REVEAL_SECTOR' },
  },
  {
    id: 'boardroom-rumor',
    title: 'Boardroom Rumor',
    text: 'Word travels fast after the board meeting. Pick a sector to reveal its return.',
    effect: { kind: 'REVEAL_SECTOR' },
  },
  {
    id: 'market-panic',
    title: 'Market Panic',
    text: 'A wave of selling hits your largest position.',
    effect: { kind: 'LOSE_PCT_OF_POSITION', pct: 0.20, target: 'largest' },
  },
  {
    id: 'regulatory-crackdown',
    title: 'Regulatory Crackdown',
    text: 'New rules squeeze your largest position.',
    effect: { kind: 'LOSE_PCT_OF_POSITION', pct: 0.15, target: 'largest' },
  },
  {
    id: 'supply-chain-shock',
    title: 'Supply Chain Shock',
    text: 'Disruption abroad hits your largest position hard.',
    effect: { kind: 'LOSE_PCT_OF_POSITION', pct: 0.25, target: 'largest' },
  },
  {
    id: 'windfall-dividend',
    title: 'Windfall Dividend',
    text: 'An unexpected dividend lands in your account.',
    effect: { kind: 'GAIN_FLAT', amount: 5000 },
  },
  {
    id: 'government-grant',
    title: 'Government Grant',
    text: 'A stimulus check arrives.',
    effect: { kind: 'GAIN_FLAT', amount: 3000 },
  },
  {
    id: 'estate-settlement',
    title: 'Estate Settlement',
    text: 'A distant relative leaves you a small inheritance.',
    effect: { kind: 'GAIN_FLAT', amount: 7500 },
  },
  {
    id: 'flight-to-safety',
    title: 'Flight to Safety',
    text: 'Nervous, your team pulls a third of every position into cash.',
    effect: { kind: 'FORCE_TO_CASH_PCT', pct: 0.30 },
  },
  {
    id: 'margin-call',
    title: 'Margin Call',
    text: 'Your broker forces half of every position into cash.',
    effect: { kind: 'FORCE_TO_CASH_PCT', pct: 0.50 },
  },
  {
    id: 'risk-committee-order',
    title: 'Risk Committee Order',
    text: 'Compliance orders a fifth of every position moved to cash.',
    effect: { kind: 'FORCE_TO_CASH_PCT', pct: 0.20 },
  },
  {
    id: 'breakout-rally',
    title: 'Breakout Rally',
    text: 'A sector of your choice doubles overnight.',
    effect: { kind: 'DOUBLE_ONE_SECTOR' },
  },
  {
    id: 'takeover-bid',
    title: 'Takeover Bid',
    text: 'A buyout offer sends a sector of your choice soaring.',
    effect: { kind: 'DOUBLE_ONE_SECTOR' },
  },
  {
    id: 'sector-writedown',
    title: 'Sector Writedown',
    text: 'A sector of your choice is written down by half.',
    effect: { kind: 'HALVE_ONE_SECTOR' },
  },
  {
    id: 'currency-devaluation',
    title: 'Currency Devaluation',
    text: 'A sector of your choice loses half its value overnight.',
    effect: { kind: 'HALVE_ONE_SECTOR' },
  },
  {
    id: 'quiet-quarter',
    title: 'Quiet Quarter',
    text: 'Nothing happens. Markets are closed for the holiday.',
    effect: { kind: 'SKIP' },
  },
  {
    id: 'analyst-vacation',
    title: 'Analyst Vacation',
    text: 'Your analyst is out of office. No news today.',
    effect: { kind: 'SKIP' },
  },
];
