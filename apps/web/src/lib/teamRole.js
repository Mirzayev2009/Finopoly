// Role (Market Analyst / Investment Strategist / Risk Manager) is a local,
// per-device display preference — the server (schema.sql) has no column for
// it, and this feature is additive UI flavor, not a scored game mechanic, so
// it's kept client-side rather than requiring a server change.
export const ROLE_STORAGE_KEY = 'finopoly:myRole';

export const ROLE_LABELS = {
  analyst: 'Market Analyst',
  strategist: 'Investment Strategist',
  risk_manager: 'Risk Manager',
};

export function getMyRole() {
  const id = localStorage.getItem(ROLE_STORAGE_KEY);
  return id ? { id, label: ROLE_LABELS[id] ?? id } : null;
}
