# 📚 Technology Knowledge Base (TKB)

> **Purpose:** Centralized repository of technology metrics, patterns, and best practices for evidence-based decision making.

---

## 🎯 Philosophy

The TKB is **descriptive, not prescriptive**. It stores quantified data, benchmarks, and trade-offs to enable the **Master Orchestrator** to make context-aware technology recommendations based on:

- Project requirements
- Performance constraints
- Team expertise
- Budget limitations
- Timeline pressures

**No technology is universally "best"**—only "best for this specific context."

---

## 🗂️ Structure

```
knowledge/
├── runtimes/           # JavaScript/TypeScript execution environments
├── frontend/
│   ├── meta-frameworks/   # Next.js, Astro, Remix, SolidStart
│   └── patterns/          # Islands, RSC, state management
├── backend/
│   ├── architecture/      # Event-driven, microservices, monolith
│   └── communication/     # WebSockets, gRPC, REST
├── data/
│   ├── databases/         # Postgres, MySQL, SQLite
│   ├── orms/              # Drizzle, Prisma, TypeORM
│   └── caching/           # Redis, Valkey
├── testing/
│   ├── unit/              # Vitest, Jest
│   ├── e2e/               # Playwright, Cypress
│   └── patterns/          # Contract testing, a11y
├── infrastructure/
│   ├── containers/        # Podman, Docker
│   ├── orchestration/     # Kubernetes, serverless
│   └── observability/     # OpenTelemetry, metrics
├── security/
│   ├── dependency-scanning/  # Socket.dev, Snyk
│   └── standards/            # OWASP 2026
├── tooling/
│   ├── monorepos/         # Turborepo, Nx
│   ├── linting/           # Biome, ESLint
│   └── formatting/        # Prettier
└── patterns/              # DDD, Repository, EDA
```

---

## 📝 Entry Schema

Every `.md` file follows this structure:

```yaml
---
name: Technology Name
category: runtime | frontend | backend | data | testing | infrastructure | security | tooling | pattern
last_updated: YYYY-MM-DD
maturity: stable | emerging | experimental | deprecated
---
```

### Sections

1. **Overview:** 1-2 sentence description
2. **Key Metrics:** Quantified performance, DX, maturity, cost
3. **Use Cases:** Scenario fit scores (1-10) with rationale
4. **Trade-offs:** Strengths and weaknesses with data
5. **Alternatives:** Comparison table
6. **References:** Sources for all quantified claims

---

## 🔍 Usage (For the Orchestrator)

### Query Pattern

```typescript
// Pseudo-code
const query = {
  category: "data/orms",
  constraints: {
    performance: "high", // cold start < 100ms
    environment: "serverless", // edge-compatible
    maturity: "stable",
  },
};

const results = await queryTKB(query);
// Returns: [drizzle.md, prisma.md] with fit scores
```

### Decision Flow

1. **Extract Requirements:** Parse user request for technical constraints
2. **Query TKB:** Retrieve relevant technology entries
3. **Filter:** Eliminate options that violate hard constraints
4. **Score:** Rank by fit using weighted criteria
5. **Present:** Show top 2-3 options with trade-off matrix
6. **Capture:** Record user's final choice for context

---

## ✍️ Contributing to the TKB

### Adding a New Entry

1. **Determine Category:** Place in appropriate subdirectory
2. **Follow Schema:** Use YAML frontmatter + required sections
3. **Cite Sources:** All metrics must reference benchmarks, docs, or case studies
4. **Quantify:** Avoid subjective language ("fast" → "70k req/s")
5. **Update Index:** Add to this README if creating new category

### Updating Existing Entries

- **Version Control:** Keep `last_updated` current
- **Preserve History:** Don't delete outdated metrics—mark as deprecated
- **Cite Changes:** Reference source for new data

---

## 🔄 Maintenance

- **Quarterly Review:** Check `last_updated` dates
- **Deprecation Policy:** Mark technologies with breaking changes or sunset announcements
- **Conflict Resolution:** If benchmarks conflict, cite both with methodology notes

---

## 🎯 Example: Runtime Selection

**User Request:** "I need a backend for a high-traffic API"

**Orchestrator Flow:**

1. Query `knowledge/runtimes/*.md`
2. Extract metrics: `nodejs.md` (25k req/s), `bun.md` (70k req/s), `deno.md` (40k req/s)
3. Ask clarifying question: "Do you need legacy npm package compatibility?"
   - Yes → Recommend Node.js or Bun
   - No → Include Deno
4. Present comparison matrix with trade-offs
5. User selects → Context recorded

**Output:**

```markdown
## Runtime Recommendation

| Runtime | Req/Sec | Cold Start | Ecosystem | Fit Score |
| ------- | ------- | ---------- | --------- | --------- |
| Bun     | 70k     | ~50ms      | 95% npm   | 9/10      |
| Node.js | 25k     | ~200ms     | 100% npm  | 7/10      |
| Deno    | 40k     | ~100ms     | JSR only  | 6/10      |

**Recommendation:** Bun (highest throughput, fast cold start)
**Trade-off:** 5% npm incompatibility risk—validate critical deps
```

---

## 📊 Current Coverage

Total Entries: **105** (65 initial + 40 expansion)

| Category       | Entries | Status      |
| -------------- | ------- | ----------- |
| Runtimes       | 3       | ✅ Complete |
| Frontend       | 27      | ✅ Complete |
| Backend        | 11      | ✅ Complete |
| Data           | 12      | ✅ Complete |
| Testing        | 8       | ✅ Complete |
| Infrastructure | 10      | ✅ Complete |
| Security       | 8       | ✅ Complete |
| Tooling        | 17      | ✅ Complete |
| Patterns       | 9       | ✅ Complete |

---

## 📚 Related Documentation

- [`rules/orchestrator.md`](../rules/orchestrator.md) - How the Orchestrator uses TKB
- [`workflows/technology-selection.md`](../workflows/technology-selection.md) - Step-by-step selection workflow
- [`skills/knowledge-architect/SKILL.md`](../skills/knowledge-architect/SKILL.md) - TKB curation responsibilities
