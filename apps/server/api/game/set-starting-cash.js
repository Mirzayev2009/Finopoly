import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';

/** Admin, before start. Body: { amount: number } */
export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const amount = req.body?.amount;
  if (typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ error: 'INVALID_AMOUNT' });
    return;
  }

  const { data, error } = await supabase.rpc('set_starting_cash', {
    p_actor_id: req.userId,
    p_amount: amount,
  });
  if (error) throw error;

  res.status(200).json(data);
});
