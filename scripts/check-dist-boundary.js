// Defense-in-depth for the same boundary check-content-boundary.js enforces
// at the import level: after a production build, grep the emitted bundle
// for actual investment-card CONTENT from packages/content/eras.js — the
// full set of card names, e.g. "Lockheed Martin (LMT)" — and fail if any
// are found. Catches any leak the import-scan missed (a re-export chain, a
// future refactor). Run after `vite build`, against apps/web/dist.
//
// Earlier version of this check grepped for the literal key "percentage"
// instead, which is far too blunt: legitimate client code has entirely
// unrelated reasons to contain that word (a host-only `card.percentage`
// property access on server-sent data, a small helper that parses a
// percentage back out of a transaction note, even a CSS module class
// literally named `.percentage`) — all confirmed false positives when this
// was tried for real. Card NAMES are a much sharper signal: nothing
// legitimate in apps/web has any reason to contain "Lockheed Martin (LMT)"
// or "Terra (LUNA)" as a literal string, so a match here means the actual
// secret data table leaked in, not just a word that happens to overlap.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ERAS } from '../packages/content/eras.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'apps', 'web', 'dist');

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (/\.(js|mjs)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(distDir);
if (files.length === 0) {
  console.error(`check-dist-boundary: no built .js files found under ${distDir} — did the build run first?`);
  process.exit(1);
}

// Card names are the canary, but a handful are short common words/phrases
// ("Gold", "Cash", "TIPS") that legitimately appear in ERA_BRIEFINGS' own
// prose (summaries/impacts mention commodities and cash generically) — a
// real false positive when this was tried unfiltered. Keep only names with
// a parenthetical ticker/qualifier or long enough (15+ chars) to be
// distinctive; nothing legitimate has a reason to contain e.g. "Lockheed
// Martin (LMT)" or "Speculative Real Estate Syndicates" as a literal string.
const cardNames = ERAS.flatMap((era) => era.investments.map((inv) => inv.name))
  .filter((name) => name.includes('(') || name.length >= 15);

const hits = [];
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const name of cardNames) {
    if (content.includes(name)) {
      hits.push({ file, name });
      break; // one hit per file is enough to fail; no need to enumerate all 720
    }
  }
}

if (hits.length > 0) {
  console.error('Content boundary violation: investment card data was found in the built client bundle.\n');
  for (const { file, name } of hits) console.error(`  ${file}: contains "${name}"`);
  process.exit(1);
}

console.log(`Dist boundary check passed (${files.length} built files scanned against ${cardNames.length} card names, none found).`);
