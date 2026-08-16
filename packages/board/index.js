/**
 * Static board configuration for Estate, shared verbatim by apps/web and
 * apps/server. This module has zero dependencies and no I/O — it only
 * exports frozen data. Districts are original names (not Hasbro street
 * names) laid out on the standard 40-space Monopoly-style track, with
 * standard-rules numbers (prices, rent tiers, house costs, mortgage
 * values) carried over so packages/engine has real numbers to work with
 * once game rules are implemented.
 *
 * Space shape:
 *   {
 *     id: number,                 // 0-39, board position
 *     type: 'go'|'property'|'railroad'|'utility'|'tax'|'chance'|'chest'|
 *           'jail'|'gotojail'|'parking',
 *     name: string,
 *     color?: string,             // property group key
 *     price?: number,
 *     rent?: number[],            // [base, 1house, 2houses, 3houses, 4houses, hotel]
 *                                  // for railroads: [1 owned, 2 owned, 3 owned, 4 owned]
 *                                  // for utilities: [ownedOne, ownedBoth] dice multipliers
 *     houseCost?: number,
 *     mortgage?: number,
 *   }
 */

function space(partial) {
  return Object.freeze({ ...partial });
}

export const BOARD = Object.freeze([
  space({ id: 0, type: 'go', name: 'GO' }),

  space({
    id: 1, type: 'property', name: 'Salt Flats', color: 'brown',
    price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, mortgage: 30,
  }),
  space({ id: 2, type: 'chest', name: 'Public Ledger' }),
  space({
    id: 3, type: 'property', name: 'Cinder Row', color: 'brown',
    price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, mortgage: 30,
  }),
  space({ id: 4, type: 'tax', name: 'City Tax', price: 200 }),
  space({
    id: 5, type: 'railroad', name: 'Northbridge Transit',
    price: 200, rent: [25, 50, 100, 200], mortgage: 100,
  }),
  space({
    id: 6, type: 'property', name: 'Harbor Steps', color: 'lightblue',
    price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50,
  }),
  space({ id: 7, type: 'chance', name: 'Fortune' }),
  space({
    id: 8, type: 'property', name: 'Ferry Landing', color: 'lightblue',
    price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, mortgage: 50,
  }),
  space({
    id: 9, type: 'property', name: 'Lighthouse Point', color: 'lightblue',
    price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, mortgage: 60,
  }),

  space({ id: 10, type: 'jail', name: 'Detention' }),

  space({
    id: 11, type: 'property', name: 'Paper Lantern Square', color: 'pink',
    price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70,
  }),
  space({
    id: 12, type: 'utility', name: 'Gridworks Co.',
    price: 150, rent: [4, 10], mortgage: 75,
  }),
  space({
    id: 13, type: 'property', name: 'Silk Market', color: 'pink',
    price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, mortgage: 70,
  }),
  space({
    id: 14, type: 'property', name: 'Jade Terrace', color: 'pink',
    price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, mortgage: 80,
  }),
  space({
    id: 15, type: 'railroad', name: 'Eastgate Transit',
    price: 200, rent: [25, 50, 100, 200], mortgage: 100,
  }),
  space({
    id: 16, type: 'property', name: 'Bazaar Street', color: 'orange',
    price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90,
  }),
  space({ id: 17, type: 'chest', name: 'Public Ledger' }),
  space({
    id: 18, type: 'property', name: 'Spice Quarter', color: 'orange',
    price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, mortgage: 90,
  }),
  space({
    id: 19, type: 'property', name: 'Coppergate', color: 'orange',
    price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, mortgage: 100,
  }),

  space({ id: 20, type: 'parking', name: 'Central Plaza' }),

  space({
    id: 21, type: 'property', name: 'Ironworks Avenue', color: 'red',
    price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110,
  }),
  space({ id: 22, type: 'chance', name: 'Fortune' }),
  space({
    id: 23, type: 'property', name: 'Foundry Plaza', color: 'red',
    price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, mortgage: 110,
  }),
  space({
    id: 24, type: 'property', name: 'Smokestack Row', color: 'red',
    price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, mortgage: 120,
  }),
  space({
    id: 25, type: 'railroad', name: 'Southport Transit',
    price: 200, rent: [25, 50, 100, 200], mortgage: 100,
  }),
  space({
    id: 26, type: 'property', name: 'Starlight Boulevard', color: 'yellow',
    price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130,
  }),
  space({
    id: 27, type: 'property', name: 'Neon Row', color: 'yellow',
    price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, mortgage: 130,
  }),
  space({
    id: 28, type: 'utility', name: 'Aqueduct Co.',
    price: 150, rent: [4, 10], mortgage: 75,
  }),
  space({
    id: 29, type: 'property', name: 'Marquee Avenue', color: 'yellow',
    price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, mortgage: 140,
  }),

  space({ id: 30, type: 'gotojail', name: 'To Detention' }),

  space({
    id: 31, type: 'property', name: 'Meridian Park', color: 'green',
    price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150,
  }),
  space({
    id: 32, type: 'property', name: 'Skyline Terrace', color: 'green',
    price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, mortgage: 150,
  }),
  space({ id: 33, type: 'chest', name: 'Public Ledger' }),
  space({
    id: 34, type: 'property', name: 'Crown Heights', color: 'green',
    price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, mortgage: 160,
  }),
  space({
    id: 35, type: 'railroad', name: 'Westline Transit',
    price: 200, rent: [25, 50, 100, 200], mortgage: 100,
  }),
  space({ id: 36, type: 'chance', name: 'Fortune' }),
  space({
    id: 37, type: 'property', name: 'Summit Avenue', color: 'darkblue',
    price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, mortgage: 175,
  }),
  space({ id: 38, type: 'tax', name: 'Luxury Tax', price: 100 }),
  space({
    id: 39, type: 'property', name: 'Pinnacle Court', color: 'darkblue',
    price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, mortgage: 200,
  }),
]);

// Card stubs only — no effect logic here. Effects belong to packages/engine
// and are intentionally not implemented yet.
export const CHANCE = Object.freeze([
  Object.freeze({ id: 'chance-1', text: 'Advance to GO' }),
  Object.freeze({ id: 'chance-2', text: 'Advance to Pinnacle Court' }),
  Object.freeze({ id: 'chance-3', text: 'Advance to Harbor Steps' }),
  Object.freeze({ id: 'chance-4', text: 'Advance to the nearest Transit Line' }),
  Object.freeze({ id: 'chance-5', text: 'Advance to the nearest Utility' }),
  Object.freeze({ id: 'chance-6', text: 'Bank pays you a dividend of $50' }),
  Object.freeze({ id: 'chance-7', text: 'Go to Detention' }),
  Object.freeze({ id: 'chance-8', text: 'Get out of Detention free' }),
  Object.freeze({ id: 'chance-9', text: 'Go back 3 spaces' }),
  Object.freeze({ id: 'chance-10', text: 'Make general repairs on all your property' }),
  Object.freeze({ id: 'chance-11', text: 'Pay a fine of $15' }),
  Object.freeze({ id: 'chance-12', text: 'Take a trip to Summit Avenue' }),
  Object.freeze({ id: 'chance-13', text: 'Take a walk to the nearest Railroad' }),
  Object.freeze({ id: 'chance-14', text: 'You have been elected chairperson, pay each player $50' }),
  Object.freeze({ id: 'chance-15', text: 'Your building loan matures, collect $150' }),
  Object.freeze({ id: 'chance-16', text: 'You have won a crossword competition, collect $100' }),
]);

export const CHEST = Object.freeze([
  Object.freeze({ id: 'chest-1', text: 'Advance to GO' }),
  Object.freeze({ id: 'chest-2', text: 'Bank error in your favor, collect $200' }),
  Object.freeze({ id: 'chest-3', text: 'Doctor fee, pay $50' }),
  Object.freeze({ id: 'chest-4', text: 'From sale of stock you get $50' }),
  Object.freeze({ id: 'chest-5', text: 'Get out of Detention free' }),
  Object.freeze({ id: 'chest-6', text: 'Go to Detention' }),
  Object.freeze({ id: 'chest-7', text: 'Holiday fund matures, collect $100' }),
  Object.freeze({ id: 'chest-8', text: 'Income tax refund, collect $20' }),
  Object.freeze({ id: 'chest-9', text: 'It is your birthday, collect $10 from every player' }),
  Object.freeze({ id: 'chest-10', text: 'Life insurance matures, collect $100' }),
  Object.freeze({ id: 'chest-11', text: 'Pay hospital fees of $100' }),
  Object.freeze({ id: 'chest-12', text: 'Pay school fees of $150' }),
  Object.freeze({ id: 'chest-13', text: 'Receive $25 consultancy fee' }),
  Object.freeze({ id: 'chest-14', text: 'You are assessed for street repair' }),
  Object.freeze({ id: 'chest-15', text: 'You have won second prize in a beauty contest, collect $10' }),
  Object.freeze({ id: 'chest-16', text: 'You inherit $100' }),
]);
