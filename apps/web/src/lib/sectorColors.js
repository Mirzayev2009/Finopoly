import { SECTORS } from '@estate/content';

/**
 * One fixed colour per sector, used consistently everywhere a sector shows
 * up (allocation rows, resolution animation, leaderboard, chart). Content
 * has no colour field by design (presentation concern) — this is where it
 * lives instead. Deliberately avoids green/red hues: those are reserved
 * exclusively for gain/loss signalling per the visual spec.
 */
const SECTOR_COLORS = {
  banking: '#4d8fdd',
  realestate: '#b97a4a',
  manufacturing: '#93a1b0',
  technology: '#9066ff',
  staples: '#e8c34a',
  energy: '#ff9642',
  agriculture: '#4fb8b0',
  gold: '#c9a66b',
  bonds: '#6a7fa8',
  cash: '#c7cad1',
};

for (const sector of SECTORS) {
  if (!(sector.id in SECTOR_COLORS)) {
    throw new Error(`No colour defined for sector "${sector.id}"`);
  }
}

/**
 * @param {string} sectorId
 * @returns {string} hex colour
 */
export function sectorColor(sectorId) {
  const color = SECTOR_COLORS[sectorId];
  if (!color) throw new Error(`No colour defined for sector "${sectorId}"`);
  return color;
}
