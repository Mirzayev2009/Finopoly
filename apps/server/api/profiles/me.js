import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';

// Assumed Supabase schema (not provisioned by this scaffold):
//
// create table profiles (
//   id uuid primary key references auth.users(id),
//   email text,
//   display_name text
// );

export default withAuth(async (req, res) => {
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
});
