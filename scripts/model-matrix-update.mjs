#!/usr/bin/env node
/**
 * Model Matrix Update — Fetches latest model data from OpenRouter API
 * and compares with the local model matrix to detect changes.
 * Usage: node scripts/model-matrix-update.mjs
 *
 * Note: This script uses fetch() (built into Node 22) to call a public API.
 * No user input is passed to any shell command — safe from injection.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const PREFIX = '[aidd.md]';

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
// Parse local TypeScript matrix
// ---------------------------------------------------------------------------

function parseLocalModels() {
  const tsPath = resolve(root, 'mcps/mcp-aidd-core/src/modules/routing/model-matrix.ts');
  if (!existsSync(tsPath)) return [];

  const content = readFileSync(tsPath, 'utf-8');
  const models = [];
  const entryPattern = /\{\s*id:\s*'([^']+)',\s*provider:\s*'([^']+)',\s*name:\s*'([^']+)',\s*tier:\s*(\d)/g;
  let match;

  while ((match = entryPattern.exec(content)) !== null) {
    const selfHostedMatch = content.slice(match.index, match.index + 500).match(/selfHosted:\s*true/);
    models.push({
      id: match[1],
      provider: match[2],
      name: match[3],
      tier: parseInt(match[4], 10),
      selfHosted: !!selfHostedMatch,
    });
  }

  return models;
}

// ---------------------------------------------------------------------------
// Fetch from OpenRouter API (public, no auth required)
// ---------------------------------------------------------------------------

const OPENROUTER_API = 'https://openrouter.ai/api/v1/models';

async function fetchOpenRouterModels() {
  console.log(`  ${DIM}Fetching models from OpenRouter API...${RESET}`);

  const response = await fetch(OPENROUTER_API, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
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
        const inputCost = parseFloat(pricing.prompt || '0') * 1_000_000;
        const outputCost = parseFloat(pricing.completion || '0') * 1_000_000;

        tracked.push({
          openRouterId: model.id,
          providerDisplay: config.display,
          name: model.name || model.id,
          contextLength: model.context_length || 0,
          inputCostPer1M: inputCost,
          outputCostPer1M: outputCost,
        });
        break;
      }
    }
  }

  return tracked;
}

// ---------------------------------------------------------------------------
// Compare local vs remote
// ---------------------------------------------------------------------------

function compareModels(localModels, remoteModels) {
  const matchedModels = [];
  const missingFromRemote = [];
  const newModelsFromTrackedProviders = [];

  for (const local of localModels) {
    if (local.selfHosted) continue;

    const prefix = PROVIDER_SLUG_MAP[local.provider];
    if (!prefix) continue;

    const remoteMatch = remoteModels.find(r => {
      const rid = r.openRouterId.toLowerCase();
      const lid = local.id.toLowerCase();
      return rid === `${prefix}${lid}` || rid.includes(lid);
    });

    if (remoteMatch) {
      matchedModels.push({ local, remote: remoteMatch });
    } else {
      missingFromRemote.push(local);
    }
  }

  // Find new models from tracked providers not in our matrix
  const localIds = new Set(localModels.map(m => m.id.toLowerCase()));

  const significantModels = remoteModels.filter(r => {
    if (r.inputCostPer1M === 0 && r.outputCostPer1M === 0) return false;
    return true;
  });

  for (const remote of significantModels) {
    const shortId = remote.openRouterId.split('/').slice(1).join('/').toLowerCase();
    const isKnown = [...localIds].some(id =>
      shortId.includes(id) || id.includes(shortId)
    );
    if (!isKnown) {
      newModelsFromTrackedProviders.push(remote);
    }
  }

  return { matchedModels, missingFromRemote, newModelsFromTrackedProviders };
}

// ---------------------------------------------------------------------------
// Display report
// ---------------------------------------------------------------------------

function displayReport(report) {
  console.log(`\n${BOLD}Matched Models${RESET}\n`);
  console.log(`  ${GREEN}\u2713${RESET} ${report.matchedModels.length} local models found on OpenRouter`);

  if (report.missingFromRemote.length > 0) {
    console.log(`\n${BOLD}${YELLOW}Models Not Found on OpenRouter${RESET}\n`);
    for (const m of report.missingFromRemote) {
      console.log(`  ${YELLOW}!${RESET} ${m.id} (${m.provider}) \u2014 may be deprecated, renamed, or not on OpenRouter`);
    }
  }

  if (report.newModelsFromTrackedProviders.length > 0) {
    console.log(`\n${BOLD}${CYAN}New Models from Tracked Providers${RESET}\n`);

    const grouped = {};
    for (const m of report.newModelsFromTrackedProviders) {
      if (!grouped[m.providerDisplay]) grouped[m.providerDisplay] = [];
      grouped[m.providerDisplay].push(m);
    }

    for (const [provider, models] of Object.entries(grouped)) {
      console.log(`  ${BOLD}${provider}${RESET}`);
      const sorted = models
        .sort((a, b) => b.inputCostPer1M - a.inputCostPer1M)
        .slice(0, 5);
      for (const m of sorted) {
        const cost = m.inputCostPer1M > 0
          ? `$${m.inputCostPer1M.toFixed(2)}/$${m.outputCostPer1M.toFixed(2)} per 1M`
          : 'free';
        const ctx = m.contextLength > 0 ? `${Math.round(m.contextLength / 1000)}K ctx` : '? ctx';
        console.log(`    ${DIM}${m.openRouterId} \u2014 ${m.name} (${ctx}, ${cost})${RESET}`);
      }
      if (models.length > 5) {
        console.log(`    ${DIM}... and ${models.length - 5} more${RESET}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`\n${BOLD}${PREFIX} Model Matrix Update Check${RESET}\n`);

try {
  const localModels = parseLocalModels();
  console.log(`  ${GREEN}\u2713${RESET} Local matrix: ${localModels.length} models`);

  const remoteModels = await fetchOpenRouterModels();
  const trackedRemote = filterTrackedModels(remoteModels);
  console.log(`  ${GREEN}\u2713${RESET} OpenRouter: ${remoteModels.length} total, ${trackedRemote.length} from tracked providers`);

  const report = compareModels(localModels, trackedRemote);
  displayReport(report);

  const hasUpdates = report.missingFromRemote.length > 0 || report.newModelsFromTrackedProviders.length > 0;
  console.log(`\n${BOLD}${PREFIX} Summary${RESET}: ${hasUpdates ? `${YELLOW}Updates available` : `${GREEN}Matrix is current`}${RESET}`);

  if (hasUpdates) {
    console.log(`\n${DIM}To update: edit templates/model-matrix.md (SSOT) then update model-matrix.ts to match.${RESET}`);
    console.log(`${DIM}Run pnpm mcp:models:sync to verify sync after edits.${RESET}\n`);
  } else {
    console.log('');
  }
} catch (err) {
  console.log(`  ${RED}\u2717${RESET} Failed: ${err.message}`);
  console.log(`  ${DIM}The local sync check (pnpm mcp:models:sync) works offline.${RESET}\n`);
  process.exit(1);
}
