const FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * @param {number} amount
 * @returns {string} e.g. "$100,000.00"
 */
export function formatMoney(amount) {
  return FORMATTER.format(amount);
}

/**
 * @param {number} amount
 * @returns {string} e.g. "+$30,000.00" or "-$85,000.00"
 */
export function formatSignedMoney(amount) {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}${FORMATTER.format(Math.abs(amount))}`;
}

/**
 * @param {number} pct e.g. 0.30 or -0.85
 * @returns {string} e.g. "+30%" or "-85%"
 */
export function formatPct(pct) {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${Math.round(pct * 100)}%`;
}
