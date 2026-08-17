import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}. Copy apps/server/.env.example to .env and fill it in.`);
  }
}

export const config = Object.freeze({
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
