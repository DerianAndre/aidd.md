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
  SessionState,
  AiProvider,
  TokenUsage,
  ModelFingerprint,
  StorageBackend,
} from '@aidd.md/mcp-shared';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StorageProvider } from '../../storage/index.js';
import { hookBus } from '../hooks.js';

// ---------------------------------------------------------------------------
// Fingerprint computation — pure math, zero AI token cost
// ---------------------------------------------------------------------------

const PASSIVE_RE = /\b(?:was|were|been|being|is|are)\s+\w+ed\b/gi;
const QUESTION_RE = /\?/g;

const FILLER_PATTERNS = [
  /\blet me\b/gi, /\bcertainly\b/gi, /\bI'd be happy to\b/gi,
  /\babsolutely\b/gi, /\bgreat question\b/gi, /\bit's worth noting\b/gi,
  /\bI should mention\b/gi, /\bas an AI\b/gi, /\bin order to\b/gi,
  /\bit is important to note\b/gi, /\blet's dive into\b/gi,
];

async function computeSessionFingerprint(
  sessionId: string,
  backend: StorageBackend,
): Promise<ModelFingerprint | null> {
  const observations = await backend.listObservations({ sessionId });
  const texts: string[] = [];
  for (const obs of observations) {
    if (obs.narrative && obs.narrative.length > 50) texts.push(obs.narrative);
  }

  const fullText = texts.join('\n\n');
  if (fullText.length < 200) return null;

  const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = fullText.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
  const paragraphs = fullText.split(/\n\n+/).filter((p) => p.trim().length > 0);

  // Sentence length stats
  const sentLengths = sentences.map((s) => s.split(/\s+/).length);
  const avgSentLen = sentLengths.reduce((a, b) => a + b, 0) / Math.max(sentLengths.length, 1);
  const variance = sentLengths.reduce((sum, l) => sum + (l - avgSentLen) ** 2, 0) / Math.max(sentLengths.length, 1);

  // Type-token ratio (vocabulary richness)
  const uniqueWords = new Set(words);
  const ttr = words.length > 0 ? uniqueWords.size / words.length : 0;

  // Paragraph length
  const avgParaLen = paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / Math.max(paragraphs.length, 1);

  // Passive voice ratio
  const passiveMatches = fullText.match(PASSIVE_RE) ?? [];
  const passiveRatio = sentences.length > 0 ? passiveMatches.length / sentences.length : 0;

  // Filler density (AI patterns per 1000 words)
  let fillerCount = 0;
  for (const pat of FILLER_PATTERNS) {
    const matches = fullText.match(pat);
    if (matches) fillerCount += matches.length;
  }
  const fillerDensity = words.length > 0 ? (fillerCount / words.length) * 1000 : 0;

  // Question frequency
  const questions = fullText.match(QUESTION_RE) ?? [];
  const questionFreq = words.length > 0 ? (questions.length / words.length) * 1000 : 0;

  return {
    avgSentenceLength: Math.round(avgSentLen * 100) / 100,
    sentenceLengthVariance: Math.round(variance * 100) / 100,
    typeTokenRatio: Math.round(ttr * 1000) / 1000,
    avgParagraphLength: Math.round(avgParaLen * 100) / 100,
    passiveVoiceRatio: Math.round(passiveRatio * 1000) / 1000,
    fillerDensity: Math.round(fillerDensity * 100) / 100,
    questionFrequency: Math.round(questionFreq * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createSessionModule(storage: StorageProvider): AiddModule {
  return {
    name: 'session',
    description: 'Session lifecycle management — start, update, end, list',

    register(server: McpServer, _context: ModuleContext) {
      registerTool(server, {
        name: 'aidd_session',
        description:
          'Manage development sessions. Actions: start (create new session), update (add decisions/errors/files), end (close session), get (retrieve session), list (query sessions).',
        schema: {
          action: z.enum(['start', 'update', 'end', 'get', 'list']).describe('Action to perform'),
          // start params
          branch: z.string().optional().describe('Git branch name (required for start)'),
          aiProvider: z
            .object({
              provider: z.string(),
              model: z.string(),
              modelId: z.string(),
              client: z.string(),
              modelTier: z.string().optional(),
            })
            .optional()
            .describe('AI provider info (required for start)'),
          memorySessionId: z.string().optional().describe('Cross-session continuity ID'),
          parentSessionId: z.string().optional().describe('Parent session for threading'),
          taskClassification: z
            .object({
              domain: z.string(),
              nature: z.string(),
              complexity: z.string(),
            })
            .optional()
            .describe('Task classification'),
          // update/end/get params
          id: z.string().optional().describe('Session ID (required for update/end/get)'),
          // update params — arrays are appended
          decisions: z
            .array(z.object({ decision: z.string(), reasoning: z.string(), timestamp: z.string() }))
            .optional()
            .describe('Decisions to append'),
          errorsResolved: z
            .array(z.object({ error: z.string(), fix: z.string(), timestamp: z.string() }))
            .optional()
            .describe('Errors resolved to append'),
          filesModified: z.array(z.string()).optional().describe('Files modified to append'),
          tasksCompleted: z.array(z.string()).optional().describe('Tasks completed to append'),
          tasksPending: z.array(z.string()).optional().describe('Tasks pending to set'),
          toolsCalled: z
            .array(z.object({ name: z.string(), resultQuality: z.enum(['good', 'neutral', 'bad']) }))
            .optional()
            .describe('Tools called to append'),
          tokenUsage: z
            .object({
              inputTokens: z.number(),
              outputTokens: z.number(),
              cacheReadTokens: z.number().optional(),
              cacheWriteTokens: z.number().optional(),
              totalCost: z.number().optional(),
            })
            .optional()
            .describe('Token usage to merge (additive) — opt-in, system works without it'),
          // end params
          outcome: z
            .object({
              testsPassing: z.boolean(),
              complianceScore: z.number(),
              reverts: z.number(),
              reworks: z.number(),
              userFeedback: z.enum(['positive', 'neutral', 'negative']).optional(),
            })
            .optional()
            .describe('Session outcome (for end action)'),
          // list params
          status: z.enum(['active', 'completed']).optional().describe('Filter by status (for list)'),
          limit: z.number().optional().describe('Max results (for list)'),
        },
        annotations: { idempotentHint: false },
        handler: async (args) => {
          const a = args as Record<string, unknown>;
          const action = a['action'] as string;
          const backend = await storage.getBackend();

          switch (action) {
            case 'start': {
              if (!a['branch']) return createErrorResult('branch is required for start');
              if (!a['aiProvider']) return createErrorResult('aiProvider is required for start');

              const session: SessionState = {
                id: generateId(),
                memorySessionId: a['memorySessionId'] as string | undefined,
                parentSessionId: a['parentSessionId'] as string | undefined,
                branch: a['branch'] as string,
                startedAt: now(),
                aiProvider: a['aiProvider'] as AiProvider,
                decisions: [],
                errorsResolved: [],
                filesModified: [],
                tasksCompleted: [],
                tasksPending: [],
                agentsUsed: [],
                skillsUsed: [],
                toolsCalled: [],
                rulesApplied: [],
                workflowsFollowed: [],
                tkbEntriesConsulted: [],
                taskClassification: (a['taskClassification'] as SessionState['taskClassification']) ?? {
                  domain: 'unknown',
                  nature: 'unknown',
                  complexity: 'unknown',
                },
              };

              await backend.saveSession(session);
              return createJsonResult({ id: session.id, status: 'active', startedAt: session.startedAt });
            }

            case 'update': {
              if (!a['id']) return createErrorResult('id is required for update');
              const session = await backend.getSession(a['id'] as string);
              if (!session) return createErrorResult(`Session ${a['id']} not found`);

              // Merge arrays
              if (a['decisions']) session.decisions.push(...(a['decisions'] as SessionState['decisions']));
              if (a['errorsResolved'])
                session.errorsResolved.push(...(a['errorsResolved'] as SessionState['errorsResolved']));
              if (a['filesModified']) {
                const newFiles = a['filesModified'] as string[];
                for (const f of newFiles) {
                  if (!session.filesModified.includes(f)) session.filesModified.push(f);
                }
              }
              if (a['tasksCompleted'])
                session.tasksCompleted.push(...(a['tasksCompleted'] as string[]));
              if (a['tasksPending']) session.tasksPending = a['tasksPending'] as string[];
              if (a['toolsCalled'])
                session.toolsCalled.push(...(a['toolsCalled'] as SessionState['toolsCalled']));

              // Additive merge of token usage
              if (a['tokenUsage']) {
                const incoming = a['tokenUsage'] as TokenUsage;
                if (!session.tokenUsage) {
                  session.tokenUsage = { ...incoming };
                } else {
                  session.tokenUsage.inputTokens += incoming.inputTokens;
                  session.tokenUsage.outputTokens += incoming.outputTokens;
                  if (incoming.cacheReadTokens != null)
                    session.tokenUsage.cacheReadTokens = (session.tokenUsage.cacheReadTokens ?? 0) + incoming.cacheReadTokens;
                  if (incoming.cacheWriteTokens != null)
                    session.tokenUsage.cacheWriteTokens = (session.tokenUsage.cacheWriteTokens ?? 0) + incoming.cacheWriteTokens;
                  if (incoming.totalCost != null)
                    session.tokenUsage.totalCost = (session.tokenUsage.totalCost ?? 0) + incoming.totalCost;
                }
              }

              await backend.saveSession(session);
              return createJsonResult({
                id: session.id,
                decisions: session.decisions.length,
                errors: session.errorsResolved.length,
                files: session.filesModified.length,
              });
            }

            case 'end': {
              if (!a['id']) return createErrorResult('id is required for end');
              const session = await backend.getSession(a['id'] as string);
              if (!session) return createErrorResult(`Session ${a['id']} not found`);

              session.endedAt = now();
              if (a['outcome']) session.outcome = a['outcome'] as SessionState['outcome'];

              // Merge final token usage if provided
              if (a['tokenUsage']) {
                const incoming = a['tokenUsage'] as TokenUsage;
                if (!session.tokenUsage) {
                  session.tokenUsage = { ...incoming };
                } else {
                  session.tokenUsage.inputTokens += incoming.inputTokens;
                  session.tokenUsage.outputTokens += incoming.outputTokens;
                  if (incoming.cacheReadTokens != null)
                    session.tokenUsage.cacheReadTokens = (session.tokenUsage.cacheReadTokens ?? 0) + incoming.cacheReadTokens;
                  if (incoming.cacheWriteTokens != null)
                    session.tokenUsage.cacheWriteTokens = (session.tokenUsage.cacheWriteTokens ?? 0) + incoming.cacheWriteTokens;
                  if (incoming.totalCost != null)
                    session.tokenUsage.totalCost = (session.tokenUsage.totalCost ?? 0) + incoming.totalCost;
                }
              }

              // Compute context efficiency: tasks completed per 1K output tokens
              if (session.tokenUsage && session.outcome) {
                const outputK = session.tokenUsage.outputTokens / 1000;
                const tasks = session.tasksCompleted.length;
                if (outputK > 0 && tasks > 0) {
                  session.outcome.contextEfficiency = Math.round((tasks / outputK) * 100) / 100;
                }
              }

              // Compute fingerprint from observation narratives (server-side, free)
              const fingerprint = await computeSessionFingerprint(session.id, backend);
              if (fingerprint) session.fingerprint = fingerprint;

              await backend.saveSession(session);

              // Hook fires AFTER response — fire-and-forget, silent
              hookBus.emit({ type: 'session_ended', sessionId: session.id }).catch(() => {});

              return createJsonResult({
                id: session.id,
                status: 'completed',
                startedAt: session.startedAt,
                endedAt: session.endedAt,
              });
            }

            case 'get': {
              if (!a['id']) return createErrorResult('id is required for get');
              const session = await backend.getSession(a['id'] as string);
              if (!session) return createErrorResult(`Session ${a['id']} not found`);
              return createJsonResult(session);
            }

            case 'list': {
              const entries = await backend.listSessions({
                branch: a['branch'] as string | undefined,
                status: a['status'] as 'active' | 'completed' | undefined,
                memorySessionId: a['memorySessionId'] as string | undefined,
                limit: (a['limit'] as number | undefined) ?? 20,
              });
              return createJsonResult({ count: entries.length, sessions: entries });
            }

            default:
              return createErrorResult(`Unknown action: ${action}`);
          }
        },
      });
    },
  };
}
