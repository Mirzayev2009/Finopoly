/**
 * The 4 historical rounds, in chronological order. `id` matches the engine's
 * `state.round` (1-4; round 0 is pre-game and never looked up here).
 *
 * IMPORTANT: only 3 return values are confirmed real historical figures
 * (marked CONFIRMED below). Every other return number, and both round-3/4
 * years, are invented placeholders — see TODO.md for the full checklist.
 * Do not treat an unmarked number as researched fact.
 */

export const ROUNDS = [
  {
    id: 1,
    year: 1929,
    title: 'The Crash of 1929',
    briefing:
      'The market has been euphoric for years. Margin debt is at record highs. Your team must decide where $100,000 goes before the bell rings.',
    researchQuestions: [
      'Which sectors are most exposed to margin-driven speculation?',
      'What happens to bank deposits when confidence collapses?',
      'Which assets do investors flee TO in a panic?',
    ],
    returns: {
      banking: -0.85, // CONFIRMED
      gold: 0.30, // CONFIRMED
      realestate: -0.60, // PLACEHOLDER
      manufacturing: -0.70, // PLACEHOLDER
      technology: -0.65, // PLACEHOLDER
      staples: -0.20, // PLACEHOLDER
      energy: -0.55, // PLACEHOLDER
      agriculture: -0.50, // PLACEHOLDER
      bonds: 0.05, // PLACEHOLDER
      cash: 0.00, // PLACEHOLDER
    },
    debrief:
      'Banks that were overleveraged were wiped out. Gold — as a store of value outside the banking system — held its ground.',
  },
  {
    id: 2,
    year: 1997,
    title: 'The Asian Financial Crisis',
    briefing:
      'Currencies across a booming region are collapsing overnight. Capital is fleeing to safety at any cost.',
    researchQuestions: [
      'What happens to a portfolio when a regional currency devalues sharply?',
      'Why might holding cash outperform "safe" assets during a currency crisis?',
      'Which sectors are most exposed to foreign capital flight?',
    ],
    returns: {
      cash: 0.30, // CONFIRMED (intentionally counterintuitive)
      banking: -0.40, // PLACEHOLDER
      realestate: -0.35, // PLACEHOLDER
      manufacturing: -0.20, // PLACEHOLDER
      technology: 0.10, // PLACEHOLDER
      staples: 0.05, // PLACEHOLDER
      energy: -0.10, // PLACEHOLDER
      agriculture: -0.05, // PLACEHOLDER
      gold: 0.10, // PLACEHOLDER
      bonds: 0.08, // PLACEHOLDER
    },
    debrief:
      'Counterintuitively, cash outperformed almost everything — when currencies are collapsing, simply not being exposed was the winning move.',
  },
  {
    id: 3,
    year: 2000, // PLACEHOLDER year
    title: 'The Dot-Com Bust',
    briefing: 'Every company with a website has a stock price ten times its revenue. The music is about to stop.',
    researchQuestions: [
      'What distinguishes a speculative growth bubble from real earnings growth?',
      'Which "old economy" sectors are untouched by a tech-specific crash?',
      'Why might bonds and staples outperform during a growth-stock unwind?',
    ],
    returns: {
      // ALL PLACEHOLDER
      technology: -0.75,
      banking: -0.05,
      realestate: 0.05,
      manufacturing: -0.10,
      staples: 0.10,
      energy: 0.15,
      agriculture: 0.02,
      gold: 0.05,
      bonds: 0.10,
      cash: 0.03,
    },
    debrief: 'Technology valuations reverted hard. Boring, defensive sectors were the place to have been.',
  },
  {
    id: 4,
    year: 2008, // PLACEHOLDER year
    title: 'The Global Financial Crisis',
    briefing:
      'A housing bubble built on leveraged mortgage debt is unwinding across the entire financial system at once.',
    researchQuestions: [
      'How does a housing-driven crisis differ from a pure banking crisis?',
      'Which sectors are correlated with banking during a systemic credit crunch?',
      'What role does gold play when the crisis is global rather than regional?',
    ],
    returns: {
      // ALL PLACEHOLDER
      banking: -0.60,
      realestate: -0.45,
      manufacturing: -0.30,
      technology: -0.35,
      staples: 0.02,
      energy: -0.40,
      agriculture: -0.15,
      gold: 0.25,
      bonds: 0.15,
      cash: 0.02,
    },
    debrief: 'Real estate and banking fell together — this crisis, unlike 1929, started in housing and spread through leverage.',
  },
];
