#!/usr/bin/env node
/**
 * LTUM Symbol Map
 * Metadata-only index of exports/imports for selective hydration.
 *
 * Usage:
 *   node scripts/ltum/symbol-map.mjs
 *   node scripts/ltum/symbol-map.mjs --path mcps/mcp-aidd-core --json
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

const SKIP_DIRS = new Set([
  '.git',
  '.aidd',
  'node_modules',
  'dist',
  'target',
  '.turbo',
  'researchs',
]);

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.rs']);

function parseArgs(argv) {
  const args = { path: '', json: false, limit: 500 };
  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    if (current === '--path' && argv[i + 1]) {
      args.path = String(argv[i + 1]).replaceAll('\\', '/');
      i++;
    } else if (current === '--json') {
      args.json = true;
    } else if (current === '--limit' && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) args.limit = Math.floor(parsed);
      i++;
    }
  }
  return args;
}

function walk(dir, out) {
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    const rel = full.replaceAll('\\', '/').replace(root.replaceAll('\\', '/') + '/', '');
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
      continue;
    }

    const ext = '.' + entry.name.split('.').pop();
    if (!CODE_EXT.has(ext)) continue;
    out.push(rel);
  }
}

function extract(content, isRust) {
  const exports = [];
  const imports = [];

  if (isRust) {
    const pubPattern = /\bpub\s+(?:async\s+)?(?:fn|struct|enum|trait|mod|type)\s+([A-Za-z_][A-Za-z0-9_]*)/g;
    let m;
    while ((m = pubPattern.exec(content)) !== null) exports.push(m[1]);
    return { exports, imports };
  }

  const exportPattern =
    /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([A-Za-z_][A-Za-z0-9_]*)/g;
  const namedPattern = /\bexport\s*\{\s*([^}]+)\s*\}/g;
  const importPattern = /\bimport\s+[^'"]*from\s+['"]([^'"]+)['"]/g;

  let match;
  while ((match = exportPattern.exec(content)) !== null) exports.push(match[1]);
  while ((match = namedPattern.exec(content)) !== null) {
    const names = match[1]
      .split(',')
      .map((n) => n.trim().split(/\s+as\s+/i)[0])
      .filter(Boolean);
    exports.push(...names);
  }
  while ((match = importPattern.exec(content)) !== null) imports.push(match[1]);

  return { exports: [...new Set(exports)], imports: [...new Set(imports)] };
}

function collect(args) {
  const files = [];
  walk(root, files);

  const filtered = args.path
    ? files.filter((f) => f.startsWith(args.path))
    : files;

  const map = [];
  for (const relPath of filtered.slice(0, args.limit)) {
    let content = '';
    try {
      content = readFileSync(resolve(root, relPath), 'utf8');
    } catch {
      continue;
    }
    const isRust = relPath.endsWith('.rs');
    const { exports, imports } = extract(content, isRust);
    map.push({
      file: relPath,
      size: statSync(resolve(root, relPath)).size,
      exports,
      imports: imports.slice(0, 20),
    });
  }

  return map;
}

const args = parseArgs(process.argv.slice(2));
const map = collect(args);

if (args.json) {
  process.stdout.write(JSON.stringify({
    root,
    count: map.length,
    files: map,
  }, null, 2));
  process.exit(0);
}

console.log(`[LTUM] Symbol map: ${map.length} files`);
for (const entry of map.slice(0, 80)) {
  const ex = entry.exports.length ? entry.exports.join(', ') : 'none';
  console.log(`- ${entry.file} :: exports=[${ex}] imports=${entry.imports.length}`);
}
