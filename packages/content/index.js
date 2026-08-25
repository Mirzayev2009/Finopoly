export { SECTORS } from './sectors.js';
export { ROUNDS } from './events.js';
export { CARDS } from './cards.js';
export { BOARD } from './board.js';

// New game model (Market Masters). ERAS carries hidden card percentages and
// must stay server-only — apps/web imports ERA_BRIEFINGS instead, never ERAS.
// See era-briefings.js and scripts/check-content-boundary.js.
export { ERAS } from './eras.js';
export { ERA_BRIEFINGS } from './era-briefings.js';
export { NEWS_CARDS } from './news.js';
