---
description: 🔍 Technology selection workflow using the Technology Knowledge Base
---

# Workflow: Technology Selection (Evidence-Based)

> **Purpose:** Structured process for the Master Orchestrator to query the TKB and recommend optimal technologies based on project constraints.

## Invocation

| Type       | Items               |
| ---------- | ------------------- |
| **Workflows** | brainstorming       |
| **MCPs**   | WebSearch, Context7 |

---

## Prerequisites

- [ ] User requirements clarified (performance, budget, team skills, timeline)
- [ ] Technology Knowledge Base populated (`knowledge/`)
- [ ] Project constraints documented

---

## Step 1: Requirements Gathering

**Indicator**: `[aidd.md] Workflow - technology-selection (Requirements Gathering)`

**Extract Technical Constraints:**

| Constraint Type    | Questions to Ask                                              |
| ------------------ | ------------------------------------------------------------- |
| **Performance**    | Expected req/sec? Latency requirements? Cold start tolerance? |
| **Budget**         | Serverless pay-per-execute or dedicated infrastructure?       |
| **Team Skills**    | Existing expertise? Willingness to learn new tools?           |
| **Timeline**       | Prototype (weeks) vs production (months)?                     |
| **Existing Stack** | Must integrate with current services?                         |

**Example Prompt:**

```
To recommend the best technology, I need to understand:
1. Expected load (users/requests per second)
2. Budget constraints (serverless vs dedicated servers)
3. Team familiarity (existing expertise in React, Node.js, etc.)
4. Timeline (MVP in 4 weeks vs scalable in 6 months)
```

---

## Step 2: TKB Query

**Indicator**: `[aidd.md] Workflow - technology-selection (TKB Query)`

**Identify Relevant Categories:**

Based on the request, determine which TKB categories to query:

- **Runtime:** `knowledge/runtimes/` (Node.js, Bun, Deno)
- **Frontend:** `knowledge/frontend/meta-frameworks/` (Next.js, Astro, Remix)
- **Data Layer:** `knowledge/data/orms/`, `knowledge/data/databases/`
- **Testing:** `knowledge/testing/unit/`, `knowledge/testing/e2e/`

**Query Execution:**

```bash
# Pseudo-code
const relevantEntries = await query({
  category: "runtimes",
  maturity: ["stable", "emerging"], // Exclude experimental
  last_updated: ">= 2025-01-01"     // Recent data only
});
```

---

## Step 3: Constraint Filtering

**Indicator**: `[aidd.md] Workflow - technology-selection (Constraint Filtering)`

**Apply Hard Constraints:**

Remove options that violate non-negotiable requirements:

- **Example:** If "must run on AWS Lambda" → Exclude tools with >250MB cold start overhead
- **Example:** If "100% npm compatibility required" → Exclude Deno (95% compat)

**Scoring Criteria:**

| Criterion                 | Weight | Source                            |
| ------------------------- | ------ | --------------------------------- |
| Performance               | 30%    | TKB metrics (req/sec, cold start) |
| DX (Developer Experience) | 25%    | Ecosystem size, learning curve    |
| Maturity                  | 20%    | Adoption rate, LTS policy         |
| Cost                      | 15%    | Infrastructure costs, maintenance |
| Fit to Constraints        | 10%    | Hard requirement satisfaction     |

---

## Step 4: Trade-off Analysis

**Indicator**: `[aidd.md] Workflow - technology-selection (Trade-off Analysis)`

**Generate Comparison Matrix:**

Present top 2-3 options side-by-side:

```markdown
## Runtime Recommendation for High-Traffic API

| Runtime | Req/Sec | Cold Start | Ecosystem | Maturity | Fit Score |
| ------- | ------- | ---------- | --------- | -------- | --------- |
| **Bun** | 70k     | 50ms       | 95% npm   | Emerging | 9/10      |
| Node.js | 25k     | 200ms      | 100% npm  | Stable   | 7/10      |
| Deno    | 40k     | 100ms      | JSR only  | Stable   | 6/10      |

### Trade-offs

**Bun:**

- ✅ 2.8x faster than Node.js
- ✅ Fastest cold start (critical for serverless)
- ⚠️ 5% npm incompatibility risk (validate critical deps)

**Node.js:**

- ✅ 100% ecosystem compatibility
- ✅ LTS policy for long-term stability
- ❌ 2.8x slower throughput

**Recommendation:** **Bun** for high-traffic requirements, with dependency audit
```

---

## Step 5: Evidence-Based Recommendation

**Indicator**: `[aidd.md] Workflow - technology-selection (Evidence-Based Recommendation)`

**Present to User:**

1. **Top Choice:** Highest fit score with rationale
2. **Alternative:** Second-best with use case where it's superior
3. **Trade-offs:** Clear pros/cons with quantified data
4. **Action Items:** Next steps (e.g., "Validate these 3 npm packages with Bun")

**Avoid:**

- ❌ "Just use X because it's popular"
- ❌ Subjective language ("fast", "easy")
- ✅ "Bun handles 70k req/s vs 25k (Node.js) = 2.8x improvement"

---

## Step 6: Capture Decision

**Indicator**: `[aidd.md] Workflow - technology-selection (Capture Decision)`

**Record User Choice:**

Store the final selection in context for downstream decisions:

```markdown
**Technology Stack Decisions:**

- Runtime: Bun (rationale: high throughput + serverless cold start)
- ORM: Drizzle (rationale: 50ms cold start vs 300ms Prisma)
- Testing: Vitest (rationale: 4x faster than Jest, Vite integration)
```

This context informs future architecture, workflow, and skill selections.

---

## Edge Cases

### Insufficient TKB Data

**Symptom:** User asks about technology not in TKB  
**Action:**

1. Propose researching and adding to TKB (if time permits)
2. Recommend closest alternative with caveat
3. Flag for TKB expansion

### Conflicting Constraints

**Symptom:** "Need fastest runtime (Bun) + 100% npm compat (Node.js)"  
**Action:**

1. Clarify constraint priority ("Which is more critical?")
2. Present hybrid approach if viable ("Bun for API, Node.js for legacy service")

---

## Skills & Tools

- **Skill:** `knowledge-architect` - For TKB curation and updates
- **Skill:** `system-architect` - For architecture-level stack decisions
- **TKB:** [`knowledge/README.md`](../knowledge/README.md) - Query patterns and schema
