import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';

// Assumed Supabase schema (not provisioned by this scaffold):
//
// create table profiles (
//   id uuid primary key references auth.users(id),
//   email text,
//   display_name text
// );

const MAX_NAME_LENGTH = 60;

export default withAuth(async (req, res) => {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ profile: data ?? { id: req.userId } });
    return;
  }

  if (req.method === 'PATCH') {
    const displayName = typeof req.body?.display_name === 'string' ? req.body.display_name.trim() : '';
    if (!displayName) {
      res.status(400).json({ error: 'INVALID_NAME' });
      return;
    }
    if (displayName.length > MAX_NAME_LENGTH) {
      res.status(400).json({ error: 'NAME_TOO_LONG' });
      return;
    }

    // upsert (not update) so a user whose profiles row predates the
    // handle_new_user trigger still gets one created on first edit.
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: req.userId, display_name: displayName }, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ profile: data });
    return;
  }

  res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
});
