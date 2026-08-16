import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy apps/web/.env.example to .env.local and fill it in.');
}

// anon client only — the service_role key must never reach the browser.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
