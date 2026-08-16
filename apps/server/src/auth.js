import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { applyCors } from './cors.js';

/**
 * Verifies a Supabase access token (HS256, signed with the project's JWT
 * secret) and extracts the authenticated user id.
 * @param {string} token
 * @returns {{ userId: string }}
 * @throws if the token is missing, malformed, expired, or invalid
 */
export function verifySupabaseJwt(token) {
  if (!token) {
    throw new Error('Missing token');
  }

  const decoded = jwt.verify(token, config.supabaseJwtSecret, { algorithms: ['HS256'] });

  if (!decoded || typeof decoded.sub !== 'string') {
    throw new Error('Token missing subject claim');
  }

  return { userId: decoded.sub };
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
      const { userId } = verifySupabaseJwt(token);
      req.userId = userId;
    } catch {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    await handler(req, res);
  };
}
