import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';

/** Admin, before start. Body: { eraIds: string[] } */
export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const eraIds = req.body?.eraIds;
  if (!Array.isArray(eraIds) || eraIds.length === 0) {
    res.status(400).json({ error: 'MISSING_ERA_IDS' });
    return;
  }

  const { data, error } = await supabase.rpc('set_era_sequence', {
    p_actor_id: req.userId,
    p_era_ids: eraIds,
  });
  if (error) throw error;

  res.status(200).json(data);
});
