/**
 * 20 market-news cards. Pure data, no logic, no imports. Era-agnostic — the
 * same deck runs for every era. `effect` matches the 20-case switch in
 * `docs/index.js` (the reference server) exactly; the server's switch
 * depends on these literal strings. `needs` declares what the server must
 * generate before applying the effect: 'target' | 'coin' | 'target+coin' |
 * null.
 */

export const NEWS_CARDS = [
  {
    id: 'multiplier-bull',
    title: 'Bull Run',
    body: "Momentum traders pile in and volume surges, echoing the meme-stock mania of early 2021 when retail flows briefly doubled the moves of ordinary trading days. Your next investment's result is doubled.",
    effect: 'MULTIPLIER',
    value: 2,
    needs: null,
  },
  {
    id: 'hedge-fund',
    title: 'Hedge Fund Protection',
    body: "You've hired a quant fund to run a protective hedge, the same tail-risk strategy that let firms like Universa profit while everyone else panicked in March 2020. Your next loss is erased.",
    effect: 'HEDGE_FUND',
    needs: null,
  },
  {
    id: 'insider-info',
    title: 'Insider Information',
    body: 'A source inside the exchange tips you off before the numbers go public, echoing the insider-trading scandals that put Raj Rajaratnam behind bars. Your next draw guarantees a winning card.',
    effect: 'INSIDER_INFO',
    needs: null,
  },
  {
    id: 'blind-faith',
    title: 'Blind Faith Rally',
    body: "Confidence is contagious — think of dot-com investors piling into any stock with '.com' in the name back in 1999. Your next gain, if you get one, is doubled.",
    effect: 'BLIND_FAITH',
    needs: null,
  },
  {
    id: 'big-short',
    title: 'The Big Short',
    body: "You've placed a contrarian bet against the market, the same trade Michael Burry made against subprime mortgages in 2007. Your next investment's result flips sign — a loser becomes a winner, and vice versa.",
    effect: 'BIG_SHORT',
    needs: null,
  },
  {
    id: 'monopoly-power',
    title: 'Monopoly Power',
    body: 'Market dominance has its privileges, the way Standard Oil once controlled nearly the entire U.S. refining industry before it was broken up. You draw five investment cards instead of three on your next turn.',
    effect: 'MONOPOLY_POWER',
    needs: null,
  },
  {
    id: 'freeze-assets',
    title: 'Assets Frozen',
    body: 'Regulators freeze an account pending review, just as sanctions froze hundreds of billions in Russian central bank reserves in 2022. Choose a team — they skip their next investment.',
    effect: 'FREEZE',
    needs: 'target',
  },
  {
    id: 'sabotage',
    title: 'Corporate Sabotage',
    body: "A rival leaks damaging information to the press, echoing the short-seller reports that torched Nikola and Wirecard's stock in a single day. Choose a team — their next draw guarantees a losing card.",
    effect: 'SABOTAGE',
    needs: 'target',
  },
  {
    id: 'wealth-tax',
    title: 'Wealth Tax',
    body: 'Lawmakers pass a new levy on the largest fortunes, echoing the proposals that followed the 2008 bailouts and the public anger at Wall Street. The team in first place pays 20% of their cash to the bank.',
    effect: 'WEALTH_TAX',
    needs: null,
  },
  {
    id: 'stimulus',
    title: 'Stimulus Checks',
    body: 'The government mails out relief payments, just like the CARES Act stimulus checks that hit bank accounts in April 2020. The team in first place funds a payout of 20% of their cash, split among everyone else.',
    effect: 'STIMULUS',
    needs: null,
  },
  {
    id: 'embezzle',
    title: 'Embezzlement Scheme',
    body: 'You quietly divert funds through a shell account, the kind of scheme that finally caught up with Bernie Madoff in 2008. Steal 20% of the cash held by the team in first place.',
    effect: 'EMBEZZLE',
    needs: null,
  },
  {
    id: 'philanthropy',
    title: 'Philanthropic Pledge',
    body: "Like Warren Buffett's Giving Pledge, you commit a share of your fortune to those with less. If you're not in last place, donate 25% of your cash to whoever is — but if you ARE in last place, every other team chips in 6.7% to bail you out instead.",
    effect: 'PHILANTHROPY',
    needs: null,
  },
  {
    id: 'audit',
    title: 'Tax Audit',
    body: 'The IRS flags your return for review, the fate that befalls thousands of filers with complex investment income every year. Flip a coin: heads and you gain 30% of your cash, tails and you pay 30% of it.',
    effect: 'AUDIT',
    needs: 'coin',
  },
  {
    id: 'bailout',
    title: 'Government Bailout',
    body: "If your cash has fallen below the starting amount, the government steps in with a rescue package, echoing TARP's $700 billion bank bailout in 2008. Your cash is restored to the starting amount.",
    effect: 'BAILOUT',
    needs: null,
  },
  {
    id: 'hostile-bid',
    title: 'Hostile Takeover Bid',
    body: 'You launch a hostile bid for a rival\'s assets, in the style of corporate raiders like Carl Icahn in the 1980s. Choose a team and flip a coin: win and you take 20% of their cash, lose and they take 20% of yours.',
    effect: 'HOSTILE_BID',
    needs: 'target+coin',
  },
  {
    id: 'boom',
    title: 'Economic Boom',
    body: 'A broad expansion lifts nearly every asset class at once, the way the post-WWII boom lifted stocks, real estate, and wages together for decades. Every team gains 20% of their current cash.',
    effect: 'BOOM',
    needs: null,
  },
  {
    id: 'robin-hood',
    title: 'The Robin Hood',
    body: 'Retail traders coordinate online to squeeze the biggest player, echoing the 2021 GameStop short squeeze that hit hedge funds hard. The team in first place loses 30% of their cash, split evenly among everyone else.',
    effect: 'ROBIN_HOOD',
    needs: null,
  },
  {
    id: 'black-swan',
    title: 'Black Swan Event',
    body: 'An unforeseeable shock rocks every market at once — a bank collapse, a global pandemic, a war nobody priced in. The moderator announces a global event affecting every team.',
    effect: 'BLACK_SWAN',
    needs: null,
  },
  {
    id: 'angel-investor',
    title: 'Angel Investor',
    body: 'A wealthy backer writes you a check on a hunch, the way early angels funded Amazon and Google before anyone else believed in them. You receive $1,000 in cash, and your next gain is doubled.',
    effect: 'ANGEL_INVESTOR',
    needs: null,
  },
  {
    id: 'high-stakes-coin',
    title: 'High Stakes Coin Flip',
    body: 'You go all-in on a single bet, the kind of leveraged gamble that made and broke traders like Jesse Livermore. Flip a coin: heads and you win 33% of your cash, tails and every other team splits $1,000 from the bank instead.',
    effect: 'HIGH_STAKES_COIN',
    needs: 'coin',
  },
];
