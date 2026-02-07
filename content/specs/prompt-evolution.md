# Prompt Evolution — Self-Improving Prompt Optimization System

> Feedback-driven prompt refinement where every generation's outcome improves future prompt quality through the AIDD evolution engine.

**Last Updated**: 2026-02-06
**Status**: Specification Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Research Foundation](#2-research-foundation)
3. [Architecture — 6-Layer Model](#3-architecture--6-layer-model)
4. [Evolution Engine Extensions](#4-evolution-engine-extensions)
5. [Storage Schema](#5-storage-schema)
6. [MCP Tool Specifications](#6-mcp-tool-specifications)
7. [AIDD Lifecycle Integration](#7-aidd-lifecycle-integration)
8. [Memory Layer Integration](#8-memory-layer-integration)
9. [Thompson Sampling — Template Quality Scoring](#9-thompson-sampling--template-quality-scoring)
10. [LLM-Powered Prompt Mutation](#10-llm-powered-prompt-mutation)
11. [Few-Shot Exemplar Memory](#11-few-shot-exemplar-memory)
12. [VLM-as-Judge — Automated QA](#12-vlm-as-judge--automated-qa)
13. [A/B Testing Framework](#13-ab-testing-framework)
14. [Configuration](#14-configuration)
15. [Cold Start Strategy](#15-cold-start-strategy)
16. [Anti-Patterns and Guardrails](#16-anti-patterns-and-guardrails)
17. [Implementation Phases](#17-implementation-phases)
18. [Cross-References](#18-cross-references)

---

## 1. Overview

Prompt Evolution extends the AIDD evolution engine to optimize prompts used in AI generation tasks. The system collects structured feedback (human ratings, implicit signals, VLM scores), tracks prompt versions with performance metrics, and uses LLM-powered mutation to propose improvements — all gated by the same confidence-threshold approval system that governs AIDD framework evolution.

**Core principle**: Human feedback is the primary signal. AI-to-AI feedback without human validation converges to generic, low-quality outputs (ScienceDirect 2025). The human remains the final arbiter; the system assists, never replaces.

**Scope**: This specification applies to any AIDD-managed project that uses AI-generated content with promptable models — image generation, text generation, code generation, or any domain where prompt quality directly impacts output quality.

---

## 2. Research Foundation

### Key Findings

| Source | Finding | Implication |
|--------|---------|-------------|
| Google PASTA (2025) | Preference-adaptive sequential prompting converges on user taste in ~4 turns | Few iterations needed; collect 4-5 ratings before optimizing |
| ScienceDirect (2025) | Autonomous AI-to-AI loops produce "visual elevator music" | Never auto-loop LLM output without human gating |
| DSPy (Stanford, 2025) | Prompts as programs with tunable parameters. BootstrapFewShot works with ~10 examples | Treat prompt slots as tunable; optimize independently |
| GAAPO (Frontiers, 2025) | Genetic prompt optimization outperforms manual by ~90% (0.46 vs 0.24) | Evolutionary mutation + selection outperforms manual iteration |
| NeurIPS (2025) | Self-generated in-context examples: 73% → 93% task success | Few-shot exemplar memory is highest ROI, lowest effort |
| ICCV (2025) | Test-time prompt refinement: most gains in first 2-3 cycles | Cap refinement iterations; diminishing returns after 3 |
| Multi-Armed Bandits + LLMs (2025) | Thompson Sampling balances exploration vs exploitation in template selection | Use Bayesian scoring to rank templates, not just averages |
| CHI PromptCharm (2024) | Mixed-initiative systems with attention visualization improve output significantly | Show users what parts of prompts have most impact |
| Evidently AI (2025) | VLM-as-Judge achieves ~85% agreement with human evaluators | Automated scoring supplements but never replaces human ratings |

### Critical Constraints

1. **Human-in-the-loop is non-negotiable** — auto-optimization proposals require human approval (aligns with AIDD evolution engine's confidence thresholds)
2. **Most gains happen in first 2-3 iterations** — cap optimization cycles to prevent prompt bloat
3. **Local-first** — all data stays on-device (SQLite/JSON), no telemetry, no cloud dependency
4. **API cost awareness** — VLM judging and LLM mutation cost tokens; batch operations, make opt-in

---

## 3. Architecture — 6-Layer Model

The system is organized into 6 layers of increasing sophistication. Each layer builds on the previous. Layers can be adopted incrementally.

```
┌─────────────────────────────────────────────────────┐
│  L6: VLM-as-Judge (automated QA scoring)            │  ← Optional
├─────────────────────────────────────────────────────┤
│  L5: Auto-Optimization Engine (LLM mutation)        │  ← After 10+ ratings
├─────────────────────────────────────────────────────┤
│  L4: Few-Shot Exemplar Memory (in-context learning) │  ← After 5+ high-rated
├─────────────────────────────────────────────────────┤
│  L3: Prompt Versioning (edit, rollback, lineage)    │  ← Core
├─────────────────────────────────────────────────────┤
│  L2: Template Quality Scoring (Thompson Sampling)   │  ← Core (~50 LOC)
├─────────────────────────────────────────────────────┤
│  L1: Feedback Collection + Storage (foundation)     │  ← Core (required)
└─────────────────────────────────────────────────────┘
```

| Layer | Impact | Effort | Prerequisite |
|-------|--------|--------|-------------|
| L1: Feedback Collection | **High** | Low | None |
| L2: Quality Scoring | **High** | Low | L1 |
| L3: Prompt Versioning | **High** | Medium | L1 |
| L4: Exemplar Memory | **Medium** | Low | L1 |
| L5: Auto-Optimization | **Medium** | Medium | L1 + L3 |
| L6: VLM-as-Judge | **Low-Med** | Low | L1 |

---

## 4. Evolution Engine Extensions

### New Evolution Types

Extend the existing `EvolutionType` union to include prompt-specific evolution:

```typescript
export type EvolutionType =
  // Existing types
  | 'routing_weight'
  | 'skill_combo'
  | 'rule_elevation'
  | 'compound_workflow'
  | 'tkb_promotion'
  | 'new_convention'
  | 'model_recommendation'
  // New: Prompt Evolution types
  | 'prompt_refinement'        // Prompt text improvement based on feedback
  | 'prompt_version_promotion' // High-performing version promoted to active
  | 'exemplar_promotion'       // Successful generation promoted as few-shot context
  | 'template_deprecation'     // Consistently low-performing template flagged
  | 'prompt_slot_optimization' // Individual prompt dimension (lighting, composition, etc.) tuned
```

### New Pattern Detectors

Add to `analyzer.ts`:

```typescript
function detectPromptRefinements(
  feedback: PromptFeedback[],
  config: EvolutionConfig,
): EvolutionCandidate[]

function detectExemplarPromotions(
  feedback: PromptFeedback[],
  minRating: number,
): EvolutionCandidate[]

function detectTemplateDeprecations(
  scores: TemplateScore[],
  minUses: number,
  maxRating: number,
): EvolutionCandidate[]

function detectSlotOptimizations(
  feedback: PromptFeedback[],
  promptSlots: PromptSlotDefinition[],
): EvolutionCandidate[]
```

### Confidence Thresholds

Inherit from AIDD config with prompt-specific overrides:

| Confidence | Action | AIDD Alignment |
|------------|--------|----------------|
| **>90%** | Auto-promote prompt version (with notification) | Matches `autoApplyThreshold` |
| **70-90%** | Create draft for user review | Matches `draftThreshold` |
| **<70%** | Log as pending, continue observing | Matches pending behavior |

**Confidence calculation for prompt evolution**:

```
confidence = min(100, round(
  (sample_size_weight * 40) +          // More ratings = more confident
  (statistical_significance * 30) +     // p-value < 0.05 = high
  (improvement_magnitude * 20) +        // How much better is the new version
  (user_edit_alignment * 10)            // Does it match user edit patterns
))
```

Where:
- `sample_size_weight` = `min(1.0, rated_count / 20)`
- `statistical_significance` = `1.0 if p < 0.05 else p_value / 0.05`
- `improvement_magnitude` = `(new_avg_rating - old_avg_rating) / 5.0`
- `user_edit_alignment` = fraction of user edits that align with proposed change direction

---

## 5. Storage Schema

### Option A: SQLite (recommended for production)

```sql
-- Every generation creates a row. Ratings update it.
CREATE TABLE prompt_feedback (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id   TEXT NOT NULL,
  prompt_version TEXT NOT NULL,       -- Semver: "1.0.0", "1.1.0", etc.
  prompt_text   TEXT NOT NULL,
  provider      TEXT NOT NULL,        -- "openai" | "gemini" | etc.
  design_paths  TEXT NOT NULL,        -- JSON array of input file paths
  output_path   TEXT NOT NULL,
  user_rating   INTEGER,              -- 1-5, nullable until rated
  ai_score      REAL,                 -- 0.0-1.0, from VLM judge, nullable
  was_saved     INTEGER DEFAULT 0,    -- Implicit signal: user saved the result
  was_regenerated INTEGER DEFAULT 0,  -- Implicit signal: user regenerated (bad)
  user_prompt_edits TEXT,             -- Diff from template, nullable
  generation_time_ms INTEGER,         -- How long the generation took
  created_at    TEXT NOT NULL,        -- ISO 8601
  metadata      TEXT                  -- JSON blob for extensibility
);

CREATE INDEX idx_feedback_template ON prompt_feedback(template_id);
CREATE INDEX idx_feedback_rating ON prompt_feedback(user_rating);
CREATE INDEX idx_feedback_version ON prompt_feedback(template_id, prompt_version);

-- Thompson Sampling scores per template
CREATE TABLE template_scores (
  template_id   TEXT PRIMARY KEY,
  alpha         REAL DEFAULT 1.0,     -- Successes + prior
  beta          REAL DEFAULT 1.0,     -- Failures + prior
  total_uses    INTEGER DEFAULT 0,
  avg_rating    REAL,
  last_updated  TEXT NOT NULL
);

-- Prompt version history with lineage
CREATE TABLE prompt_versions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id   TEXT NOT NULL,
  version       TEXT NOT NULL,         -- Semver
  prompt_text   TEXT NOT NULL,
  origin        TEXT NOT NULL,         -- "system" | "user_edit" | "auto_optimized"
  parent_version TEXT,                 -- For lineage tracking, nullable
  is_active     INTEGER DEFAULT 0,    -- Only one active per template
  avg_rating    REAL,
  use_count     INTEGER DEFAULT 0,
  created_at    TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_version_active ON prompt_versions(template_id) WHERE is_active = 1;

-- Top-rated exemplars per category (few-shot memory)
CREATE TABLE exemplars (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id   TEXT NOT NULL,
  category      TEXT NOT NULL,
  prompt_text   TEXT NOT NULL,
  rating        INTEGER NOT NULL,     -- The rating this exemplar received
  output_path   TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE INDEX idx_exemplar_category ON exemplars(category, rating DESC);
```

### Option B: JSON Backend (for simpler deployments)

```
.aidd/prompt-evolution/
  feedback.json           // Array of PromptFeedback entries
  scores.json             // Record<templateId, TemplateScore>
  versions.json           // Record<templateId, PromptVersion[]>
  exemplars.json          // Record<category, Exemplar[]>
```

Schemas match the SQL tables but stored as JSON arrays/objects. The AIDD shared backend pattern (`@aidd.md/mcp-shared`) already supports both SQLite and JSON backends.

### TypeScript Interfaces

```typescript
export interface PromptFeedback {
  id: string;
  templateId: string;
  promptVersion: string;
  promptText: string;
  provider: string;
  designPaths: string[];
  outputPath: string;
  userRating: number | null;       // 1-5
  aiScore: number | null;          // 0.0-1.0
  wasSaved: boolean;
  wasRegenerated: boolean;
  userPromptEdits: string | null;  // Diff from template
  generationTimeMs: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface TemplateScore {
  templateId: string;
  alpha: number;                   // Beta distribution parameter
  beta: number;                    // Beta distribution parameter
  totalUses: number;
  avgRating: number | null;
  lastUpdated: string;
}

export interface PromptVersion {
  id: string;
  templateId: string;
  version: string;                 // Semver
  promptText: string;
  origin: 'system' | 'user_edit' | 'auto_optimized';
  parentVersion: string | null;
  isActive: boolean;
  avgRating: number | null;
  useCount: number;
  createdAt: string;
}

export interface Exemplar {
  id: string;
  templateId: string;
  category: string;
  promptText: string;
  rating: number;
  outputPath: string;
  createdAt: string;
}
```

---

## 6. MCP Tool Specifications

### New Tools (Prompt Evolution Module)

#### `aidd_prompt_feedback_record`

Records generation feedback.

```typescript
{
  name: 'aidd_prompt_feedback_record',
  description: 'Record feedback for a prompt generation result',
  inputSchema: {
    type: 'object',
    properties: {
      templateId: { type: 'string' },
      promptVersion: { type: 'string' },
      promptText: { type: 'string' },
      provider: { type: 'string' },
      designPaths: { type: 'array', items: { type: 'string' } },
      outputPath: { type: 'string' },
      userRating: { type: 'number', minimum: 1, maximum: 5, nullable: true },
      userPromptEdits: { type: 'string', nullable: true },
      generationTimeMs: { type: 'number' },
    },
    required: ['templateId', 'promptVersion', 'promptText', 'provider', 'outputPath'],
  },
}
```

#### `aidd_prompt_feedback_rate`

Updates the rating for an existing feedback entry.

```typescript
{
  name: 'aidd_prompt_feedback_rate',
  description: 'Rate a previously generated result (1-5 stars)',
  inputSchema: {
    type: 'object',
    properties: {
      feedbackId: { type: 'string' },
      rating: { type: 'number', minimum: 1, maximum: 5 },
    },
    required: ['feedbackId', 'rating'],
  },
}
```

#### `aidd_prompt_version_list`

Lists all versions of a prompt template with performance metrics.

```typescript
{
  name: 'aidd_prompt_version_list',
  description: 'List all prompt versions for a template with ratings and usage stats',
  inputSchema: {
    type: 'object',
    properties: {
      templateId: { type: 'string' },
    },
    required: ['templateId'],
  },
}
```

#### `aidd_prompt_version_create`

Creates a new prompt version (user edit or auto-optimized).

```typescript
{
  name: 'aidd_prompt_version_create',
  description: 'Create a new prompt version for a template',
  inputSchema: {
    type: 'object',
    properties: {
      templateId: { type: 'string' },
      promptText: { type: 'string' },
      origin: { type: 'string', enum: ['user_edit', 'auto_optimized'] },
      parentVersion: { type: 'string', nullable: true },
    },
    required: ['templateId', 'promptText', 'origin'],
  },
}
```

#### `aidd_prompt_version_activate`

Promotes a specific version to active.

```typescript
{
  name: 'aidd_prompt_version_activate',
  description: 'Set a prompt version as the active version for its template',
  inputSchema: {
    type: 'object',
    properties: {
      templateId: { type: 'string' },
      version: { type: 'string' },
    },
    required: ['templateId', 'version'],
  },
}
```

#### `aidd_prompt_version_rollback`

Rolls back to a previous version.

```typescript
{
  name: 'aidd_prompt_version_rollback',
  description: 'Rollback a template prompt to a previous version',
  inputSchema: {
    type: 'object',
    properties: {
      templateId: { type: 'string' },
      targetVersion: { type: 'string' },
    },
    required: ['templateId', 'targetVersion'],
  },
}
```

#### `aidd_prompt_score_get`

Returns Thompson Sampling scores and rankings.

```typescript
{
  name: 'aidd_prompt_score_get',
  description: 'Get quality scores and rankings for templates using Thompson Sampling',
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string', nullable: true },  // Filter by category
      limit: { type: 'number', default: 20 },
    },
  },
}
```

#### `aidd_prompt_optimize`

Triggers LLM-powered prompt optimization for a template.

```typescript
{
  name: 'aidd_prompt_optimize',
  description: 'Analyze feedback and generate improved prompt variants using LLM mutation',
  inputSchema: {
    type: 'object',
    properties: {
      templateId: { type: 'string' },
      dryRun: { type: 'boolean', default: true },
      maxVariants: { type: 'number', default: 3 },
    },
    required: ['templateId'],
  },
}
```

#### `aidd_prompt_exemplar_list`

Lists top-rated exemplars for few-shot context.

```typescript
{
  name: 'aidd_prompt_exemplar_list',
  description: 'Get top-rated generation exemplars for a category (for few-shot prompting)',
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      limit: { type: 'number', default: 3 },
    },
    required: ['category'],
  },
}
```

#### `aidd_prompt_evolution_analyze`

Runs the full evolution analysis across all templates (extends existing `aidd_evolution_analyze`).

```typescript
{
  name: 'aidd_prompt_evolution_analyze',
  description: 'Analyze all prompt feedback and generate evolution candidates',
  inputSchema: {
    type: 'object',
    properties: {
      dryRun: { type: 'boolean', default: true },
    },
  },
}
```

---

## 7. AIDD Lifecycle Integration

The Prompt Evolution system integrates at specific phases of the AIDD 6-phase lifecycle:

| AIDD Phase | Prompt Evolution Action |
|------------|------------------------|
| **PHASE 1 — UNDERSTAND** | Read template scores. Identify low-performing templates. Consult exemplar memory for context. |
| **PHASE 2 — PLAN** | If prompt improvement is the task: select target templates, plan version changes. If generating content: select best active prompt versions. |
| **PHASE 4 — BUILD** | Use active prompt version (not hardcoded). Record feedback entry on generation. Optionally prepend exemplars. |
| **PHASE 5 — VERIFY** | User rates results (1-5). VLM-as-Judge provides automated score (optional). Update template scores. |
| **PHASE 6 — SHIP** | Run evolution analysis. Create drafts for prompt improvements. Update exemplar memory. Archive optimization log. |

### Integration with Existing Evolution Engine

The evolution analyzer (`analyzePatterns` in `analyzer.ts`) gains new detector functions:

```typescript
export function analyzePatterns(
  sessions: SessionState[],
  config: AiddConfig,
): EvolutionCandidate[] {
  const minSessions = config.evolution.learningPeriodSessions;
  const candidates: EvolutionCandidate[] = [];

  // Existing detectors
  candidates.push(...detectModelRecommendations(sessions, minSessions));
  candidates.push(...detectRecurringMistakes(sessions, minSessions));
  candidates.push(...detectToolSequences(sessions, minSessions));
  candidates.push(...detectSkillCombos(sessions, minSessions));

  // New: Prompt evolution detectors
  if (config.promptEvolution?.enabled) {
    const feedback = loadPromptFeedback();
    const scores = loadTemplateScores();
    candidates.push(...detectPromptRefinements(feedback, config.promptEvolution));
    candidates.push(...detectExemplarPromotions(feedback, 4));
    candidates.push(...detectTemplateDeprecations(scores, 10, 2.0));
  }

  return candidates;
}
```

---

## 8. Memory Layer Integration

### Extending the 5-Layer Memory Model

Prompt Evolution adds a new dimension to each memory layer:

```
Layer 5: EVOLUTION          (.aidd/evolution/)
  + prompt-evolution/       → Cross-session prompt improvement candidates

Layer 4: PERMANENT          (ai/memory/)
  + prompt-decisions.json   → "Why we changed the letterhead prompt from v1.2 to v2.0"

Layer 3: LIFECYCLE          (.aidd/sessions/)
  + prompt_feedback[]       → Per-session generation feedback entries

Layer 2: BRANCH             (.aidd/branches/)
  + prompt_experiments/     → Branch-specific prompt A/B tests

Layer 1: SESSION            (.aidd/sessions/active/)
  + active_prompt_versions  → Which prompt versions are being tested this session
```

### Memory File: prompt-decisions.json

Following the existing `decisions.json` pattern:

```json
{
  "prompt_decisions": [
    {
      "date": "2026-02-06",
      "templateId": "stationery-letterhead",
      "context": "Letterhead prompt v1.0.0 averaged 2.8/5 across 15 generations. Users consistently edited to add 'clean white background' and 'no shadows'.",
      "decision": "Promoted v1.1.0 which adds explicit background and shadow instructions.",
      "rationale": "User edit patterns showed 80% alignment with adding background/shadow directives. v1.1.0 averages 4.2/5 after 8 uses.",
      "previous_version": "1.0.0",
      "new_version": "1.1.0",
      "confidence": 87
    }
  ]
}
```

---

## 9. Thompson Sampling — Template Quality Scoring

### Algorithm

Thompson Sampling models each template's quality as a Beta distribution `Beta(α, β)`:

```typescript
function updateScore(score: TemplateScore, rating: number): TemplateScore {
  const updated = { ...score };
  updated.totalUses++;

  if (rating >= 4) {
    // Success: increment alpha
    updated.alpha += 1.0;
  } else if (rating <= 2) {
    // Failure: increment beta
    updated.beta += 1.0;
  } else {
    // Neutral (3): small increment to both (increases certainty without bias)
    updated.alpha += 0.3;
    updated.beta += 0.3;
  }

  // Update running average
  updated.avgRating = updated.avgRating
    ? (updated.avgRating * (updated.totalUses - 1) + rating) / updated.totalUses
    : rating;

  updated.lastUpdated = new Date().toISOString();
  return updated;
}

function sampleScore(score: TemplateScore): number {
  // Sample from Beta(alpha, beta) distribution
  return betaSample(score.alpha, score.beta);
}

function rankTemplates(scores: TemplateScore[]): TemplateScore[] {
  // Sample once from each template's distribution and sort
  return scores
    .map((s) => ({ ...s, sample: sampleScore(s) }))
    .sort((a, b) => b.sample - a.sample);
}
```

### Beta Distribution Sampling

```typescript
// Approximation using gamma function (Marsaglia & Tsang method)
function betaSample(alpha: number, beta: number): number {
  const x = gammaSample(alpha);
  const y = gammaSample(beta);
  return x / (x + y);
}

function gammaSample(shape: number): number {
  if (shape < 1) {
    return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number;
    let v: number;
    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function normalSample(): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
```

### Properties

- **Cold start**: With default `α=1, β=1` (uniform prior), all templates have equal probability of being selected — pure exploration
- **Convergence**: After ~20 ratings, the distribution narrows and the system exploits known-good templates
- **Self-balancing**: Underused templates occasionally get sampled due to wider distributions, ensuring continued exploration
- **No forgetting**: Old evidence compounds. To implement time-decay, multiply α and β by a decay factor (e.g., 0.95 per week)

---

## 10. LLM-Powered Prompt Mutation

### Trigger Conditions

Auto-optimization triggers when ALL conditions are met:

1. Template has **10+ rated generations**
2. Average rating is **< 3.5** (below "good" threshold)
3. At least **3 different rating values** exist (not all identical)
4. User has not manually edited the prompt in the last 5 generations

### Mutation Prompt (Meta-Prompt)

```
PROMPT OPTIMIZATION TASK:

You are optimizing a prompt template for AI image generation.
The template is used to generate {domain} images (e.g., mockups, brand applications, logo variants).

FEEDBACK DATA:
Below are examples of this prompt template and their user ratings (1-5 stars).

HIGH RATED (4-5 stars):
{high_rated_examples}

LOW RATED (1-2 stars):
{low_rated_examples}

USER EDITS (when users modified the prompt before generation):
{user_edit_patterns}

CURRENT ACTIVE PROMPT (version {current_version}):
"{current_prompt_text}"

ANALYSIS TASK:
1. Identify what makes high-rated outputs succeed and low-rated ones fail.
2. Analyze user edit patterns to understand what the prompt is missing.
3. Generate exactly 3 improved variants of this prompt.

CONSTRAINTS:
- Each variant must change only ONE dimension: {dimensions_for_domain}
- Preserve all placeholders (e.g., [YOUR_DESIGN]) exactly.
- Do not increase prompt length by more than 20%.
- Keep the same overall structure and intent.
- Be specific and actionable in your changes.

OUTPUT FORMAT (JSON):
[
  {
    "variant": "the improved prompt text",
    "dimension_changed": "which dimension was modified",
    "reasoning": "brief explanation of why this change should improve quality",
    "estimated_improvement": "low | medium | high"
  }
]
```

### Dimension Catalog

Different domains have different tunable dimensions:

```typescript
const DIMENSIONS: Record<string, string[]> = {
  'image-generation': [
    'lighting',
    'composition',
    'background',
    'perspective',
    'style',
    'color-palette',
    'detail-level',
    'aspect-ratio',
    'mood',
    'realism',
  ],
  'mockup-generation': [
    'scene-description',
    'camera-angle',
    'surface-material',
    'lighting-setup',
    'shadow-quality',
    'design-placement',
    'environment',
    'photorealism-level',
  ],
  'brand-application': [
    'layout-structure',
    'typography-direction',
    'color-usage',
    'logo-placement',
    'content-hierarchy',
    'design-fidelity',
    'print-readiness',
  ],
  'code-generation': [
    'specificity',
    'examples',
    'constraints',
    'output-format',
    'error-handling',
    'edge-cases',
  ],
};
```

### Evolutionary Selection

After mutation generates 3 variants, the system:

1. Stores each as a new `PromptVersion` with `origin: 'auto_optimized'` and `isActive: false`
2. Creates an `EvolutionCandidate` with confidence based on the LLM's `estimated_improvement` and supporting evidence
3. If confidence > `draftThreshold` (70%): creates a draft for user review via `aidd_draft_create`
4. If confidence > `autoApplyThreshold` (90%): auto-activates ONE variant (the highest estimated) and notifies user
5. Remaining variants enter A/B testing pool (see section 13)

### Crossover (Genetic Approach)

When multiple prompt versions exist for the same template with different successful mutations:

```
Parent A (v1.1.0, avg 4.2): Changed lighting → "soft diffused studio lighting"
Parent B (v1.2.0, avg 4.0): Changed background → "clean matte white surface"

Crossover → Child (v1.3.0): Incorporates BOTH lighting and background changes

Mutation meta-prompt:
"Combine the successful elements from these two prompt variants into a single cohesive prompt..."
```

This mirrors the GAAPO (Genetic Algorithmic Applied to Prompt Optimization) approach which outperformed manual optimization by ~90%.

---

## 11. Few-Shot Exemplar Memory

### Concept

For each category, maintain a cache of the N highest-rated `(prompt, output_description)` tuples. When generating, optionally prepend these as context to improve output quality.

### Implementation

```typescript
const MAX_EXEMPLARS_PER_CATEGORY = 5;
const MIN_RATING_FOR_EXEMPLAR = 4;

function buildPromptWithExemplars(
  basePrompt: string,
  category: string,
  exemplars: Exemplar[],
): string {
  if (exemplars.length === 0) return basePrompt;

  const exemplarContext = exemplars
    .slice(0, 3) // Use top 3 at most
    .map((e, i) => `${i + 1}. Template "${e.templateId}" (rated ${e.rating}/5): "${e.promptText.slice(0, 200)}..."`)
    .join('\n');

  return `CONTEXT — Previously successful generations in this category:
${exemplarContext}

These examples show what works well. Apply similar quality and attention to detail.

---

${basePrompt}`;
}
```

### Exemplar Selection Criteria

An exemplar is promoted when:

1. User rating >= 4 stars
2. (Optional) VLM score >= 0.8
3. Not a duplicate of an existing exemplar (text similarity < 0.7)
4. The template category matches

### AIDD Alignment

This maps to the evolution engine's `exemplar_promotion` type:

```typescript
function detectExemplarPromotions(
  feedback: PromptFeedback[],
  minRating: number,
): EvolutionCandidate[] {
  const highRated = feedback.filter(
    (f) => f.userRating !== null && f.userRating >= minRating,
  );

  // Group by category, select top per category
  const byCategory = new Map<string, PromptFeedback[]>();
  for (const f of highRated) {
    const category = extractCategory(f.templateId);
    const list = byCategory.get(category) ?? [];
    list.push(f);
    byCategory.set(category, list);
  }

  const candidates: EvolutionCandidate[] = [];
  for (const [category, entries] of byCategory) {
    const sorted = entries.sort((a, b) => (b.userRating ?? 0) - (a.userRating ?? 0));
    const top = sorted[0];
    if (!top) continue;

    candidates.push({
      id: generateId(),
      type: 'exemplar_promotion',
      title: `Promote exemplar for ${category}: ${top.templateId}`,
      description: `Rating ${top.userRating}/5. Can serve as few-shot context for future ${category} generations.`,
      confidence: Math.min(100, (top.userRating ?? 0) * 20),
      sessionCount: 1,
      evidence: [top.id],
      discoveryTokensTotal: 0,
      suggestedAction: `Add to exemplar memory for category "${category}"`,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  return candidates;
}
```

---

## 12. VLM-as-Judge — Automated QA

### Concept

After generation, optionally send the output image to a vision-language model for automated quality scoring. This supplements (never replaces) human ratings.

### Judge Prompt

```
QUALITY ASSESSMENT — AI-Generated Image

You are evaluating a generated image against the prompt that produced it.

ORIGINAL PROMPT:
"{prompt_text}"

EVALUATION DIMENSIONS (rate each 1-10):

1. **Prompt Adherence**: Does the image match the requested scene, composition, and elements?
2. **Design Fidelity**: Is the original design/logo preserved without distortion or recreation?
3. **Aesthetic Quality**: Professional quality? Studio-grade lighting, composition, color?
4. **Realism**: Does it look like a real photograph (if applicable)?
5. **Technical Quality**: No artifacts, no text hallucinations, no anatomical errors?

OUTPUT FORMAT (JSON only, no other text):
{
  "prompt_adherence": <1-10>,
  "design_fidelity": <1-10>,
  "aesthetic_quality": <1-10>,
  "realism": <1-10>,
  "technical_quality": <1-10>,
  "overall": <1-10>,
  "critique": "<one sentence explaining the main quality issue, if any>"
}
```

### Score Normalization

```typescript
function normalizeVlmScore(vlmResponse: VlmJudgeResponse): number {
  // Normalize to 0.0-1.0 range
  return vlmResponse.overall / 10;
}
```

### Cost Management

- VLM judging costs 1 API call per generation
- Make it **opt-in** via config: `promptEvolution.vlmJudge.enabled`
- Batch mode: judge multiple outputs at end of session, not inline
- Rate limit: max N judgments per session (default: 20)
- Show estimated cost in UI before enabling

### AIDD Config Extension

```json
{
  "promptEvolution": {
    "vlmJudge": {
      "enabled": false,
      "provider": "gemini",
      "maxPerSession": 20,
      "autoJudgeOnRating": true
    }
  }
}
```

When `autoJudgeOnRating` is true, the VLM judge runs automatically whenever the user rates a generation. This provides two data points (human + AI) for stronger optimization signals.

---

## 13. A/B Testing Framework

### Concept

When multiple prompt versions exist for a template, the system can automatically A/B test them by randomly selecting versions for generation and comparing aggregated ratings.

### Implementation

```typescript
interface ABTest {
  id: string;
  templateId: string;
  variants: Array<{
    version: string;
    useCount: number;
    totalRating: number;
    avgRating: number | null;
  }>;
  minSamplesPerVariant: number;  // Default: 5
  status: 'running' | 'concluded';
  winner: string | null;
  startedAt: string;
  concludedAt: string | null;
}

function selectVariantForABTest(test: ABTest): string {
  // Find the variant with the fewest uses (balance sampling)
  const leastUsed = test.variants.reduce((min, v) =>
    v.useCount < min.useCount ? v : min,
  );

  // If any variant has fewer than minSamples, use it
  if (leastUsed.useCount < test.minSamplesPerVariant) {
    return leastUsed.version;
  }

  // All variants have enough samples — use Thompson Sampling to select
  let bestSample = -1;
  let bestVersion = test.variants[0]!.version;

  for (const variant of test.variants) {
    const alpha = variant.totalRating + 1;
    const beta = (5 * variant.useCount - variant.totalRating) + 1;
    const sample = betaSample(alpha, beta);
    if (sample > bestSample) {
      bestSample = sample;
      bestVersion = variant.version;
    }
  }

  return bestVersion;
}

function concludeABTest(test: ABTest): ABTest {
  if (test.variants.some((v) => v.useCount < test.minSamplesPerVariant)) {
    return test; // Not enough data yet
  }

  // Find winner by highest average rating
  const winner = test.variants.reduce((best, v) =>
    (v.avgRating ?? 0) > (best.avgRating ?? 0) ? v : best,
  );

  return {
    ...test,
    status: 'concluded',
    winner: winner.version,
    concludedAt: new Date().toISOString(),
  };
}
```

### A/B Test Lifecycle

1. **Trigger**: Auto-optimization generates variants OR user creates a new version
2. **Setup**: Create `ABTest` with current active + new variants, `minSamplesPerVariant: 5`
3. **Execution**: Each generation for this template selects a variant via `selectVariantForABTest`
4. **Conclusion**: After all variants reach min samples, the winner is determined
5. **Promotion**: Winner becomes the active version. Creates an `EvolutionCandidate` with `type: 'prompt_version_promotion'`

---

## 14. Configuration

### Extension to .aidd/config.json

```json
{
  "evolution": {
    "enabled": true,
    "autoApplyThreshold": 90,
    "draftThreshold": 70,
    "learningPeriodSessions": 5,
    "killSwitch": false
  },
  "promptEvolution": {
    "enabled": true,
    "storage": "sqlite",
    "dbPath": ".aidd/prompt-evolution.db",

    "feedback": {
      "ratingScale": 5,
      "implicitSignals": true,
      "collectUserEdits": true
    },

    "scoring": {
      "algorithm": "thompson_sampling",
      "priorAlpha": 1.0,
      "priorBeta": 1.0,
      "timeDecayFactor": null
    },

    "versioning": {
      "autoVersionOnEdit": true,
      "maxVersionsPerTemplate": 50,
      "semverStrategy": "auto"
    },

    "exemplars": {
      "enabled": true,
      "maxPerCategory": 5,
      "minRating": 4,
      "prependToPrompt": true,
      "maxContextExemplars": 3
    },

    "autoOptimization": {
      "enabled": true,
      "minFeedbackCount": 10,
      "triggerBelowRating": 3.5,
      "maxVariantsPerRun": 3,
      "optimizationProvider": "gemini",
      "maxOptimizationsPerDay": 5,
      "requireUserApproval": true
    },

    "vlmJudge": {
      "enabled": false,
      "provider": "gemini",
      "maxPerSession": 20,
      "autoJudgeOnRating": true,
      "judgeDimensions": [
        "prompt_adherence",
        "design_fidelity",
        "aesthetic_quality",
        "realism",
        "technical_quality"
      ]
    },

    "abTesting": {
      "enabled": true,
      "minSamplesPerVariant": 5,
      "autoPromoteWinner": false,
      "maxConcurrentTests": 10
    }
  }
}
```

---

## 15. Cold Start Strategy

The system must behave identically to static prompts until enough data accumulates. This is handled naturally by the architecture:

### Phase 1: No Data (sessions 0-5)

- Templates serve their hardcoded `v1.0.0` prompts
- Thompson Sampling uses uniform prior `Beta(1, 1)` — all templates equally likely
- No optimization triggers (minimum threshold not met)
- Feedback collection is active but silent
- **User experience**: Identical to the current static system

### Phase 2: Early Data (sessions 5-20)

- Template scores begin to differentiate (popular templates surface)
- Exemplar memory starts collecting (first 4-5 star ratings)
- No auto-optimization yet (< 10 ratings per template)
- **User experience**: Subtle reordering of template suggestions based on scores

### Phase 3: Sufficient Data (sessions 20+)

- Auto-optimization triggers for low-performing templates
- Exemplar memory provides few-shot context
- A/B tests run for optimized variants
- Evolution engine proposes improvements via drafts
- **User experience**: Noticeably better prompt quality; drafts appear for review

### Phase 4: Mature (sessions 50+)

- Strong statistical signal for template rankings
- Crossover generates composite improvements
- VLM-as-Judge provides automated QA
- System is self-maintaining with periodic evolution analysis
- **User experience**: Prompts feel significantly optimized; the system "knows" what works

---

## 16. Anti-Patterns and Guardrails

### Anti-Pattern 1: Autonomous Loops

**Problem**: LLM evaluates its own output and refines without human input → converges to generic, bland outputs.

**Guardrail**: Every auto-optimization candidate goes through the AIDD draft system. Auto-apply threshold (90%) requires both high statistical confidence AND user rating agreement. The `killSwitch` in config instantly disables all auto-actions.

### Anti-Pattern 2: Prompt Bloat

**Problem**: Each optimization cycle adds more instructions → prompts grow unbounded → model performance degrades.

**Guardrail**: Mutation prompt includes constraint "do not increase prompt length by more than 20%." Max prompt length is enforced at the schema level. Prompt length is tracked as a metric — if length increases without rating improvement, the system flags it.

### Anti-Pattern 3: Overfitting to User Preference

**Problem**: System optimizes prompts for a single user's taste, which may not generalize.

**Guardrail**: For single-user desktop apps, this is actually desirable — the system should optimize for that user. For multi-user deployments, add a `user_id` field to feedback and maintain per-user scores alongside global scores.

### Anti-Pattern 4: Rating Fatigue

**Problem**: Users stop rating after initial novelty, starving the feedback loop.

**Guardrail**: Collect implicit signals (save, regenerate, time-viewed) alongside explicit ratings. Make rating friction minimal (1-click thumbs up/down, with optional 1-5 detail). Show users how their ratings improve results (gamification).

### Anti-Pattern 5: Cold Start Regression

**Problem**: Auto-optimized prompts perform worse than originals but get promoted.

**Guardrail**: A/B testing ALWAYS includes the current active version as a control. Winner must have statistically higher ratings than the control. Original `v1.0.0` is never deleted and always available for rollback.

### Anti-Pattern 6: API Cost Explosion

**Problem**: VLM judging + LLM mutation + A/B testing multiplies API costs.

**Guardrail**: All cost-incurring operations are opt-in with configurable limits (`maxPerSession`, `maxOptimizationsPerDay`). Show estimated cost before enabling features. Batch operations where possible.

---

## 17. Implementation Phases

### Phase A: Foundation (L1 + L2)

**Effort**: Low (1-2 sessions)
**Deliverables**:
- SQLite schema creation (prompt_feedback + template_scores tables)
- `aidd_prompt_feedback_record` tool
- `aidd_prompt_feedback_rate` tool
- `aidd_prompt_score_get` tool
- Thompson Sampling score update on rating
- Config extension for `promptEvolution`

**Gate**: Feedback is being recorded. Scores update on rating.

### Phase B: Versioning (L3)

**Effort**: Medium (2-3 sessions)
**Deliverables**:
- prompt_versions table
- Seed existing templates as `v1.0.0` entries
- `aidd_prompt_version_create` tool
- `aidd_prompt_version_list` tool
- `aidd_prompt_version_activate` tool
- `aidd_prompt_version_rollback` tool
- Version history UI concept (for consuming apps)

**Gate**: Prompt versions are tracked. Active version resolution works. Rollback functions.

### Phase C: Exemplar Memory (L4)

**Effort**: Low (1 session)
**Deliverables**:
- exemplars table
- `aidd_prompt_exemplar_list` tool
- `detectExemplarPromotions` analyzer
- `buildPromptWithExemplars` helper
- Integration with evolution drafts

**Gate**: High-rated outputs are captured. Few-shot context is prepended to prompts.

### Phase D: Auto-Optimization (L5)

**Effort**: Medium (2-3 sessions)
**Deliverables**:
- `aidd_prompt_optimize` tool
- Mutation prompt template
- `detectPromptRefinements` analyzer
- `detectSlotOptimizations` analyzer
- Genetic crossover logic
- Integration with evolution drafts and confidence thresholds

**Gate**: Low-performing templates trigger optimization. Variants are generated. Drafts created for review.

### Phase E: A/B Testing (L5 extension)

**Effort**: Low-Medium (1-2 sessions)
**Deliverables**:
- A/B test state management
- `selectVariantForABTest` logic
- `concludeABTest` logic
- Automatic winner promotion (gated by confidence)

**Gate**: Multiple versions compete. Winner promotion works.

### Phase F: VLM-as-Judge (L6)

**Effort**: Low (1 session)
**Deliverables**:
- Judge prompt template
- VLM API integration
- Score normalization
- Config for opt-in activation
- Cost tracking

**Gate**: Automated scores supplement human ratings.

---

## 18. Cross-References

- **Evolution Engine**: `mcps/mcp-aidd-memory/src/modules/evolution/`
- **Evolution Types**: `mcps/mcp-aidd-memory/src/modules/evolution/types.ts`
- **Pattern Analyzer**: `mcps/mcp-aidd-memory/src/modules/evolution/analyzer.ts`
- **Drafts Module**: `mcps/mcp-aidd-memory/src/modules/drafts/`
- **Memory Layer Spec**: `content/specs/memory-layer.md`
- **AIDD Lifecycle**: `content/specs/aidd-lifecycle.md`
- **Config Schema**: `.aidd/config.json`
- **Heuristics**: `content/specs/heuristics.md`

### Research Sources

- [Google PASTA: Preference-Adaptive Sequential Prompting](https://research.google/blog/a-collaborative-approach-to-image-generation/)
- [Autonomous AI-to-AI Loops Converge to Generic Output](https://www.sciencedirect.com/science/article/pii/S2666389925002995)
- [DSPy: Programming Language Models](https://dspy.ai/)
- [GAAPO: Genetic Algorithmic Prompt Optimization](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1613007/full)
- [Self-Generated In-Context Examples (NeurIPS 2025)](https://yoheinakajima.com/better-ways-to-build-self-improving-ai-agents/)
- [Test-time Prompt Refinement (ICCV 2025)](https://openaccess.thecvf.com/content/ICCV2025W/MARS2/papers/Khan_Test-time_Prompt_Refinement_for_Text-to-Image_Models_ICCVW_2025_paper.pdf)
- [Multi-Armed Bandits + LLMs](https://arxiv.org/html/2505.13355v1)
- [LLM-as-a-Judge (Evidently AI)](https://www.evidentlyai.com/llm-guide/llm-as-a-judge)
- [PromptCharm: Multi-modal Refinement (CHI 2024)](https://dl.acm.org/doi/10.1145/3613904.3642803)
- [Prompt Versioning Best Practices (Maxim AI)](https://www.getmaxim.ai/articles/prompt-versioning-best-practices-for-ai-engineering-teams/)
