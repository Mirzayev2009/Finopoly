import { applyCors } from '../src/cors.js';

export default function handler(req, res) {
  if (applyCors(req, res)) return;
  res.status(200).json({ ok: true });
}
