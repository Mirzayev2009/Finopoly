import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';

/** GET /api/rooms/list — room slugs/names for the /select picker. No secrets here. */
export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const { data, error } = await supabase.from('rooms').select('slug, name, phase').order('slug');
  if (error) throw error;

  res.status(200).json({ rooms: data ?? [] });
});
