#!/usr/bin/env node
/**
 * Model Matrix Sync — Validates that model-matrix.md and model-matrix.ts are in sync.
 * Also checks for upcoming deprecations.
 * Usage: node scripts/model-matrix-sync.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const PREFIX = '[aidd.md]';

// ---------------------------------------------------------------------------
// Parse markdown tables for model IDs
// ---------------------------------------------------------------------------

function parseMarkdownModels(content) {
  const models = [];
  const tierSections = [
    { pattern: /### Tier 1/i, tier: 1 },
    { pattern: /### Tier 2/i, tier: 2 },
    { pattern: /### Tier 3/i, tier: 3 },
  ];

  for (const { pattern, tier } of tierSections) {
    const sectionStart = content.search(pattern);
    if (sectionStart === -1) continue;

    const sectionContent = content.slice(sectionStart);
    const lines = sectionContent.split('\n');
    let inTable = false;
    let headerParsed = false;

    for (const line of lines) {
      if (line.startsWith('###') && inTable) break;
      if (line.startsWith('|') && line.includes('Provider')) {
        inTable = true;
        continue;
      }
      if (inTable && line.startsWith('|---')) {
        headerParsed = true;
        continue;
      }
      if (inTable && headerParsed && line.startsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 4) {
          const provider = cells[0].toLowerCase().replace(/\*\*/g, '');
          const name = cells[1].replace(/\*\*/g, '');
          const id = cells[2].replace(/`/g, '');
          const status = cells[cells.length - 1].toLowerCase();
          models.push({ id, provider, name, tier, status });
        }
      }
      if (inTable && headerParsed && !line.startsWith('|') && line.trim() !== '') {
        break;
      }
    }
  }

  return models;
}

// ---------------------------------------------------------------------------
// Parse TypeScript source for model entries
// ---------------------------------------------------------------------------

function parseTsModels(content) {
  const models = [];
  const entryPattern = /\{\s*id:\s*'([^']+)',\s*provider:\s*'([^']+)',\s*name:\s*'([^']+)',\s*tier:\s*(\d)/g;
  let match;

  while ((match = entryPattern.exec(content)) !== null) {
    const statusMatch = content.slice(match.index).match(/status:\s*'([^']+)'/);
    models.push({
      id: match[1],
      provider: match[2],
      name: match[3],
      tier: parseInt(match[4], 10),
      status: statusMatch ? statusMatch[1] : 'active',
    });
  }

  return models;
}

// ---------------------------------------------------------------------------
// Parse deprecation tracker from markdown
// ---------------------------------------------------------------------------

function parseDeprecations(content) {
  const deprecations = [];
  const depSection = content.indexOf('## 5. Deprecation Tracker');
  if (depSection === -1) return deprecations;

  const lines = content.slice(depSection).split('\n');
  let inTable = false;
  let headerParsed = false;

  for (const line of lines) {
    if (line.startsWith('##') && inTable) break;
    if (line.startsWith('|') && line.includes('Provider')) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith('|---')) {
      headerParsed = true;
      continue;
    }
    if (inTable && headerParsed && line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 5) {
        deprecations.push({
          provider: cells[0],
          model: cells[1],
          date: cells[2],
          migrateTo: cells[3],
          status: cells[4].toLowerCase(),
        });
      }
    }
  }

  return deprecations;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const mdPath = resolve(root, 'templates/model-matrix.md');
const tsPath = resolve(root, 'mcps/mcp-aidd-core/src/modules/routing/model-matrix.ts');

let issues = 0;
let warnings = 0;

function pass(msg) { console.log(`  ${GREEN}\u2713${RESET} ${msg}`); }
function fail(msg) { console.log(`  ${RED}\u2717${RESET} ${msg}`); issues++; }
function warn(msg) { console.log(`  ${YELLOW}!${RESET} ${msg}`); warnings++; }

console.log(`\n${BOLD}${PREFIX} Model Matrix Sync Check${RESET}\n`);

// Show file paths relative to root
const mdRelPath = 'templates/model-matrix.md';
const tsRelPath = 'mcps/mcp-aidd-core/src/modules/routing/model-matrix.ts';
console.log(`  ${DIM}SSOT:    ${mdRelPath}${RESET}`);
console.log(`  ${DIM}Runtime: ${tsRelPath}${RESET}\n`);

if (!existsSync(mdPath)) {
  fail(`${mdRelPath} not found`);
  process.exit(1);
}
if (!existsSync(tsPath)) {
  fail(`${tsRelPath} not found`);
  process.exit(1);
}

const mdContent = readFileSync(mdPath, 'utf-8');
const tsContent = readFileSync(tsPath, 'utf-8');

const mdModels = parseMarkdownModels(mdContent);
const tsModels = parseTsModels(tsContent);

pass(`Markdown: ${mdModels.length} models parsed`);
pass(`TypeScript: ${tsModels.length} models parsed`);

// Compare model IDs
console.log(`\n${BOLD}Sync Status${RESET}\n`);

const mdIds = new Set(mdModels.map(m => m.id));
const tsIds = new Set(tsModels.map(m => m.id));

const inMdOnly = mdModels.filter(m => !tsIds.has(m.id));
const inTsOnly = tsModels.filter(m => !mdIds.has(m.id));

if (inMdOnly.length === 0 && inTsOnly.length === 0) {
  pass('All model IDs are in sync');
} else {
  if (inMdOnly.length > 0) {
    fail(`Models in markdown but missing from TypeScript:`);
    for (const m of inMdOnly) {
      console.log(`    ${DIM}- ${m.id} (${m.provider}, tier ${m.tier})${RESET}`);
    }
  }
  if (inTsOnly.length > 0) {
    fail(`Models in TypeScript but missing from markdown:`);
    for (const m of inTsOnly) {
      console.log(`    ${DIM}- ${m.id} (${m.provider}, tier ${m.tier})${RESET}`);
    }
  }
}

// Compare tier assignments
const tierMismatches = [];
for (const mdModel of mdModels) {
  const tsModel = tsModels.find(m => m.id === mdModel.id);
  if (tsModel && tsModel.tier !== mdModel.tier) {
    tierMismatches.push({ id: mdModel.id, mdTier: mdModel.tier, tsTier: tsModel.tier });
  }
}

if (tierMismatches.length === 0) {
  pass('All tier assignments match');
} else {
  fail(`Tier mismatches found:`);
  for (const m of tierMismatches) {
    console.log(`    ${DIM}- ${m.id}: markdown=tier${m.mdTier}, typescript=tier${m.tsTier}${RESET}`);
  }
}

// Check deprecations
console.log(`\n${BOLD}Deprecation Alerts${RESET}\n`);

const deprecations = parseDeprecations(mdContent);
const now = new Date();
const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

let upcomingCount = 0;
let pastCount = 0;

for (const dep of deprecations) {
  const depDate = new Date(dep.date);
  const diffMs = depDate.getTime() - now.getTime();

  if (diffMs < 0) {
    pastCount++;
    warn(`${dep.provider} ${dep.model} \u2014 deprecated since ${dep.date} \u2192 migrate to ${dep.migrateTo}`);
  } else if (diffMs < thirtyDaysMs) {
    upcomingCount++;
    const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    warn(`${dep.provider} ${dep.model} \u2014 deprecates in ${daysLeft} days (${dep.date}) \u2192 migrate to ${dep.migrateTo}`);
  }
}

if (upcomingCount === 0 && pastCount === 0) {
  pass('No upcoming deprecations within 30 days');
}

// Check last updated date
const lastUpdatedMatch = mdContent.match(/\*\*Last Updated\*\*:\s*(\d{4}-\d{2}-\d{2})/);
if (lastUpdatedMatch) {
  const lastUpdated = new Date(lastUpdatedMatch[1]);
  const daysSince = Math.floor((now.getTime() - lastUpdated.getTime()) / (24 * 60 * 60 * 1000));
  if (daysSince > 30) {
    warn(`Model matrix last updated ${daysSince} days ago (${lastUpdatedMatch[1]}) \u2014 consider running pnpm mcp:models:update`);
  } else {
    pass(`Model matrix last updated ${daysSince} day(s) ago`);
  }
}

// Summary
console.log(`\n${BOLD}${PREFIX} Summary${RESET}: ${issues === 0 ? `${GREEN}IN SYNC` : `${RED}${issues} ISSUE(S)`}${warnings > 0 ? ` ${YELLOW}${warnings} warning(s)` : ''}${RESET}\n`);

process.exit(issues > 0 ? 1 : 0);
