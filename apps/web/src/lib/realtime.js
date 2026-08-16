import { supabase } from './supabase.js';

/**
 * Subscribes to realtime UPDATE events on a single game's row (its
 * `state`, `status`, `version` columns). Requires Realtime enabled for
 * the `games` table (Database > Replication) and an RLS SELECT policy
 * letting the caller read this row.
 * @param {string} gameId
 * @param {(row: object) => void} onChange
 * @returns {() => void} unsubscribe
 */
export function subscribeToGame(gameId, onChange) {
  const channel = supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      (payload) => onChange(payload.new),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribes to lobby membership/ready changes for a game. Realtime's
 * postgres_changes only tells you a row changed, not the full set, so on
 * any change this re-fetches the whole player list and hands it back.
 * Requires Realtime enabled for `game_players`.
 * @param {string} gameId
 * @param {(players: object[]) => void} onChange
 * @returns {() => void} unsubscribe
 */
export function subscribeToPlayers(gameId, onChange) {
  const refetch = async () => {
    const { data } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true });
    onChange(data ?? []);
  };

  const channel = supabase
    .channel(`players:${gameId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
      refetch,
    )
    .subscribe(() => refetch());

  return () => supabase.removeChannel(channel);
}
