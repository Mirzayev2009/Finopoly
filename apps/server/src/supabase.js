import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// service_role client — full DB access, bypasses RLS. Server-only.
// Never import this file from apps/web.
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
