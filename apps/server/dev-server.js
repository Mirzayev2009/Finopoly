import { existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config } from './src/config.js';

// Local emulator for the api/ folder that gets deployed to Vercel as
// individual serverless functions. Maps request paths to files the same
// way Vercel's file-based routing does (/api/games/create ->
// api/games/create.js) and decorates (req, res) with the same
// res.status(code).json(obj) helpers Vercel's Node runtime provides, so
// the handler files themselves are 100% unaware this isn't Vercel.
// This file is dev-only and is never deployed.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(__dirname, 'api');

async function resolveHandler(pathname) {
  const relative = pathname.replace(/^\/api\/?/, '');
  const filePath = path.join(API_DIR, `${relative}.js`);
  if (!filePath.startsWith(API_DIR) || !existsSync(filePath)) return null;

  const mod = await import(pathToFileURL(filePath).href);
  return mod.default;
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => resolve(raw));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  const handler = await resolveHandler(url.pathname);
  if (!handler) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return;
  }

  req.query = Object.fromEntries(url.searchParams);
  const raw = await readBody(req);
  try {
    req.body = raw ? JSON.parse(raw) : {};
  } catch {
    req.body = {};
  }

  try {
    await handler(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.listen(config.port, () => {
  console.log(`estate api dev server (local emulator) listening on :${config.port}`);
});
