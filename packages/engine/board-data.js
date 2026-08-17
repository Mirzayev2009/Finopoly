/**
 * Engine-internal board ruleset data — numbers only, no display names.
 *
 * Deliberately NOT imported from @estate/board: this package is zero
 * dependencies. The numbers below are the same canonical values as
 * packages/board/index.js, duplicated on purpose. packages/board's
 * CHANCE/CHEST arrays carry only { id, text } (no effect metadata), so
 * card *effects* have to live here regardless of the dependency question.
 *
 * Space shape: { id, type, color?, price?, rent?, houseCost?, mortgage? }
 * rent format matches packages/board: property = [base,1,2,3,4,hotel],
 * railroad = [1,2,3,4 owned], utility = [oneOwned, bothOwned] dice multipliers.
 */

function space(partial) {
  return Object.freeze({ ...partial });
}

export const SPACES = Object.freeze([
  space({ id: 0, type: 'go' }),

  space({ id: 1, type: 'property', color: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgage: 30 }),
  space({ id: 2, type: 'chest' }),
  space({ id: 3, type: 'property', color: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgage: 30 }),
  space({ id: 4, type: 'tax', price: 200 }),
  space({ id: 5, type: 'railroad', price: 200, rent: [25, 50, 100, 200], mortgage: 100 }),
  space({ id: 6, type: 'property', color: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50 }),
  space({ id: 7, type: 'chance' }),
  space({ id: 8, type: 'property', color: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50 }),
  space({ id: 9, type: 'property', color: 'lightblue', price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgage: 60 }),

  space({ id: 10, type: 'jail' }),

  space({ id: 11, type: 'property', color: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70 }),
  space({ id: 12, type: 'utility', price: 150, rent: [4, 10], mortgage: 75 }),
  space({ id: 13, type: 'property', color: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70 }),
  space({ id: 14, type: 'property', color: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgage: 80 }),
  space({ id: 15, type: 'railroad', price: 200, rent: [25, 50, 100, 200], mortgage: 100 }),
  space({ id: 16, type: 'property', color: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90 }),
  space({ id: 17, type: 'chest' }),
  space({ id: 18, type: 'property', color: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90 }),
  space({ id: 19, type: 'property', color: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgage: 100 }),

  space({ id: 20, type: 'parking' }),

  space({ id: 21, type: 'property', color: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110 }),
  space({ id: 22, type: 'chance' }),
  space({ id: 23, type: 'property', color: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110 }),
  space({ id: 24, type: 'property', color: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgage: 120 }),
  space({ id: 25, type: 'railroad', price: 200, rent: [25, 50, 100, 200], mortgage: 100 }),
  space({ id: 26, type: 'property', color: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130 }),
  space({ id: 27, type: 'property', color: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130 }),
  space({ id: 28, type: 'utility', price: 150, rent: [4, 10], mortgage: 75 }),
  space({ id: 29, type: 'property', color: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgage: 140 }),

  space({ id: 30, type: 'gotojail' }),

  space({ id: 31, type: 'property', color: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150 }),
  space({ id: 32, type: 'property', color: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150 }),
  space({ id: 33, type: 'chest' }),
  space({ id: 34, type: 'property', color: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgage: 160 }),
  space({ id: 35, type: 'railroad', price: 200, rent: [25, 50, 100, 200], mortgage: 100 }),
  space({ id: 36, type: 'chance' }),
  space({ id: 37, type: 'property', color: 'darkblue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgage: 175 }),
  space({ id: 38, type: 'tax', price: 100 }),
  space({ id: 39, type: 'property', color: 'darkblue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgage: 200 }),
]);

export const JAIL_SPACE_ID = 10;
export const GO_SPACE_ID = 0;

export const COLOR_GROUPS = Object.freeze(
  SPACES.filter((s) => s.type === 'property').reduce((groups, s) => {
    groups[s.color] = groups[s.color] || [];
    groups[s.color].push(s.id);
    return groups;
  }, {}),
);

export const RAILROAD_IDS = Object.freeze(SPACES.filter((s) => s.type === 'railroad').map((s) => s.id));
export const UTILITY_IDS = Object.freeze(SPACES.filter((s) => s.type === 'utility').map((s) => s.id));

function card(id, effect) {
  return Object.freeze({ id, effect: Object.freeze(effect) });
}

// Self-authored effect tables (packages/board's CHANCE/CHEST carry no
// effect metadata — see file header). Not required to match the display
// text in packages/board card-for-card; the two are intentionally decoupled.
export const CHANCE_CARDS = Object.freeze([
  card('chance-1', { type: 'ADVANCE_TO', spaceId: GO_SPACE_ID }),
  card('chance-2', { type: 'ADVANCE_TO', spaceId: 39 }),
  card('chance-3', { type: 'ADVANCE_TO', spaceId: 6 }),
  card('chance-4', { type: 'ADVANCE_TO_NEAREST_RAILROAD' }),
  card('chance-5', { type: 'ADVANCE_TO_NEAREST_UTILITY' }),
  card('chance-6', { type: 'COLLECT', amount: 50 }),
  card('chance-7', { type: 'GOTO_JAIL' }),
  card('chance-8', { type: 'JAIL_FREE' }),
  card('chance-9', { type: 'GO_BACK', spaces: 3 }),
  card('chance-10', { type: 'REPAIRS', perHouse: 25, perHotel: 100 }),
  card('chance-11', { type: 'PAY', amount: 15 }),
  card('chance-12', { type: 'ADVANCE_TO', spaceId: 37 }),
  card('chance-13', { type: 'ADVANCE_TO_NEAREST_RAILROAD' }),
  card('chance-14', { type: 'PAY_EACH_PLAYER', amount: 50 }),
  card('chance-15', { type: 'COLLECT', amount: 150 }),
  card('chance-16', { type: 'COLLECT', amount: 100 }),
]);

export const CHEST_CARDS = Object.freeze([
  card('chest-1', { type: 'ADVANCE_TO', spaceId: GO_SPACE_ID }),
  card('chest-2', { type: 'COLLECT', amount: 200 }),
  card('chest-3', { type: 'PAY', amount: 50 }),
  card('chest-4', { type: 'COLLECT', amount: 50 }),
  card('chest-5', { type: 'JAIL_FREE' }),
  card('chest-6', { type: 'GOTO_JAIL' }),
  card('chest-7', { type: 'COLLECT', amount: 100 }),
  card('chest-8', { type: 'COLLECT', amount: 20 }),
  card('chest-9', { type: 'COLLECT_FROM_EACH_PLAYER', amount: 10 }),
  card('chest-10', { type: 'COLLECT', amount: 100 }),
  card('chest-11', { type: 'PAY', amount: 100 }),
  card('chest-12', { type: 'PAY', amount: 150 }),
  card('chest-13', { type: 'COLLECT', amount: 25 }),
  card('chest-14', { type: 'REPAIRS', perHouse: 40, perHotel: 115 }),
  card('chest-15', { type: 'COLLECT', amount: 10 }),
  card('chest-16', { type: 'COLLECT', amount: 100 }),
]);
