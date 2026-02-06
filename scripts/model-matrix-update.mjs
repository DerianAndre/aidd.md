#!/usr/bin/env node
/**
 * Model Matrix Update — Fetches latest model data from OpenRouter API,
 * auto-updates metadata (context windows, pricing) in both the markdown SSOT
 * and TypeScript runtime, and reports new models from tracked providers.
 *
 * Usage:
 *   pnpm mcp:models:update             # fetch + auto-update files
 *   pnpm mcp:models:update --dry-run   # report only, no file writes
 *
 * Note: This script uses fetch() (built into Node 22) to call a public API.
 * No user input is passed to any shell command — safe from injection.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const PREFIX = '[aidd.md]';

// File paths
const MD_PATH = resolve(root, 'templates/model-matrix.md');
const TS_PATH = resolve(root, 'mcps/mcp-aidd-core/src/modules/routing/model-matrix.ts');

// Tracked providers and their OpenRouter prefixes
const TRACKED_PROVIDERS = {
  anthropic: { prefix: 'anthropic/', display: 'Anthropic' },
  openai: { prefix: 'openai/', display: 'OpenAI' },
  google: { prefix: 'google/', display: 'Google' },
  'x-ai': { prefix: 'x-ai/', display: 'xAI' },
  deepseek: { prefix: 'deepseek/', display: 'DeepSeek' },
  'meta-llama': { prefix: 'meta-llama/', display: 'Meta' },
  mistralai: { prefix: 'mistralai/', display: 'Mistral' },
};

// Map our local provider names to OpenRouter slug prefixes
const PROVIDER_SLUG_MAP = {
  anthropic: 'anthropic/',
  openai: 'openai/',
  google: 'google/',
  xai: 'x-ai/',
  deepseek: 'deepseek/',
  meta: 'meta-llama/',
  mistral: 'mistralai/',
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatCostValue(val) {
  if (val === 0) return '$0';
  const r = Math.round(val * 100) / 100;
  if (r >= 1 && r % 1 === 0) return `$${r}`;
  if (r >= 0.1) return `$${r.toFixed(2)}`;
  if (val >= 0.01) return `$${val.toFixed(3)}`;
  return `$${val.toFixed(4)}`;
}

function formatPricingMd(input, output) {
  return `${formatCostValue(input)} / ${formatCostValue(output)}`;
}

function formatContextMd(ctx) {
  if (ctx <= 0) return '?';
  const k = Math.round(ctx / 1000);
  return k >= 1000 ? `${Math.round(k / 1000)}M` : `${k}K`;
}

function formatContextTs(ctx) {
  return `${Math.round(ctx / 1000)}_000`;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Normalize model IDs for cross-platform comparison
// ---------------------------------------------------------------------------

/**
 * Normalizes model IDs to handle naming differences between our matrix and
 * OpenRouter's registry:
 *   - claude-opus-4-6        → claude-opus-4.6    (version hyphens → dots)
 *   - claude-sonnet-4-5-20250929 → claude-sonnet-4.5  (strip date suffix)
 *   - mistral-large-latest   → mistral-large       (strip -latest)
 */
function normalizeModelId(id) {
  return id
    .toLowerCase()
    .replace(/-\d{8}$/, '')          // Strip YYYYMMDD date suffixes
    .replace(/-latest$/, '')          // Strip -latest suffix
    .replace(/(\d)-(\d)/g, '$1.$2');  // Version hyphens → dots (4-6 → 4.6)
}

// ---------------------------------------------------------------------------
// Parse local TypeScript matrix
// ---------------------------------------------------------------------------

function parseLocalModels() {
  if (!existsSync(TS_PATH)) return [];

  const content = readFileSync(TS_PATH, 'utf-8');
  const models = [];
  const entryPattern = /\{\s*id:\s*'([^']+)',\s*provider:\s*'([^']+)',\s*name:\s*'([^']+)',\s*tier:\s*(\d)/g;
  let match;

  while ((match = entryPattern.exec(content)) !== null) {
    const endIdx = content.indexOf('},', match.index);
    const block = content.slice(match.index, endIdx > -1 ? endIdx + 2 : match.index + 500);
    const ctxMatch = block.match(/contextWindow:\s*([\d_]+)/);
    const selfHosted = !!block.match(/selfHosted:\s*true/);

    models.push({
      id: match[1],
      provider: match[2],
      name: match[3],
      tier: parseInt(match[4], 10),
      contextWindow: ctxMatch ? parseInt(ctxMatch[1].replace(/_/g, ''), 10) : 0,
      selfHosted,
    });
  }

  return models;
}

// ---------------------------------------------------------------------------
// Fetch from OpenRouter API (public, no auth required)
// ---------------------------------------------------------------------------

async function fetchOpenRouterModels() {
  console.log(`  ${DIM}Fetching models from OpenRouter API...${RESET}`);

  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`OpenRouter API returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data.data || [];
}

// ---------------------------------------------------------------------------
// Filter to tracked providers
// ---------------------------------------------------------------------------

function filterTrackedModels(openRouterModels) {
  const tracked = [];

  for (const model of openRouterModels) {
    for (const [, config] of Object.entries(TRACKED_PROVIDERS)) {
      if (model.id.startsWith(config.prefix)) {
        const pricing = model.pricing || {};

        tracked.push({
          openRouterId: model.id,
          providerDisplay: config.display,
          name: model.name || model.id,
          contextLength: model.context_length || 0,
          inputCostPer1M: parseFloat(pricing.prompt || '0') * 1_000_000,
          outputCostPer1M: parseFloat(pricing.completion || '0') * 1_000_000,
          created: model.created || 0,
        });
        break;
      }
    }
  }

  return tracked;
}

// ---------------------------------------------------------------------------
// Compare local vs remote — detect metadata changes
// ---------------------------------------------------------------------------

function compareModels(localModels, remoteModels, mdContent) {
  const matched = [];
  const missingFromRemote = [];
  const changes = [];
  const mdLines = mdContent.split('\n');

  for (const local of localModels) {
    if (local.selfHosted) continue;

    const prefix = PROVIDER_SLUG_MAP[local.provider];
    if (!prefix) continue;

    const nLocal = normalizeModelId(local.id);

    const remote = remoteModels.find(r => {
      const rid = r.openRouterId.toLowerCase();
      if (!rid.startsWith(prefix)) return false;

      const ridShort = rid.slice(prefix.length);

      // Exact match (pre-normalization)
      if (ridShort === local.id.toLowerCase()) return true;

      // Normalized match
      const nRemote = normalizeModelId(ridShort);
      if (nLocal === nRemote) return true;

      // Prefix match (handles mistral-large matching mistral-large-2411)
      if (nRemote.startsWith(nLocal) || nLocal.startsWith(nRemote)) return true;

      return false;
    });

    if (remote) {
      matched.push({ local, remote });

      // Detect metadata changes by comparing formatted values
      for (const line of mdLines) {
        if (!line.includes(`\`${local.id}\``)) continue;
        const cols = line.split('|').map(c => c.trim());
        if (cols.length < 7) break;

        const curCtx = cols[4];
        const curCost = cols[5];
        const newCtx = formatContextMd(remote.contextLength);
        const newCost = formatPricingMd(remote.inputCostPer1M, remote.outputCostPer1M);

        const ctxChanged = remote.contextLength > 0 && curCtx !== newCtx;
        const costChanged = remote.inputCostPer1M > 0 && curCost !== newCost;

        if (ctxChanged || costChanged) {
          changes.push({
            id: local.id,
            name: local.name,
            ctxChanged, oldCtx: curCtx, newCtx,
            costChanged, oldCost: curCost, newCost,
            newContextWindow: remote.contextLength,
          });
        }
        break;
      }
    } else {
      missingFromRemote.push(local);
    }
  }

  // New models from tracked providers not in our matrix
  const normalizedLocalIds = localModels.map(m => normalizeModelId(m.id));

  const newModels = remoteModels
    .filter(r => r.inputCostPer1M > 0 || r.outputCostPer1M > 0)
    .filter(r => {
      const shortId = r.openRouterId.split('/').slice(1).join('/').toLowerCase();
      const nRemote = normalizeModelId(shortId);
      return !normalizedLocalIds.some(nLocal =>
        nRemote === nLocal ||
        nRemote.startsWith(nLocal) ||
        nLocal.startsWith(nRemote),
      );
    })
    .sort((a, b) => b.created - a.created); // Latest first

  return { matched, missingFromRemote, newModels, changes };
}

// ---------------------------------------------------------------------------
// Apply updates to markdown SSOT
// ---------------------------------------------------------------------------

function applyMarkdownUpdates(changes) {
  let content = readFileSync(MD_PATH, 'utf-8');
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(eol);

  for (const c of changes) {
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes(`\`${c.id}\``)) continue;
      const cols = lines[i].split('|');
      if (cols.length < 7) break;
      if (c.ctxChanged) cols[4] = ` ${c.newCtx} `;
      if (c.costChanged) cols[5] = ` ${c.newCost} `;
      lines[i] = cols.join('|');
      break;
    }
  }

  // Update Last Updated date
  const today = new Date().toISOString().split('T')[0];
  content = lines.join(eol).replace(
    /\*\*Last Updated\*\*:\s*\d{4}-\d{2}-\d{2}/,
    `**Last Updated**: ${today}`,
  );

  writeFileSync(MD_PATH, content);
}

// ---------------------------------------------------------------------------
// Apply updates to TypeScript runtime
// ---------------------------------------------------------------------------

function applyTypeScriptUpdates(changes) {
  let content = readFileSync(TS_PATH, 'utf-8');
  let updated = false;

  for (const c of changes) {
    if (!c.ctxChanged) continue;
    const re = new RegExp(
      `(id:\\s*'${escapeRegex(c.id)}'[\\s\\S]*?contextWindow:\\s*)[\\d_]+`,
    );
    const next = content.replace(re, `$1${formatContextTs(c.newContextWindow)}`);
    if (next !== content) {
      content = next;
      updated = true;
    }
  }

  if (updated) writeFileSync(TS_PATH, content);
}

// ---------------------------------------------------------------------------
// Display report
// ---------------------------------------------------------------------------

function displayReport({ matched, missingFromRemote, newModels, changes }) {
  console.log(`\n${BOLD}Matched Models${RESET}\n`);
  console.log(`  ${GREEN}\u2713${RESET} ${matched.length} local models matched on OpenRouter`);

  // Metadata updates
  if (changes.length > 0) {
    const label = dryRun ? `${YELLOW}Updates Available` : `${GREEN}Auto-Updated`;
    const icon = dryRun ? YELLOW : GREEN;
    console.log(`\n${BOLD}${label}${RESET}\n`);
    for (const c of changes) {
      if (c.ctxChanged) {
        console.log(`  ${icon}\u2192${RESET} ${c.name}: context ${c.oldCtx} \u2192 ${c.newCtx}`);
      }
      if (c.costChanged) {
        console.log(`  ${icon}\u2192${RESET} ${c.name}: pricing ${c.oldCost} \u2192 ${c.newCost}`);
      }
    }
    if (dryRun) {
      console.log(`\n  ${DIM}Run without --dry-run to apply these updates.${RESET}`);
    }
  }

  // Models not found on OpenRouter
  if (missingFromRemote.length > 0) {
    console.log(`\n${BOLD}${YELLOW}Not Found on OpenRouter${RESET}\n`);
    for (const m of missingFromRemote) {
      console.log(`  ${YELLOW}!${RESET} ${m.id} (${m.provider}) \u2014 may be deprecated, renamed, or not on OpenRouter`);
    }
  }

  // New models — sorted by created date, latest first
  if (newModels.length > 0) {
    console.log(`\n${BOLD}${CYAN}New Models from Tracked Providers${RESET} ${DIM}(latest first)${RESET}\n`);

    const grouped = {};
    for (const m of newModels) {
      (grouped[m.providerDisplay] ??= []).push(m);
    }

    // Sort provider groups by their most recent model
    const sortedProviders = Object.entries(grouped)
      .sort(([, a], [, b]) => b[0].created - a[0].created);

    for (const [provider, models] of sortedProviders) {
      console.log(`  ${BOLD}${provider}${RESET}`);
      const top = models.slice(0, 8);
      for (const m of top) {
        const cost = m.inputCostPer1M > 0
          ? `$${m.inputCostPer1M.toFixed(2)}/$${m.outputCostPer1M.toFixed(2)} per 1M`
          : 'free';
        const ctx = m.contextLength > 0 ? `${Math.round(m.contextLength / 1000)}K ctx` : '? ctx';
        const date = m.created > 0
          ? new Date(m.created * 1000).toISOString().split('T')[0]
          : '?';
        console.log(`    ${DIM}[${date}] ${m.openRouterId} \u2014 ${m.name} (${ctx}, ${cost})${RESET}`);
      }
      if (models.length > 8) {
        console.log(`    ${DIM}... and ${models.length - 8} more${RESET}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`\n${BOLD}${PREFIX} Model Matrix Update${dryRun ? ' (dry run)' : ''}${RESET}\n`);

try {
  const localModels = parseLocalModels();
  console.log(`  ${GREEN}\u2713${RESET} Local matrix: ${localModels.length} models`);

  const allRemote = await fetchOpenRouterModels();
  const tracked = filterTrackedModels(allRemote);
  console.log(`  ${GREEN}\u2713${RESET} OpenRouter: ${allRemote.length} total, ${tracked.length} from tracked providers`);

  const mdContent = existsSync(MD_PATH) ? readFileSync(MD_PATH, 'utf-8') : '';
  const report = compareModels(localModels, tracked, mdContent);

  // Auto-update files when changes detected (unless --dry-run)
  if (report.changes.length > 0 && !dryRun) {
    applyMarkdownUpdates(report.changes);
    applyTypeScriptUpdates(report.changes);
  }

  displayReport(report);

  // Summary
  if (report.changes.length > 0 && !dryRun) {
    console.log(`\n${BOLD}${PREFIX}${RESET} ${GREEN}${report.changes.length} model(s) auto-updated in both files${RESET}`);
    console.log(`${DIM}Run: pnpm mcp:models:sync && pnpm mcp:typecheck && pnpm mcp:build${RESET}\n`);
  } else if (report.changes.length > 0 && dryRun) {
    console.log(`\n${BOLD}${PREFIX}${RESET} ${YELLOW}Updates available \u2014 run without --dry-run to apply${RESET}\n`);
  } else if (report.newModels.length > 0) {
    console.log(`\n${BOLD}${PREFIX}${RESET} ${YELLOW}New models available \u2014 review above and add to matrix if needed${RESET}`);
    console.log(`${DIM}Edit templates/model-matrix.md (SSOT), then update model-matrix.ts to match.${RESET}\n`);
  } else {
    console.log(`\n${BOLD}${PREFIX}${RESET} ${GREEN}Matrix is current${RESET}\n`);
  }
} catch (err) {
  console.log(`  ${RED}\u2717${RESET} Failed: ${err.message}`);
  console.log(`  ${DIM}The local sync check (pnpm mcp:models:sync) works offline.${RESET}\n`);
  process.exit(1);
}
