import { config } from './config.js';

/**
 * Applies CORS headers for the single allowed client origin and handles
 * OPTIONS preflight. apps/web and apps/server are deployed as separate
 * Vercel projects (different origins), so every function needs this.
 * @returns {boolean} true if the caller should return immediately
 *   (an OPTIONS preflight was answered and needs no further handling)
 */
export function applyCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', config.clientOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
