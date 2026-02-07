import { z } from 'zod';
import {
  registerTool,
  createJsonResult,
  createErrorResult,
  generateId,
  now,
} from '@aidd.md/mcp-shared';
import type {
  AiddModule,
  ModuleContext,
  BannedPattern,
} from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';
import { detectPatterns, computeFingerprint, computeAuditScore } from './detector.js';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPatternKillerModule(storage: StorageProvider): AiddModule {
  return {
    name: 'pattern-killer',
    description: 'Pattern detection, statistical fingerprinting, and AI output quality scoring',

    register(server: McpServer, _context: ModuleContext) {
      // ---- 1. Audit: full pipeline on explicit text ----
      registerTool(server, {
        name: 'aidd_pattern_audit',
        description:
          'Run full pattern audit on text: detect banned patterns, compute fingerprint, score across 5 dimensions. Returns compact summary (~150 tokens).',
        schema: {
          text: z.string().describe('Text to audit'),
          modelId: z.string().optional().default('unknown').describe('Model ID for context'),
          sessionId: z.string().optional().describe('Session ID for tracking'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { text, modelId, sessionId } = args as {
            text: string;
            modelId: string;
            sessionId?: string;
          };

          const backend = await storage.getBackend();
          const banned = await backend.listBannedPatterns({ active: true, modelScope: modelId });
          const score = computeAuditScore(text, banned, modelId, sessionId);
          const matches = detectPatterns(text, banned);

          // Save audit score
          await backend.saveAuditScore(score);

          // Compact summary — top 5 matches only
          const topMatches = matches.slice(0, 5).map((m) => ({
            label: m.label,
            category: m.category,
            context: m.context,
          }));

          return createJsonResult({
            totalScore: score.totalScore,
            verdict: score.verdict,
            dimensions: score.dimensions,
            patternsFound: matches.length,
            topMatches,
            fingerprint: computeFingerprint(text),
          });
        },
      });

      // ---- 2. List: active patterns ----
      registerTool(server, {
        name: 'aidd_pattern_list',
        description:
          'List active banned patterns. Filter by category or model scope.',
        schema: {
          category: z.string().optional().describe('Filter by category (filler, hedge, structure, verbosity, compliance)'),
          modelScope: z.string().optional().describe('Filter by model scope'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { category, modelScope } = args as {
            category?: string;
            modelScope?: string;
          };

          const backend = await storage.getBackend();
          const patterns = await backend.listBannedPatterns({
            active: true,
            category,
            modelScope,
          });

          return createJsonResult({
            count: patterns.length,
            patterns: patterns.map((p) => ({
              id: p.id,
              pattern: p.pattern,
              category: p.category,
              severity: p.severity,
              type: p.type,
              modelScope: p.modelScope,
              origin: p.origin,
              useCount: p.useCount,
            })),
          });
        },
      });

      // ---- 3. Add: new banned pattern ----
      registerTool(server, {
        name: 'aidd_pattern_add',
        description:
          'Add a new banned pattern to detect in AI output.',
        schema: {
          pattern: z.string().describe('Pattern string (literal or regex)'),
          category: z.enum(['filler', 'hedge', 'structure', 'verbosity', 'compliance']).describe('Pattern category'),
          type: z.enum(['exact', 'regex']).optional().default('exact').describe('Pattern type'),
          severity: z.enum(['critical', 'high', 'medium', 'low']).optional().default('medium').describe('Severity level'),
          modelScope: z.string().optional().describe('Restrict to specific model ID'),
          hint: z.string().optional().describe('Suggestion for replacement'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const a = args as {
            pattern: string;
            category: BannedPattern['category'];
            type: BannedPattern['type'];
            severity: BannedPattern['severity'];
            modelScope?: string;
            hint?: string;
          };

          // Validate regex if type is regex
          if (a.type === 'regex') {
            try {
              new RegExp(a.pattern, 'gi');
            } catch {
              return createErrorResult(`Invalid regex pattern: ${a.pattern}`);
            }
          }

          const entry: BannedPattern = {
            id: generateId(),
            category: a.category,
            pattern: a.pattern,
            type: a.type,
            severity: a.severity,
            modelScope: a.modelScope,
            hint: a.hint,
            origin: 'learned',
            active: true,
            useCount: 0,
            createdAt: now(),
          };

          const backend = await storage.getBackend();
          await backend.saveBannedPattern(entry);

          return createJsonResult({ id: entry.id, pattern: entry.pattern, saved: true });
        },
      });

      // ---- 4. Stats: detection statistics per model ----
      registerTool(server, {
        name: 'aidd_pattern_stats',
        description:
          'Get pattern detection statistics. Shows top patterns by frequency and per-model breakdown. Compact (~100-150 tokens).',
        schema: {
          modelId: z.string().optional().describe('Filter stats to specific model'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { modelId } = args as { modelId?: string };

          const backend = await storage.getBackend();
          const stats = await backend.getPatternStats({ modelId });

          return createJsonResult({
            totalDetections: stats.totalDetections,
            models: stats.models.map((m) => ({
              modelId: m.modelId,
              detections: m.detections,
              summary: m.summary,
            })),
            topPatterns: stats.topPatterns.slice(0, 10).map((p) => ({
              pattern: p.pattern,
              category: p.category,
              count: p.count,
              uniqueSessions: p.uniqueSessions,
            })),
          });
        },
      });

      // ---- 5. Score: evaluate text (5-dimension rubric) ----
      registerTool(server, {
        name: 'aidd_pattern_score',
        description:
          'Quick score evaluation of text quality. Returns 5-dimension rubric + total + verdict (~80 tokens).',
        schema: {
          text: z.string().describe('Text to evaluate'),
          modelId: z.string().optional().default('unknown').describe('Model ID'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
        handler: async (args) => {
          const { text, modelId } = args as { text: string; modelId: string };

          const backend = await storage.getBackend();
          const banned = await backend.listBannedPatterns({ active: true, modelScope: modelId });
          const score = computeAuditScore(text, banned, modelId);

          return createJsonResult({
            totalScore: score.totalScore,
            verdict: score.verdict,
            dimensions: score.dimensions,
            patternsFound: score.patternsFound,
          });
        },
      });

      // ---- 6. False positive: report a pattern as false positive ----
      registerTool(server, {
        name: 'aidd_pattern_false_positive',
        description:
          'Report a pattern as false positive. Reduces confidence by 15%. Auto-deactivates below 50% use count.',
        schema: {
          patternId: z.string().describe('Banned pattern ID to report as false positive'),
          reason: z.string().optional().describe('Why this is a false positive'),
        },
        annotations: { idempotentHint: true },
        handler: async (args) => {
          const { patternId, reason } = args as { patternId: string; reason?: string };

          const backend = await storage.getBackend();
          const patterns = await backend.listBannedPatterns({});
          const pattern = patterns.find((p) => p.id === patternId);

          if (!pattern) return createErrorResult(`Pattern ${patternId} not found`);

          // Record false positive detection
          await backend.recordPatternDetection({
            modelId: 'false_positive_report',
            patternId,
            matchedText: pattern.pattern,
            context: reason,
            source: 'false_positive',
            createdAt: now(),
          });

          // Reduce use count as confidence proxy (15% reduction, min 0)
          pattern.useCount = Math.max(0, Math.round(pattern.useCount * 0.85));

          // Auto-deactivate if confidence drops too low
          if (pattern.useCount < 2 && pattern.origin === 'learned') {
            pattern.active = false;
          }

          await backend.updateBannedPattern(pattern);

          return createJsonResult({
            patternId,
            pattern: pattern.pattern,
            active: pattern.active,
            useCount: pattern.useCount,
            deactivated: !pattern.active,
            reason,
          });
        },
      });
    },
  };
}
