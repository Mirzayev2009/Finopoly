/**
 * DEMO/placeholder investment options, one fixed set of 3 per asset space —
 * replaces the old shared-deck-of-72-cards-per-era model. Real content will
 * replace this later; only the shape matters right now:
 * {id, name, assetType, reason, percentage, type}, exactly what
 * resolve_investment_core(), stripCards(), and every client component that
 * renders a drawn card already expect.
 *
 * Server-only, same protection tier as eras.js (hidden percentages) — never
 * import this from apps/web/src or re-export it from client.js. See
 * scripts/check-content-boundary.js / check-dist-boundary.js.
 */
import { BOARD } from './board.js';

const ASSET_TYPES = ['Stock', 'ETF', 'REIT', 'Fund', 'Bond'];

const TEMPLATES = [
  { label: 'Growth Play', type: 'Good', range: [12, 30] },
  { label: 'Momentum Trade', type: 'Good', range: [4, 16] },
  { label: 'Value Warning', type: 'Bad', range: [-25, -6] },
];

const GROUP_LABELS = {
  financials: 'Financials',
  consumer: 'Consumer',
  energy: 'Energy',
  realestate: 'Real Estate',
  tech: 'Tech',
  industrials: 'Industrials',
  macro: 'Macro',
  crypto: 'Crypto',
};

// Deterministic, not Math.random() — stable across reloads/rebuilds until
// this file is deliberately regenerated with real content.
function seededFraction(seed) {
  const x = Math.sin(seed * 999.7) * 10000;
  return x - Math.floor(x);
}

function seededInt(seed, min, max) {
  return min + Math.floor(seededFraction(seed) * (max - min + 1));
}

function buildOptions(space) {
  const groupLabel = GROUP_LABELS[space.group] ?? 'General';
  return TEMPLATES.map((tpl, i) => {
    const seed = space.id * 10 + i;
    const [lo, hi] = tpl.range;
    const percentage = seededInt(seed, lo, hi);
    const assetType = ASSET_TYPES[seededInt(seed + 1, 0, ASSET_TYPES.length - 1)];
    return {
      id: `space-${space.id}-${i}`,
      name: `${groupLabel} ${tpl.label} (${space.name})`,
      assetType,
      reason: `Demo placeholder tied to ${space.name} — replace with real research.`,
      percentage,
      type: tpl.type,
    };
  });
}

export const SPACE_OPTIONS = Object.fromEntries(
  BOARD.filter((space) => space.type === 'asset').map((space) => [space.id, buildOptions(space)])
);

/**
 * Build-time integrity check, mirrors eras.js's assertEras — every asset
 * space on the board must have exactly 3 options, or a team landing there
 * would hit a runtime error instead of failing loudly at import time.
 */
(function assertSpaceOptions(board, options) {
  for (const space of board) {
    if (space.type !== 'asset') continue;
    const opts = options[space.id];
    if (!Array.isArray(opts) || opts.length !== 3) {
      throw new Error(`[space-options.js] space ${space.id} ("${space.name}"): expected 3 options, got ${opts?.length ?? 0}`);
    }
    for (const opt of opts) {
      if (typeof opt.percentage !== 'number' || !Number.isFinite(opt.percentage)) {
        throw new Error(`[space-options.js] space ${space.id}, option "${opt.id}": percentage is not a finite number (${opt.percentage})`);
      }
    }
  }
})(BOARD, SPACE_OPTIONS);
