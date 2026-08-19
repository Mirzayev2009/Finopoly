import { CARDS } from '@estate/content';
import { mulberry32, shuffle } from './rng.js';

// Large odd multiplier so successive reshuffle seeds don't correlate with
// the original seed or with each other (structuredClone can only carry
// plain data across a draft, never a live RNG generator, so the seed and a
// reshuffle counter are what state actually stores).
const RESHUFFLE_MULTIPLIER = 2654435761;

/**
 * @param {number} seed
 * @returns {{ cards: number[], seed: number, reshuffles: number }}
 */
export function initDeck(seed) {
  const rng = mulberry32(seed);
  return {
    cards: shuffle(CARDS.map((_, i) => i), rng),
    seed,
    reshuffles: 0,
  };
}

/**
 * Draws the next card index, reshuffling deterministically if the deck is
 * exhausted. Mutates the decks draft in place (caller already owns a
 * structuredClone'd draft, matching the rest of the engine's convention).
 * @param {{ cards: number[], seed: number, reshuffles: number }} decksDraft
 * @returns {number} card index into CARDS
 */
export function drawCard(decksDraft) {
  if (decksDraft.cards.length === 0) {
    decksDraft.reshuffles += 1;
    const nextSeed = (decksDraft.seed + decksDraft.reshuffles * RESHUFFLE_MULTIPLIER) >>> 0;
    const rng = mulberry32(nextSeed);
    decksDraft.cards = shuffle(CARDS.map((_, i) => i), rng);
  }
  return decksDraft.cards.shift();
}
