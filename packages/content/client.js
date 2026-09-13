/**
 * apps/web's ONLY allowed entry point into packages/content — import from
 * '@estate/content/client', never the bare '@estate/content' package root.
 *
 * The root index.js re-exports ERAS from eras.js, and eras.js has a
 * top-level side effect (its build-time integrity assertion), which stops
 * bundlers from safely tree-shaking it out of the graph even for a consumer
 * that only imports BOARD or ERA_BRIEFINGS — confirmed by inspecting a real
 * `vite build` output, which still contained all 720 investment cards'
 * percentages after importing the root package. This file imports nothing
 * from eras.js (era-briefings.js is a static, non-importing file — see its
 * own header), so eras.js is never reachable from anything that imports
 * this file, and never ships to the browser.
 *
 * This file is now guarding two secret-content files, not one: SPACE_OPTIONS
 * (packages/content/space-options.js, hidden per-space percentages) must
 * never be added here either — the whole reason SUBMIT_INVESTMENT's
 * percentages stay hidden pre-bet is that neither this file nor apps/web
 * ever imports the file that holds them.
 */
export { ERA_BRIEFINGS } from './era-briefings.js';
export { BOARD } from './board.js';
export { NEWS_CARDS } from './news.js';
