#!/usr/bin/env node
/**
 * LTUM Hydrate Range
 * Reads only the requested line window from a file.
 *
 * Usage:
 *   node scripts/ltum/hydrate-range.mjs --file mcps/mcp-aidd-core/src/modules/bootstrap/index.ts --start 170 --end 260
 *   node scripts/ltum/hydrate-range.mjs --file apps/hub/src/lib/tauri.ts --around 120 --radius 30
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const args = {
    file: '',
    start: null,
    end: null,
    around: null,
    radius: 30,
  };

  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    const next = argv[i + 1];
    if (current === '--file' && next) {
      args.file = String(next);
      i++;
    } else if (current === '--start' && next) {
      args.start = Number(next);
      i++;
    } else if (current === '--end' && next) {
      args.end = Number(next);
      i++;
    } else if (current === '--around' && next) {
      args.around = Number(next);
      i++;
    } else if (current === '--radius' && next) {
      const parsed = Number(next);
      if (Number.isFinite(parsed) && parsed > 0) args.radius = Math.floor(parsed);
      i++;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.file) {
  process.stderr.write('Usage: node scripts/ltum/hydrate-range.mjs --file <path> [--start N --end M | --around N --radius R]\n');
  process.exit(1);
}

const fullPath = resolve(root, args.file);
if (!existsSync(fullPath)) {
  process.stderr.write(`File not found: ${args.file}\n`);
  process.exit(1);
}

const lines = readFileSync(fullPath, 'utf8').split('\n');
let start = args.start;
let end = args.end;

if (args.around != null) {
  start = Math.max(1, Math.floor(args.around) - args.radius);
  end = Math.min(lines.length, Math.floor(args.around) + args.radius);
}

if (start == null) start = 1;
if (end == null) end = lines.length;
start = Math.max(1, Math.min(lines.length, Math.floor(start)));
end = Math.max(start, Math.min(lines.length, Math.floor(end)));

console.log(`# ${args.file}:${start}-${end}`);
for (let i = start; i <= end; i++) {
  console.log(`${i}:${lines[i - 1]}`);
}
