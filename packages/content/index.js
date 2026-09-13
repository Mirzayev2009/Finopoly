export { SECTORS } from './sectors.js';
export { ROUNDS } from './events.js';
export { CARDS } from './cards.js';
export { BOARD } from './board.js';

// New game model (Market Masters). ERAS and SPACE_OPTIONS both carry hidden
// percentages and must stay server-only — apps/web never imports either
// directly. See era-briefings.js, client.js, and
// scripts/check-content-boundary.js / check-dist-boundary.js.
export { ERAS } from './eras.js';
export { ERA_BRIEFINGS } from './era-briefings.js';
export { NEWS_CARDS } from './news.js';
export { SPACE_OPTIONS } from './space-options.js';
