/**
 * Deterministic PRNG + shuffle helpers. No Math.random, no I/O — every
 * result is a pure function of the seed/array passed in.
 */

/**
 * mulberry32: small, fast, well-distributed seeded PRNG (public domain).
 * @param {number} seed
 * @returns {() => number} a function returning floats in [0, 1)
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle. Does not mutate the input array.
 * @param {any[]} array
 * @param {() => number} rng
 * @returns {any[]}
 */
export function shuffle(array, rng) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
