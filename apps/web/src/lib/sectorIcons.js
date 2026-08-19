import {
  Bank,
  Coins,
  Cpu,
  Factory,
  House,
  Lightning,
  Plant,
  Scroll,
  ShoppingCart,
  Wallet,
} from '@phosphor-icons/react';
import { SECTORS } from '@estate/content';

/**
 * Sector icon set, drawn from one consistent icon library — not the emoji
 * glyphs `@estate/content`'s sectors.js carries in its `icon` field (that
 * package is off-limits to edit; this is the presentation-layer mapping
 * that replaces it in the UI).
 */
const SECTOR_ICONS = {
  banking: Bank,
  realestate: House,
  manufacturing: Factory,
  technology: Cpu,
  staples: ShoppingCart,
  energy: Lightning,
  agriculture: Plant,
  gold: Coins,
  bonds: Scroll,
  cash: Wallet,
};

for (const sector of SECTORS) {
  if (!(sector.id in SECTOR_ICONS)) {
    throw new Error(`No icon defined for sector "${sector.id}"`);
  }
}

/**
 * @param {string} sectorId
 * @returns {React.ComponentType} a Phosphor icon component
 */
export function sectorIcon(sectorId) {
  const Icon = SECTOR_ICONS[sectorId];
  if (!Icon) throw new Error(`No icon defined for sector "${sectorId}"`);
  return Icon;
}
