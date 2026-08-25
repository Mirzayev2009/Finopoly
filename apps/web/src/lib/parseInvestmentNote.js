/**
 * The server reveals a resolved investment's outcome as a formatted
 * transaction note (schema.sql's resolve_investment_core(), format string
 * 'Bet $%s on %s at %s%s%%') — by design, per the original spec: once a
 * team commits to a card, its full record becomes visible to the whole
 * room. This parses that note back into structured values for the
 * RESOLUTION phase, rather than rendering the raw sentence. Only ever
 * called on a note the server actually sent — never fabricates a
 * percentage.
 * @param {string} note
 * @returns {{ betAmount: number, cardName: string, percentage: number } | null}
 */
export function parseInvestmentNote(note) {
  if (typeof note !== 'string') return null;
  const match = note.match(/Bet \$([\d,]+) on (.+) at ([+-]?[\d.]+)%\s*$/);
  if (!match) return null;

  const [, betAmountStr, cardName, percentageStr] = match;
  return {
    betAmount: Number(betAmountStr.replace(/,/g, '')),
    cardName,
    percentage: Number(percentageStr),
  };
}
