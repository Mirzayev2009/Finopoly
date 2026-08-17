import { supabase } from './supabase.js';
import { applyCors } from './cors.js';

/**
 * Verifies a Supabase access token and extracts the authenticated user id.
 * Delegates to Supabase's own Auth server (via the service-role client)
 * rather than verifying the JWT signature locally — this works regardless
 * of whether the project signs tokens with the legacy shared HS256 secret
 * or the newer asymmetric (ES256/RS256) signing keys, and needs no
 * secret-matching configuration on our side.
 * @param {string} token
 * @returns {Promise<{ userId: string }>}
 * @throws if the token is missing, expired, or invalid
 */
export async function verifySupabaseJwt(token) {
  if (!token) {
    throw new Error('Missing token');
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error('Invalid token');
  }

  return { userId: data.user.id };
}

/**
 * Wraps a Vercel serverless function handler: applies CORS, requires
 * `Authorization: Bearer <token>`, and sets req.userId on success. This is
 * the single place both REST-style handlers share the JWT check, since
 * serverless functions have no middleware chain to attach it to once.
 * @param {(req, res) => Promise<void>|void} handler
 */
export function withAuth(handler) {
  return async (req, res) => {
    if (applyCors(req, res)) return;

    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    try {
      const { userId } = await verifySupabaseJwt(token);
      req.userId = userId;
    } catch {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    await handler(req, res);
  };
}
