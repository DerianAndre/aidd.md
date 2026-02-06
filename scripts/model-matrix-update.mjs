#!/usr/bin/env node
/**
 * Model Matrix Update — Dual-source consensus system.
 * Fetches model data from OpenRouter API + LiteLLM GitHub dataset,
 * cross-validates values, and only auto-updates when both sources agree.
 *
 * Usage:
 *   pnpm mcp:models:update             # fetch + auto-update (consensus only)
 *   pnpm mcp:models:update --dry-run   # report only, no file writes
 *   pnpm mcp:models:update --force     # apply even single-source / conflicting data
 *
 * Consensus rules:
 *   Both sources agree (within tolerance)  → auto-update (HIGH confidence)
 *   Sources disagree                       → flag conflict, do NOT auto-update
 *   Only one source has data               → report as unverified, do NOT auto-update
 *
 * Note: Uses fetch() (Node 22 built-in). No user input passed to shell commands.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

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

// ---------------------------------------------------------------------------
// Consensus thresholds
// ---------------------------------------------------------------------------

/** Context window values within 15% of each other are considered "agreeing" */
const CONTEXT_TOLERANCE = 0.15;

/** Pricing values within 25% of each other are considered "agreeing" */
const PRICE_TOLERANCE = 0.25;

/**
 * Magnitude sanity checks — even if both sources agree, flag as SUSPICIOUS
 * if the change from our current value is too large. This catches cases where
 * both sources match to the wrong model variant.
 */
const MAX_CONTEXT_CHANGE_RATIO = 2.0;   // Flag if context changes by more than 2x
const MAX_PRICING_CHANGE_RATIO = 3.0;   // Flag if pricing changes by more than 3x

// ---------------------------------------------------------------------------
// Provider mappings
// ---------------------------------------------------------------------------

// OpenRouter provider slug prefixes
const OR_PROVIDER_PREFIXES = {
  anthropic: 'anthropic/',
  openai: 'openai/',
  google: 'google/',
  xai: 'x-ai/',
  deepseek: 'deepseek/',
  meta: 'meta-llama/',
  mistral: 'mistralai/',
};

// LiteLLM provider names (litellm_provider field)
const LL_PROVIDER_NAMES = {
  anthropic: ['anthropic'],
  openai: ['openai', 'text-completion-openai'],
  google: ['gemini', 'vertex_ai', 'vertex_ai_beta'],
  xai: ['xai'],
  deepseek: ['deepseek'],
  meta: ['fireworks_ai', 'together_ai', 'groq'],
  mistral: ['mistral'],
};

// Tracked providers for new model discovery
const TRACKED_PROVIDERS = {
  anthropic: { prefix: 'anthropic/', display: 'Anthropic' },
  openai: { prefix: 'openai/', display: 'OpenAI' },
  google: { prefix: 'google/', display: 'Google' },
  'x-ai': { prefix: 'x-ai/', display: 'xAI' },
  deepseek: { prefix: 'deepseek/', display: 'DeepSeek' },
  'meta-llama': { prefix: 'meta-llama/', display: 'Meta' },
  mistralai: { prefix: 'mistralai/', display: 'Mistral' },
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
// Source 1: OpenRouter API (public, no auth required)
// ---------------------------------------------------------------------------

async function fetchOpenRouter() {
  console.log(`  ${DIM}Fetching from OpenRouter API...${RESET}`);

  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`OpenRouter API returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const allModels = data.data || [];

  // Index by normalized short ID for quick lookup
  const index = new Map();

  for (const model of allModels) {
    const parts = model.id.split('/');
    const shortId = parts.length > 1 ? parts.slice(1).join('/') : model.id;
    const pricing = model.pricing || {};

    const entry = {
      fullId: model.id,
      shortId,
      name: model.name || model.id,
      contextWindow: model.context_length || 0,
      inputCostPer1M: parseFloat(pricing.prompt || '0') * 1_000_000,
      outputCostPer1M: parseFloat(pricing.completion || '0') * 1_000_000,
      created: model.created || 0,
    };

    // Index by multiple keys for flexible matching
    index.set(shortId.toLowerCase(), entry);
    index.set(normalizeModelId(shortId), entry);
  }

  return { allModels, index };
}

// ---------------------------------------------------------------------------
// Source 2: LiteLLM model_prices_and_context_window.json (GitHub)
// ---------------------------------------------------------------------------

async function fetchLiteLLM() {
  console.log(`  ${DIM}Fetching from LiteLLM GitHub dataset...${RESET}`);

  const url = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`LiteLLM fetch returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();

  // Index by multiple normalized keys
  const index = new Map();

  for (const [key, val] of Object.entries(data)) {
    if (typeof val !== 'object' || val === null) continue;

    // Extract context window (prefer max_input_tokens, fallback to max_tokens)
    const contextWindow = val.max_input_tokens || val.max_tokens || 0;

    // Cost per token → cost per 1M tokens
    const inputCostPer1M = (val.input_cost_per_token || 0) * 1_000_000;
    const outputCostPer1M = (val.output_cost_per_token || 0) * 1_000_000;

    const entry = {
      key,
      provider: val.litellm_provider || '',
      contextWindow,
      inputCostPer1M,
      outputCostPer1M,
    };

    // Index by bare key and by stripping provider prefix
    index.set(key.toLowerCase(), entry);
    const normalized = normalizeModelId(key);
    index.set(normalized, entry);

    // Also index without provider prefix (e.g., "anthropic/claude-3" → "claude-3")
    if (key.includes('/')) {
      const bare = key.split('/').slice(1).join('/');
      index.set(bare.toLowerCase(), entry);
      index.set(normalizeModelId(bare), entry);
    }
  }

  return { index };
}

// ---------------------------------------------------------------------------
// Match a local model against both source indexes
// ---------------------------------------------------------------------------

function findInSource(localModel, sourceIndex, providerPrefixMap) {
  const { id, provider } = localModel;
  const nLocal = normalizeModelId(id);

  // 1. Direct lookup by local ID
  const direct = sourceIndex.get(id.toLowerCase());
  if (direct) return direct;

  // 2. Normalized lookup
  const norm = sourceIndex.get(nLocal);
  if (norm) return norm;

  // 3. Provider-prefixed lookup (for LiteLLM keys like "anthropic/claude-opus-4-6")
  if (providerPrefixMap) {
    const prefixes = providerPrefixMap[provider] || [];
    for (const pfx of prefixes) {
      const prefixed = sourceIndex.get(`${pfx}/${id}`.toLowerCase());
      if (prefixed) return prefixed;
      const prefixedNorm = sourceIndex.get(normalizeModelId(`${pfx}/${id}`));
      if (prefixedNorm) return prefixedNorm;
    }
  }

  // 4. Prefix match (handles mistral-large matching mistral-large-2411)
  for (const [key, entry] of sourceIndex) {
    const nKey = normalizeModelId(key);
    if (nKey.startsWith(nLocal) || nLocal.startsWith(nKey)) {
      // Avoid overly loose matches — require at least 60% overlap
      const minLen = Math.min(nLocal.length, nKey.length);
      const maxLen = Math.max(nLocal.length, nKey.length);
      if (minLen / maxLen > 0.6) return entry;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Consensus logic
// ---------------------------------------------------------------------------

function valuesAgree(a, b, tolerance) {
  if (a === 0 || b === 0) return false; // Can't compare if one is missing
  const ratio = Math.abs(a - b) / Math.max(a, b);
  return ratio <= tolerance;
}

/**
 * Check if the magnitude of change from current to new is suspicious.
 * Returns true if the ratio exceeds the threshold in either direction.
 */
function isSuspiciousMagnitude(currentValue, newValue, maxRatio) {
  if (currentValue <= 0 || newValue <= 0) return false;
  const ratio = Math.max(currentValue / newValue, newValue / currentValue);
  return ratio > maxRatio;
}

function resolveConsensus(orValue, llValue, tolerance) {
  const orValid = orValue != null && orValue > 0;
  const llValid = llValue != null && llValue > 0;

  if (orValid && llValid) {
    if (valuesAgree(orValue, llValue, tolerance)) {
      // Both agree — use average (slightly favoring LiteLLM which tends to be more accurate)
      const avg = Math.round((orValue + llValue) / 2);
      return { value: avg, confidence: 'HIGH', sources: 'both' };
    }
    return { orValue, llValue, confidence: 'CONFLICT', sources: 'both' };
  }

  if (orValid) {
    return { value: orValue, confidence: 'UNVERIFIED', sources: 'openrouter' };
  }

  if (llValid) {
    return { value: llValue, confidence: 'UNVERIFIED', sources: 'litellm' };
  }

  return { confidence: 'NONE', sources: 'none' };
}

// ---------------------------------------------------------------------------
// Compare local models against both sources
// ---------------------------------------------------------------------------

function compareModels(localModels, orIndex, llIndex, mdContent) {
  const mdLines = mdContent.split('\n');
  const results = [];

  for (const local of localModels) {
    if (local.selfHosted) continue;

    // Find model in both sources
    const orMatch = findInSource(local, orIndex, {
      anthropic: ['anthropic'],
      openai: ['openai'],
      google: ['google'],
      xai: ['x-ai'],
      deepseek: ['deepseek'],
      meta: ['meta-llama'],
      mistral: ['mistralai'],
    });

    const llMatch = findInSource(local, llIndex, LL_PROVIDER_NAMES);

    const found = { openrouter: !!orMatch, litellm: !!llMatch };

    // Get current markdown values for comparison
    let curCtx = '';
    let curCost = '';
    for (const line of mdLines) {
      if (!line.includes(`\`${local.id}\``)) continue;
      const cols = line.split('|').map((c) => c.trim());
      if (cols.length >= 7) {
        curCtx = cols[4];
        curCost = cols[5];
      }
      break;
    }

    // Context window consensus
    const ctxConsensus = resolveConsensus(
      orMatch?.contextWindow,
      llMatch?.contextWindow,
      CONTEXT_TOLERANCE,
    );

    // Pricing consensus (input)
    const inputConsensus = resolveConsensus(
      orMatch?.inputCostPer1M,
      llMatch?.inputCostPer1M,
      PRICE_TOLERANCE,
    );

    // Pricing consensus (output)
    const outputConsensus = resolveConsensus(
      orMatch?.outputCostPer1M,
      llMatch?.outputCostPer1M,
      PRICE_TOLERANCE,
    );

    // Parse current context window from markdown (e.g., "200K" → 200000, "1M" → 1000000)
    const curCtxRaw = curCtx.match(/(\d+)(K|M)/i);
    const curCtxNum = curCtxRaw
      ? parseInt(curCtxRaw[1]) * (curCtxRaw[2].toUpperCase() === 'M' ? 1_000_000 : 1_000)
      : local.contextWindow;

    // Determine if changes exist
    const changes = [];

    // Context window change detection
    if (ctxConsensus.confidence === 'HIGH' && ctxConsensus.value > 0) {
      const newCtxStr = formatContextMd(ctxConsensus.value);
      if (curCtx && curCtx !== newCtxStr) {
        const suspicious = isSuspiciousMagnitude(curCtxNum, ctxConsensus.value, MAX_CONTEXT_CHANGE_RATIO);
        changes.push({
          field: 'context',
          oldValue: curCtx,
          newValue: newCtxStr,
          newRaw: ctxConsensus.value,
          confidence: suspicious ? 'SUSPICIOUS' : 'HIGH',
        });
      }
    } else if (ctxConsensus.confidence === 'CONFLICT') {
      changes.push({
        field: 'context',
        oldValue: curCtx,
        orValue: formatContextMd(ctxConsensus.orValue),
        llValue: formatContextMd(ctxConsensus.llValue),
        orRaw: ctxConsensus.orValue,
        llRaw: ctxConsensus.llValue,
        confidence: 'CONFLICT',
      });
    } else if (ctxConsensus.confidence === 'UNVERIFIED' && ctxConsensus.value > 0) {
      const newCtxStr = formatContextMd(ctxConsensus.value);
      if (curCtx && curCtx !== newCtxStr) {
        changes.push({
          field: 'context',
          oldValue: curCtx,
          newValue: newCtxStr,
          newRaw: ctxConsensus.value,
          confidence: 'UNVERIFIED',
          source: ctxConsensus.sources,
        });
      }
    }

    // Parse current pricing from markdown (e.g., "$15 / $75" → [15, 75])
    const curCostParts = [...(curCost.matchAll(/\$?([\d.]+)/g))].map((m) => parseFloat(m[1]));
    const curInputCost = curCostParts[0] || 0;
    const curOutputCost = curCostParts[1] || 0;

    // Pricing change detection
    if (inputConsensus.confidence === 'HIGH' && outputConsensus.confidence === 'HIGH') {
      const newCostStr = formatPricingMd(inputConsensus.value, outputConsensus.value);
      if (curCost && curCost !== newCostStr) {
        const suspiciousIn = curInputCost > 0 && isSuspiciousMagnitude(curInputCost, inputConsensus.value, MAX_PRICING_CHANGE_RATIO);
        const suspiciousOut = curOutputCost > 0 && isSuspiciousMagnitude(curOutputCost, outputConsensus.value, MAX_PRICING_CHANGE_RATIO);
        changes.push({
          field: 'pricing',
          oldValue: curCost,
          newValue: newCostStr,
          newInputRaw: inputConsensus.value,
          newOutputRaw: outputConsensus.value,
          confidence: (suspiciousIn || suspiciousOut) ? 'SUSPICIOUS' : 'HIGH',
        });
      }
    } else if (inputConsensus.confidence === 'CONFLICT' || outputConsensus.confidence === 'CONFLICT') {
      changes.push({
        field: 'pricing',
        oldValue: curCost,
        orValue: orMatch ? formatPricingMd(orMatch.inputCostPer1M, orMatch.outputCostPer1M) : '?',
        llValue: llMatch ? formatPricingMd(llMatch.inputCostPer1M, llMatch.outputCostPer1M) : '?',
        confidence: 'CONFLICT',
      });
    } else if (
      (inputConsensus.confidence === 'UNVERIFIED' || outputConsensus.confidence === 'UNVERIFIED') &&
      (inputConsensus.value > 0 || outputConsensus.value > 0)
    ) {
      const inVal = inputConsensus.value || 0;
      const outVal = outputConsensus.value || 0;
      if (inVal > 0 && outVal > 0) {
        const newCostStr = formatPricingMd(inVal, outVal);
        if (curCost && curCost !== newCostStr) {
          changes.push({
            field: 'pricing',
            oldValue: curCost,
            newValue: newCostStr,
            confidence: 'UNVERIFIED',
            source: inputConsensus.sources || outputConsensus.sources,
          });
        }
      }
    }

    results.push({
      local,
      found,
      changes,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Discover new models from OpenRouter (tracked providers)
// ---------------------------------------------------------------------------

function discoverNewModels(localModels, orAllModels) {
  const normalizedLocalIds = localModels.map((m) => normalizeModelId(m.id));

  const tracked = [];
  for (const model of orAllModels) {
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

  return tracked
    .filter((r) => r.inputCostPer1M > 0 || r.outputCostPer1M > 0)
    .filter((r) => {
      const shortId = r.openRouterId.split('/').slice(1).join('/').toLowerCase();
      const nRemote = normalizeModelId(shortId);
      return !normalizedLocalIds.some(
        (nLocal) =>
          nRemote === nLocal ||
          nRemote.startsWith(nLocal) ||
          nLocal.startsWith(nRemote),
      );
    })
    .sort((a, b) => b.created - a.created);
}

// ---------------------------------------------------------------------------
// Apply consensus-approved updates to markdown SSOT
// ---------------------------------------------------------------------------

function applyMarkdownUpdates(results) {
  let content = readFileSync(MD_PATH, 'utf-8');
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(eol);
  let applied = 0;

  for (const r of results) {
    const applyable = r.changes.filter(
      (c) => c.confidence === 'HIGH' || (force && (c.confidence === 'UNVERIFIED' || c.confidence === 'SUSPICIOUS')),
    );
    if (applyable.length === 0) continue;

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes(`\`${r.local.id}\``)) continue;
      const cols = lines[i].split('|');
      if (cols.length < 7) break;

      for (const c of applyable) {
        if (c.field === 'context' && c.newValue) {
          cols[4] = ` ${c.newValue} `;
          applied++;
        }
        if (c.field === 'pricing' && c.newValue) {
          cols[5] = ` ${c.newValue} `;
          applied++;
        }
      }

      lines[i] = cols.join('|');
      break;
    }
  }

  if (applied > 0) {
    // Update Last Updated date
    const today = new Date().toISOString().split('T')[0];
    content = lines.join(eol).replace(
      /\*\*Last Updated\*\*:\s*\d{4}-\d{2}-\d{2}/,
      `**Last Updated**: ${today}`,
    );
    writeFileSync(MD_PATH, content);
  }

  return applied;
}

// ---------------------------------------------------------------------------
// Apply consensus-approved updates to TypeScript runtime
// ---------------------------------------------------------------------------

function applyTypeScriptUpdates(results) {
  let content = readFileSync(TS_PATH, 'utf-8');
  let applied = 0;

  for (const r of results) {
    const ctxChange = r.changes.find(
      (c) =>
        c.field === 'context' &&
        (c.confidence === 'HIGH' || (force && (c.confidence === 'UNVERIFIED' || c.confidence === 'SUSPICIOUS'))),
    );
    if (!ctxChange || !ctxChange.newRaw) continue;

    const re = new RegExp(
      `(id:\\s*'${escapeRegex(r.local.id)}'[\\s\\S]*?contextWindow:\\s*)[\\d_]+`,
    );
    const next = content.replace(re, `$1${formatContextTs(ctxChange.newRaw)}`);
    if (next !== content) {
      content = next;
      applied++;
    }
  }

  if (applied > 0) writeFileSync(TS_PATH, content);
  return applied;
}

// ---------------------------------------------------------------------------
// Display report
// ---------------------------------------------------------------------------

function displayReport(results, newModels) {
  const matchedCount = results.filter((r) => r.found.openrouter || r.found.litellm).length;
  const bothCount = results.filter((r) => r.found.openrouter && r.found.litellm).length;
  const orOnlyCount = results.filter((r) => r.found.openrouter && !r.found.litellm).length;
  const llOnlyCount = results.filter((r) => !r.found.openrouter && r.found.litellm).length;
  const neitherCount = results.filter((r) => !r.found.openrouter && !r.found.litellm).length;

  console.log(`\n${BOLD}Model Coverage${RESET}\n`);
  console.log(`  ${GREEN}\u2713${RESET} Both sources:    ${bothCount} models`);
  if (orOnlyCount) console.log(`  ${YELLOW}!${RESET} OpenRouter only: ${orOnlyCount} models`);
  if (llOnlyCount) console.log(`  ${YELLOW}!${RESET} LiteLLM only:    ${llOnlyCount} models`);
  if (neitherCount) console.log(`  ${RED}\u2717${RESET} Neither source:  ${neitherCount} models`);

  // Consensus updates (HIGH confidence)
  const highChanges = results.filter((r) =>
    r.changes.some((c) => c.confidence === 'HIGH'),
  );

  if (highChanges.length > 0) {
    const label = dryRun ? `${YELLOW}Consensus Updates Available` : `${GREEN}Consensus Auto-Updated`;
    console.log(`\n${BOLD}${label}${RESET} ${DIM}(both sources agree)${RESET}\n`);
    for (const r of highChanges) {
      for (const c of r.changes.filter((c) => c.confidence === 'HIGH')) {
        console.log(`  ${GREEN}\u2713${RESET} ${r.local.name}: ${c.field} ${c.oldValue} \u2192 ${c.newValue}`);
      }
    }
    if (dryRun) {
      console.log(`\n  ${DIM}Run without --dry-run to apply consensus updates.${RESET}`);
    }
  }

  // Suspicious consensus (both agree but magnitude is too large)
  const suspicious = results.filter((r) =>
    r.changes.some((c) => c.confidence === 'SUSPICIOUS'),
  );

  if (suspicious.length > 0) {
    console.log(`\n${BOLD}${YELLOW}Suspicious Consensus${RESET} ${DIM}(both agree, but change is >2x context or >3x pricing \u2014 NOT auto-updated)${RESET}\n`);
    for (const r of suspicious) {
      for (const c of r.changes.filter((c) => c.confidence === 'SUSPICIOUS')) {
        console.log(`  ${YELLOW}!${RESET} ${r.local.name}: ${c.field} ${c.oldValue} \u2192 ${c.newValue} ${DIM}(verify model identity)${RESET}`);
      }
    }
    console.log(`\n  ${DIM}Both sources agree, but the change is large. Verify model IDs match correctly.${RESET}`);
    console.log(`  ${DIM}Use --force to apply if you've confirmed these are correct.${RESET}`);
  }

  // Conflicts (sources disagree)
  const conflicts = results.filter((r) =>
    r.changes.some((c) => c.confidence === 'CONFLICT'),
  );

  if (conflicts.length > 0) {
    console.log(`\n${BOLD}${RED}Conflicts${RESET} ${DIM}(sources disagree \u2014 NOT auto-updated)${RESET}\n`);
    for (const r of conflicts) {
      for (const c of r.changes.filter((c) => c.confidence === 'CONFLICT')) {
        console.log(`  ${RED}\u2717${RESET} ${r.local.name} ${c.field}:`);
        console.log(`    ${DIM}Current:    ${c.oldValue}${RESET}`);
        console.log(`    ${DIM}OpenRouter: ${c.orValue}${RESET}`);
        console.log(`    ${DIM}LiteLLM:    ${c.llValue}${RESET}`);
      }
    }
    console.log(`\n  ${DIM}Review manually and update templates/model-matrix.md if needed.${RESET}`);
  }

  // Unverified (single source only)
  const unverified = results.filter((r) =>
    r.changes.some((c) => c.confidence === 'UNVERIFIED'),
  );

  if (unverified.length > 0) {
    const label = force && !dryRun ? `${YELLOW}Force-Applied (Unverified)` : `${YELLOW}Unverified Changes`;
    console.log(`\n${BOLD}${label}${RESET} ${DIM}(single source only \u2014 ${force ? 'applied with --force' : 'NOT auto-updated'})${RESET}\n`);
    for (const r of unverified) {
      for (const c of r.changes.filter((c) => c.confidence === 'UNVERIFIED')) {
        const src = c.source === 'openrouter' ? 'OR' : 'LL';
        console.log(`  ${YELLOW}?${RESET} ${r.local.name}: ${c.field} ${c.oldValue} \u2192 ${c.newValue} ${DIM}(${src} only)${RESET}`);
      }
    }
    if (!force) {
      console.log(`\n  ${DIM}Use --force to apply single-source updates anyway.${RESET}`);
    }
  }

  // Models not found in either source
  const notFound = results.filter((r) => !r.found.openrouter && !r.found.litellm && !r.local.selfHosted);
  if (notFound.length > 0) {
    console.log(`\n${BOLD}${YELLOW}Not Found in Either Source${RESET}\n`);
    for (const r of notFound) {
      console.log(`  ${YELLOW}!${RESET} ${r.local.id} (${r.local.provider}) \u2014 may use non-standard naming`);
    }
  }

  // New models from tracked providers
  if (newModels.length > 0) {
    console.log(`\n${BOLD}${CYAN}New Models from Tracked Providers${RESET} ${DIM}(latest first)${RESET}\n`);

    const grouped = {};
    for (const m of newModels) {
      (grouped[m.providerDisplay] ??= []).push(m);
    }

    const sortedProviders = Object.entries(grouped).sort(
      ([, a], [, b]) => b[0].created - a[0].created,
    );

    for (const [provider, models] of sortedProviders) {
      console.log(`  ${BOLD}${provider}${RESET}`);
      const top = models.slice(0, 8);
      for (const m of top) {
        const cost =
          m.inputCostPer1M > 0
            ? `$${m.inputCostPer1M.toFixed(2)}/$${m.outputCostPer1M.toFixed(2)} per 1M`
            : 'free';
        const ctx =
          m.contextLength > 0 ? `${Math.round(m.contextLength / 1000)}K ctx` : '? ctx';
        const date =
          m.created > 0 ? new Date(m.created * 1000).toISOString().split('T')[0] : '?';
        console.log(
          `    ${DIM}[${date}] ${m.openRouterId} \u2014 ${m.name} (${ctx}, ${cost})${RESET}`,
        );
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

const modeLabel = dryRun ? ' (dry run)' : force ? ' (force)' : '';
console.log(`\n${BOLD}${PREFIX} Model Matrix Update${modeLabel}${RESET}\n`);
console.log(`  ${DIM}Dual-source consensus: OpenRouter API + LiteLLM GitHub${RESET}\n`);

try {
  const localModels = parseLocalModels();
  console.log(`  ${GREEN}\u2713${RESET} Local matrix: ${localModels.length} models`);

  // Fetch both sources in parallel
  const [orResult, llResult] = await Promise.allSettled([
    fetchOpenRouter(),
    fetchLiteLLM(),
  ]);

  const orOk = orResult.status === 'fulfilled';
  const llOk = llResult.status === 'fulfilled';

  if (!orOk && !llOk) {
    console.log(`  ${RED}\u2717${RESET} Both sources failed:`);
    console.log(`    OpenRouter: ${orResult.reason?.message || 'unknown error'}`);
    console.log(`    LiteLLM:    ${llResult.reason?.message || 'unknown error'}`);
    console.log(`\n  ${DIM}The offline sync check still works: pnpm mcp:models:sync${RESET}\n`);
    process.exit(1);
  }

  if (!orOk) {
    console.log(`  ${YELLOW}!${RESET} OpenRouter API failed: ${orResult.reason?.message || 'unknown error'}`);
    console.log(`  ${DIM}Continuing with LiteLLM only (no new model discovery)${RESET}`);
  } else {
    const or = orResult.value;
    console.log(`  ${GREEN}\u2713${RESET} OpenRouter: ${or.allModels.length} models fetched`);
  }

  if (!llOk) {
    console.log(`  ${YELLOW}!${RESET} LiteLLM fetch failed: ${llResult.reason?.message || 'unknown error'}`);
    console.log(`  ${DIM}Continuing with OpenRouter only (reduced confidence)${RESET}`);
  } else {
    console.log(`  ${GREEN}\u2713${RESET} LiteLLM: ${llResult.value.index.size} model entries loaded`);
  }

  const orIndex = orOk ? orResult.value.index : new Map();
  const llIndex = llOk ? llResult.value.index : new Map();

  const mdContent = existsSync(MD_PATH) ? readFileSync(MD_PATH, 'utf-8') : '';
  const results = compareModels(localModels, orIndex, llIndex, mdContent);

  // Apply consensus updates (unless --dry-run)
  const hasHighChanges = results.some((r) => r.changes.some((c) => c.confidence === 'HIGH'));
  const hasForceChanges = force && results.some((r) => r.changes.some((c) => c.confidence === 'UNVERIFIED' || c.confidence === 'SUSPICIOUS'));

  if ((hasHighChanges || hasForceChanges) && !dryRun) {
    const mdApplied = applyMarkdownUpdates(results);
    const tsApplied = applyTypeScriptUpdates(results);
    if (mdApplied > 0 || tsApplied > 0) {
      console.log(`\n  ${GREEN}\u2713${RESET} Applied ${mdApplied} markdown + ${tsApplied} TypeScript updates`);
    }
  }

  // Discover new models (OpenRouter only — has created dates)
  const newModels = orOk ? discoverNewModels(localModels, orResult.value.allModels) : [];

  displayReport(results, newModels);

  // Summary
  const totalChanges = results.reduce(
    (acc, r) => acc + r.changes.filter((c) => c.confidence === 'HIGH').length,
    0,
  );
  const totalConflicts = results.reduce(
    (acc, r) => acc + r.changes.filter((c) => c.confidence === 'CONFLICT').length,
    0,
  );
  const totalSuspicious = results.reduce(
    (acc, r) => acc + r.changes.filter((c) => c.confidence === 'SUSPICIOUS').length,
    0,
  );
  const totalUnverified = results.reduce(
    (acc, r) => acc + r.changes.filter((c) => c.confidence === 'UNVERIFIED').length,
    0,
  );

  console.log();
  if (totalChanges > 0 && !dryRun) {
    console.log(`${PREFIX} ${GREEN}${totalChanges} consensus update(s) applied${RESET}`);
    console.log(`${DIM}Run: pnpm mcp:models:sync && pnpm mcp:typecheck && pnpm mcp:build${RESET}`);
  } else if (totalChanges > 0 && dryRun) {
    console.log(`${PREFIX} ${YELLOW}${totalChanges} consensus update(s) available \u2014 run without --dry-run${RESET}`);
  } else if (totalConflicts > 0 || totalSuspicious > 0 || totalUnverified > 0) {
    const parts = [];
    if (totalConflicts) parts.push(`${totalConflicts} conflict(s)`);
    if (totalSuspicious) parts.push(`${totalSuspicious} suspicious`);
    if (totalUnverified) parts.push(`${totalUnverified} unverified`);
    console.log(`${PREFIX} ${YELLOW}${parts.join(', ')} \u2014 review above${RESET}`);
  } else if (newModels.length > 0) {
    console.log(`${PREFIX} ${YELLOW}New models available \u2014 review above and add to matrix if needed${RESET}`);
    console.log(`${DIM}Edit templates/model-matrix.md (SSOT), then update model-matrix.ts to match.${RESET}`);
  } else {
    console.log(`${PREFIX} ${GREEN}Matrix is current \u2014 both sources confirm${RESET}`);
  }
  console.log();
} catch (err) {
  console.log(`  ${RED}\u2717${RESET} Failed: ${err.message}`);
  console.log(`  ${DIM}The offline sync check still works: pnpm mcp:models:sync${RESET}\n`);
  process.exit(1);
}
