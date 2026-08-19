import { describe, expect, it } from 'vitest';
import { act, advancePhase, makeGame } from './helpers.js';

describe('RESOLVE_CARD — REVEAL_SECTOR', () => {
  it('insider-tip adds the chosen sector to revealedSectors and leaves holdings untouched', () => {
    let state = makeGame();
    state = advancePhase(state, 4); // -> MARKET_EVENTS, round 1

    // Hand-built override simulating a card having already been drawn —
    // isolates the RESOLVE_CARD effect logic from deck-shuffle order.
    state = {
      ...state,
      teams: state.teams.map((t) =>
        t.id === 'team-a' ? { ...t, pendingCard: { cardId: 'insider-tip', drawnAt: 0 } } : t,
      ),
    };
    const before = state.teams.find((t) => t.id === 'team-a').holdings;

    const result = act(state, 'risk-a', 'RESOLVE_CARD', { choice: 'gold' });

    expect(result.error).toBeNull();
    const team = result.state.teams.find((t) => t.id === 'team-a');
    expect(team.revealedSectors).toContain('gold');
    expect(team.pendingCard).toBeNull();
    expect(team.holdings).toEqual(before);
  });

  it('requires a choice when the card has no fixed sectorId', () => {
    let state = makeGame();
    state = advancePhase(state, 4);
    state = {
      ...state,
      teams: state.teams.map((t) =>
        t.id === 'team-a' ? { ...t, pendingCard: { cardId: 'insider-tip', drawnAt: 0 } } : t,
      ),
    };

    const result = act(state, 'risk-a', 'RESOLVE_CARD', {});
    expect(result.error).toBe('CHOICE_REQUIRED');
  });

  it('risk_manager only', () => {
    let state = makeGame();
    state = advancePhase(state, 4);
    state = {
      ...state,
      teams: state.teams.map((t) =>
        t.id === 'team-a' ? { ...t, pendingCard: { cardId: 'insider-tip', drawnAt: 0 } } : t,
      ),
    };

    const result = act(state, 'strategist-a', 'RESOLVE_CARD', { choice: 'gold' });
    expect(result.error).toBe('WRONG_ROLE');
  });
});
