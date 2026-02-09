import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createTextResult,
  parseAllMarkdownTables,
  extractSection,
} from '@aidd.md/mcp-shared';
import type { AiddModule, ModelTier, ModuleContext } from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { routeToModel, getMatrixStatus, MODEL_MATRIX, TIER_DEFAULTS, COGNITIVE_TIER_MAP } from './model-matrix.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AiddModeEntry {
  taskPattern: string;
  agent: string;
  workflow: string | null;
}

interface FallbackModeEntry {
  domain: string;
  keywords: string[];
  template: string;
  tier: string;
}

interface DecisionRule {
  phase: string;
  keywords: string[];
  agent: string;
  output: string;
  next: string | null;
}

interface ClassificationResult {
  taskSummary: string;
  phase: string;
  tier: number;
  agents: Array<{ name: string; reason: string }>;
  workflows: string[];
  templates: string[];
  confidence: number;
  complexity: 'low' | 'moderate' | 'complex';
  fastTrack: boolean;
  skippableStages: string[];
}

// ---------------------------------------------------------------------------
// Routing table cache
// ---------------------------------------------------------------------------

let aiddModeCache: AiddModeEntry[] | null = null;
let fallbackModeCache: FallbackModeEntry[] | null = null;
let decisionRulesCache: DecisionRule[] | null = null;

function parseRoutingTables(context: ModuleContext): void {
  if (aiddModeCache && fallbackModeCache) return;

  const templates = context.contentLoader.getIndex().templates;
  const routingEntry = templates.find((t) => t.name === 'routing.md');

  if (!routingEntry) {
    aiddModeCache = [];
    fallbackModeCache = [];
    return;
  }

  const content = routingEntry.getContent();

  // Parse AIDD Mode table
  const aiddSection = extractSection(content, '2. AIDD Mode');
  const aiddTables = parseAllMarkdownTables(aiddSection);
  aiddModeCache = [];
  if (aiddTables.length > 0) {
    for (const row of aiddTables[0]!.rows) {
      aiddModeCache.push({
        taskPattern: row[0] ?? '',
        agent: row[1] ?? '',
        workflow: row[2] === '\u2014' || !row[2] ? null : row[2],
      });
    }
  }

  // Parse Fallback Mode tables
  const fallbackSection = extractSection(content, '3. Fallback Mode');
  const fallbackTables = parseAllMarkdownTables(fallbackSection);
  fallbackModeCache = [];
  for (const table of fallbackTables) {
    for (const row of table.rows) {
      const keywordsStr = row[1] ?? '';
      fallbackModeCache.push({
        domain: row[0] ?? '',
        keywords: keywordsStr.split(',').map((k: string) => k.trim().toLowerCase()),
        template: row[2] ?? '',
        tier: row[3] ?? '2',
      });
    }
  }
}

function parseDecisionTree(context: ModuleContext): void {
  if (decisionRulesCache) return;

  const rules = context.contentLoader.getIndex().rules;
  const dtEntry = rules.find((r) => r.name === 'orchestrator.md');

  if (!dtEntry) {
    decisionRulesCache = [];
    return;
  }

  const content = dtEntry.getContent();
  decisionRulesCache = [];

  // Extract IF blocks with keywords and activate targets
  const blockPattern =
    /IF\s+keywords\s+IN\s+\[([^\]]+)\][\s\S]*?\u2192\s*activate:\s*'([^']+)'/g;
  let match: RegExpExecArray | null;

  // Track current phase from context
  let currentPhase = 'GENERAL';

  const lines = content.split('\n');
  for (const line of lines) {
    const phaseMatch = line.match(/IF\s+phase\s*==\s*(\w+)/i);
    if (phaseMatch) {
      currentPhase = phaseMatch[1]!.toUpperCase();
    }
  }

  while ((match = blockPattern.exec(content)) !== null) {
    const keywordsRaw = match[1]!;
    const agent = match[2]!;

    const keywords = keywordsRaw
      .split(',')
      .map((k) => k.replace(/['"]/g, '').trim().toLowerCase())
      .filter(Boolean);

    // Try to extract output and next from surrounding block
    const blockEnd = content.indexOf('\n\n', match.index + match[0].length);
    const block = content.slice(match.index, blockEnd > -1 ? blockEnd : undefined);

    const outputMatch = block.match(/\u2192\s*output:\s*(.+)/);
    const nextMatch = block.match(/\u2192\s*next:\s*'([^']+)'/);

    decisionRulesCache.push({
      phase: currentPhase,
      keywords,
      agent,
      output: outputMatch?.[1]?.trim() ?? '',
      next: nextMatch?.[1] ?? null,
    });
  }

  // Parse Phase Identification table
  const phaseSection = extractSection(content, 'Level 1: Phase Identification');
  const phaseTable = parseAllMarkdownTables(phaseSection);
  if (phaseTable.length > 0) {
    for (const row of phaseTable[0]!.rows) {
      const keywords = (row[0] ?? '')
        .split(',')
        .map((k: string) => k.replace(/"/g, '').trim().toLowerCase())
        .filter(Boolean);
      const phase = (row[1] ?? '').replace(/\*\*/g, '').trim();
      if (keywords.length > 0 && phase) {
        decisionRulesCache.push({
          phase: phase.toUpperCase(),
          keywords,
          agent: '',
          output: '',
          next: null,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Classification logic
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
  'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each',
  'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'this',
  'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'how',
  'when', 'where', 'why', 'need', 'want', 'like', 'make', 'get',
]);

const PHASE_KEYWORDS: Record<string, string[]> = {
  DESIGN: ['design', 'plan', 'architect', 'diagram', 'c4', 'adr', 'wireframe', 'prototype', 'system'],
  IMPLEMENTATION: ['implement', 'build', 'create', 'develop', 'add', 'code', 'write', 'component', 'feature'],
  QUALITY: ['test', 'coverage', 'validation', 'audit', 'review', 'quality', 'lint', 'check'],
  RELEASE: ['deploy', 'ci', 'cd', 'docker', 'pipeline', 'release', 'publish', 'infrastructure'],
  KNOWLEDGE: ['document', 'docs', 'wiki', 'guide', 'readme', 'spec', 'knowledge', 'tkb'],
};

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function detectPhase(keywords: string[], hintPhase?: string): string {
  if (hintPhase) return hintPhase.toUpperCase();

  let bestPhase = 'IMPLEMENTATION';
  let bestScore = 0;

  for (const [phase, phaseKws] of Object.entries(PHASE_KEYWORDS)) {
    const score = keywords.filter((k) => phaseKws.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestPhase = phase;
    }
  }

  return bestPhase;
}

function classifyTask(
  description: string,
  context: ModuleContext,
  domainHint?: string,
  phaseHint?: string,
): ClassificationResult {
  parseRoutingTables(context);
  parseDecisionTree(context);

  const keywords = extractKeywords(description);
  const phase = detectPhase(keywords, phaseHint);
  const agents: Array<{ name: string; reason: string }> = [];
  const workflows: string[] = [];
  const templates: string[] = [];
  let tier = 2;
  let totalMatches = 0;
  let totalPossible = 0;

  // Match against AIDD mode table
  if (context.projectInfo.detected && aiddModeCache) {
    for (const entry of aiddModeCache) {
      const patternKeywords = extractKeywords(entry.taskPattern);
      const overlap = keywords.filter((k) => patternKeywords.includes(k)).length;
      if (overlap > 0) {
        totalMatches += overlap;
        totalPossible += patternKeywords.length;
        if (!agents.some((a) => a.name === entry.agent)) {
          agents.push({
            name: entry.agent,
            reason: `Matches task pattern: "${entry.taskPattern}"`,
          });
        }
        if (entry.workflow && !workflows.includes(entry.workflow)) {
          workflows.push(entry.workflow);
        }
      }
    }
  }

  // Match against fallback mode
  if (fallbackModeCache) {
    for (const entry of fallbackModeCache) {
      if (domainHint && entry.domain.toLowerCase() !== domainHint.toLowerCase()) {
        continue;
      }
      const overlap = keywords.filter((k) => entry.keywords.includes(k)).length;
      if (overlap > 0) {
        totalMatches += overlap;
        totalPossible += entry.keywords.length;
        if (!templates.includes(entry.template)) {
          templates.push(entry.template);
        }
        const tierNum = parseInt(entry.tier.charAt(0), 10);
        if (!isNaN(tierNum)) {
          tier = Math.min(tier, tierNum);
        }
      }
    }
  }

  // Match against decision tree rules
  if (decisionRulesCache) {
    for (const rule of decisionRulesCache) {
      if (rule.agent === '') continue;
      const overlap = keywords.filter((k) => rule.keywords.includes(k)).length;
      if (overlap > 0) {
        totalMatches += overlap;
        totalPossible += rule.keywords.length;
        if (!agents.some((a) => a.name === rule.agent)) {
          agents.push({
            name: rule.agent,
            reason: `Decision tree: keywords [${rule.keywords.slice(0, 3).join(', ')}]`,
          });
        }
        if (rule.next && !agents.some((a) => a.name === rule.next)) {
          agents.push({
            name: rule.next,
            reason: `Chained from ${rule.agent}`,
          });
        }
      }
    }
  }

  const confidence = totalPossible > 0
    ? Math.min(1, totalMatches / Math.max(totalPossible, keywords.length))
    : 0.3;

  // Complexity heuristic
  const descriptionWords = description.split(/\s+/).length;
  let complexity: 'low' | 'moderate' | 'complex';
  if (keywords.length > 8 || totalMatches > 5 || descriptionWords > 50) {
    complexity = 'complex';
  } else if (keywords.length <= 3 && totalMatches <= 2 && descriptionWords <= 15) {
    complexity = 'low';
  } else {
    complexity = 'moderate';
  }

  // Fast-track: triple guard (low complexity + not tier 1 + not release + no risky keywords)
  const RISKY_KEYWORDS = new Set([
    'auth', 'security', 'prod', 'production', 'migration', 'deploy',
    'database', 'delete', 'drop', 'secret', 'credential', 'permission',
  ]);
  const hasRiskyKeyword = keywords.some((k) => RISKY_KEYWORDS.has(k));
  const fastTrack = complexity === 'low' && tier >= 2 && phase !== 'RELEASE' && !hasRiskyKeyword;
  const skippableStages = fastTrack ? ['brainstorm', 'research'] : [];

  return {
    taskSummary: description.slice(0, 100),
    phase,
    tier,
    agents: agents.slice(0, 5),
    workflows: workflows.slice(0, 3),
    templates: templates.slice(0, 3),
    confidence: Math.round(confidence * 100) / 100,
    complexity,
    fastTrack,
    skippableStages,
  };
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export const routingModule: AiddModule = {
  name: 'routing',
  description: 'Task classification and routing to appropriate agents, workflows, and templates',

  register(server: McpServer, context: ModuleContext) {
    registerTool(server, {
      name: 'aidd_classify_task',
      description:
        'Classify a task description into the optimal agents, workflows, and templates. Uses the AIDD routing table and decision tree algorithm.',
      schema: {
        description: z
          .string()
          .describe('Task description in natural language'),
        domain: z
          .string()
          .optional()
          .describe('Optional domain hint (frontend, backend, database, etc.)'),
        phase: z
          .string()
          .optional()
          .describe('Optional phase hint (DESIGN, IMPLEMENTATION, QUALITY, RELEASE, KNOWLEDGE)'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { description, domain, phase } = args as {
          description: string;
          domain?: string;
          phase?: string;
        };
        const result = classifyTask(description, context, domain, phase);
        return createJsonResult(result);
      },
    });

    registerTool(server, {
      name: 'aidd_get_routing_table',
      description:
        'Get the full AIDD routing table showing task patterns mapped to agents, workflows, and templates.',
      schema: {
        mode: z
          .enum(['aidd', 'fallback', 'all'])
          .optional()
          .default('all')
          .describe('Which routing mode to return'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { mode } = args as { mode: string };
        parseRoutingTables(context);

        const lines: string[] = [];
        if (mode === 'aidd' || mode === 'all') {
          lines.push('## AIDD Mode (when AGENTS.md detected)\n');
          lines.push('| Task Pattern | Agent | Workflow |');
          lines.push('|---|---|---|');
          for (const entry of aiddModeCache ?? []) {
            lines.push(`| ${entry.taskPattern} | ${entry.agent} | ${entry.workflow ?? '\u2014'} |`);
          }
        }

        if (mode === 'fallback' || mode === 'all') {
          lines.push('\n## Fallback Mode (no AIDD detected)\n');
          lines.push('| Domain | Keywords | Template | Tier |');
          lines.push('|---|---|---|---|');
          for (const entry of fallbackModeCache ?? []) {
            lines.push(
              `| ${entry.domain} | ${entry.keywords.join(', ')} | ${entry.template} | ${entry.tier} |`,
            );
          }
        }

        return createTextResult(lines.join('\n'));
      },
    });

    // -----------------------------------------------------------------------
    // Model routing tool
    // -----------------------------------------------------------------------

    registerTool(server, {
      name: 'aidd_model_route',
      description:
        'Route to the optimal model for a given tier and optional constraints. Uses the multi-provider model matrix (SSOT: content/specs/model-matrix.md). Compose with aidd_classify_task to get the tier first.',
      schema: {
        tier: z
          .number()
          .int()
          .min(1)
          .max(3)
          .describe('Model tier: 1 (HIGH), 2 (STANDARD), 3 (LOW)'),
        provider: z
          .string()
          .optional()
          .describe('Preferred provider (anthropic, openai, google, xai, meta, mistral, deepseek)'),
        task: z
          .string()
          .optional()
          .describe('Task description — if cognitive keywords imply a higher tier, the tier escalates automatically'),
        excludeDeprecated: z
          .boolean()
          .optional()
          .default(true)
          .describe('Exclude deprecated models from results'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { tier, provider, task, excludeDeprecated } = args as {
          tier: number;
          provider?: string;
          task?: string;
          excludeDeprecated?: boolean;
        };
        const result = routeToModel({
          tier: tier as ModelTier,
          provider,
          task,
          excludeDeprecated,
        });
        return createJsonResult(result);
      },
    });

    registerTool(server, {
      name: 'aidd_get_model_matrix',
      description:
        'Get the full multi-provider model matrix showing all registered models with their tiers, cognitive profiles, and status.',
      schema: {
        tier: z
          .number()
          .int()
          .min(1)
          .max(3)
          .optional()
          .describe('Filter by tier (1, 2, or 3). Omit for all tiers.'),
        provider: z
          .string()
          .optional()
          .describe('Filter by provider name'),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async (args) => {
        const { tier, provider } = args as { tier?: number; provider?: string };
        let models = MODEL_MATRIX;

        if (tier !== undefined) {
          models = models.filter((m) => m.tier === tier);
        }
        if (provider) {
          models = models.filter((m) => m.provider === provider.toLowerCase());
        }

        return createJsonResult({
          models,
          tierDefaults: TIER_DEFAULTS,
          cognitiveTierMap: COGNITIVE_TIER_MAP,
        });
      },
    });

    registerTool(server, {
      name: 'aidd_model_matrix_status',
      description:
        'Get the health status of the model routing matrix: total models, distribution by tier/provider/status, deprecated models, and upcoming deprecation alerts.',
      schema: {},
      annotations: { readOnlyHint: true, idempotentHint: true },
      handler: async () => {
        const status = getMatrixStatus();
        return createJsonResult(status);
      },
    });
  },
};
