import { config } from '../config.js';

/**
 * Sends one Realtime broadcast message to a topic via Supabase's REST
 * broadcast endpoint, using the service_role key. A plain fetch, not a
 * websocket — a Vercel invocation is too short-lived to justify opening
 * (and tearing down) a socket connection for a single one-shot send.
 * @param {string} topic e.g. 'room:room-a', 'host:room-a', 'global'
 * @param {string} event
 * @param {object} payload
 */
export async function sendBroadcast(topic, event, payload) {
  const res = await fetch(`${config.supabaseUrl}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    },
    body: JSON.stringify({
      messages: [{ topic, event, payload, private: true }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Realtime broadcast failed (${res.status}): ${body}`);
  }
}

export const roomTopic = (slug) => `room:${slug}`;
export const hostTopic = (slug) => `host:${slug}`;
export const GLOBAL_TOPIC = 'global';
