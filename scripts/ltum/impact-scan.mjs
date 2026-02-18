#!/usr/bin/env node
/**
 * LTUM Impact Scan
 * Finds where a symbol/file is referenced to enable differential hydration.
 *
 * Usage:
 *   node scripts/ltum/impact-scan.mjs --symbol aidd_start
 *   node scripts/ltum/impact-scan.mjs --symbol SessionState --path mcps --json
 */
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const args = { symbol: '', path: '.', json: false, limit: 200 };
  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    if (current === '--symbol' && argv[i + 1]) {
      args.symbol = String(argv[i + 1]);
      i++;
    } else if (current === '--path' && argv[i + 1]) {
      args.path = String(argv[i + 1]);
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

function runRg(pattern, path, limit) {
  const cmd =
    `rg -n --hidden --glob "!node_modules/**" --glob "!dist/**" --glob "!target/**" ` +
    `--glob "!researchs/**" --glob "!.aidd/**" --max-count ${limit} ${pattern} ${path}`;
  try {
    const output = execSync(cmd, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const args = parseArgs(process.argv.slice(2));
if (!args.symbol) {
  process.stderr.write('Usage: node scripts/ltum/impact-scan.mjs --symbol <name> [--path <dir>] [--json]\n');
  process.exit(1);
}

const escaped = args.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const usages = runRg(`"${escaped}"`, args.path, args.limit);
const definitions = runRg(`"(export|function|class|type|interface|enum|pub\\s+(fn|struct|enum|trait|type))\\s+${escaped}"`, args.path, args.limit);

const report = {
  symbol: args.symbol,
  path: args.path,
  usageCount: usages.length,
  definitionCount: definitions.length,
  definitions,
  usages,
};

if (args.json) {
  process.stdout.write(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(`[LTUM] Impact scan for "${args.symbol}"`);
console.log(`- path: ${args.path}`);
console.log(`- definitions: ${definitions.length}`);
for (const line of definitions.slice(0, 20)) console.log(`  - ${line}`);
console.log(`- usages: ${usages.length}`);
for (const line of usages.slice(0, 40)) console.log(`  - ${line}`);
