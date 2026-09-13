// Fails the build if apps/web imports packages/content/eras.js or
// space-options.js (directly or via a relative deep-import), names ERAS or
// SPACE_OPTIONS in an import, or imports the bare '@estate/content' package
// root instead of '@estate/content/client'. Both files carry hidden
// per-card/per-space percentages that must never reach the browser.
//
// The bare root is unsafe even without naming either export: index.js
// re-exports ERAS from eras.js, and eras.js has a top-level side effect (its
// build-time integrity assertion), which stops bundlers from safely
// tree-shaking it out of the graph for a consumer that only imports e.g.
// BOARD — confirmed by inspecting a real `vite build` output, which still
// contained all 720 investment cards' percentages after importing only
// BOARD from the root package. '@estate/content/client'
// (packages/content/client.js) is a separate entry point that never touches
// eras.js or space-options.js at all. Run as apps/web's prebuild/pretest
// step. See packages/content/era-briefings.js and client.js.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webSrc = path.join(__dirname, '..', 'apps', 'web', 'src');

const IMPORT_RE = /^\s*import\s+(?:type\s+)?(\{[^}]*\}|\*\s+as\s+\w+|\w+)?[^'"]*from\s*['"]([^'"]+)['"]/;

// Every packages/content file that carries hidden percentages and must never
// reach the browser. Add an entry here (not a new copy-pasted check) for any
// future secret-content module.
const PROTECTED = [
  { fileName: 'eras.js', exportName: 'ERAS', hint: "use ERA_BRIEFINGS from '@estate/content/client' instead" },
  { fileName: 'space-options.js', exportName: 'SPACE_OPTIONS', hint: 'this is server-only, hidden-percentage content' },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (/\.(js|jsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function checkFile(file) {
  const violations = [];
  const lines = readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, i) => {
    const match = line.match(IMPORT_RE);
    if (!match) return;
    const [, bindings = '', specifier] = match;
    const lineNo = i + 1;

    for (const { fileName, hint } of PROTECTED) {
      if (specifier.includes(`packages/content/${fileName}`) || specifier.endsWith(`/${fileName}`)) {
        violations.push(`${file}:${lineNo}: imports ${fileName} directly — ${hint}`);
        return;
      }
    }

    if (specifier === '@estate/content') {
      const names = PROTECTED.map((p) => p.exportName).join('/');
      violations.push(`${file}:${lineNo}: imports the bare '@estate/content' package root — use '@estate/content/client' instead (the root re-exports ${names} and isn't tree-shake-safe)`);
      return;
    }

    if (specifier.startsWith('@estate/content/')) {
      for (const { exportName, hint } of PROTECTED) {
        if (new RegExp(`\\b${exportName}\\b`).test(bindings)) {
          violations.push(`${file}:${lineNo}: imports ${exportName} — ${hint}`);
        }
      }
    }
  });

  return violations;
}

const files = walk(webSrc);
const violations = files.flatMap(checkFile);

if (violations.length > 0) {
  console.error('Content boundary violation: apps/web must never import ERAS (only ERA_BRIEFINGS).\n');
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

console.log(`Content boundary check passed (${files.length} files scanned, apps/web/src).`);
