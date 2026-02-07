# Competency Matrix: Cross-Node Heuristics

> **Purpose:** Define shared decision-making frameworks and heuristics that transcend individual skills

---

## Principle: Polymathy Through Shared Mental Models

**Problem:** Specialists often don't share vocabulary or decision frameworks

**Solution:** Codify common heuristics that ALL nodes use (e.g., Pareto, First Principles, Second-Order Effects)

---

## Universal Heuristics (All Nodes)

### 1. Evidence-First Thinking

**Rule:** No opinions, only data and first principles

**Application by Node:**

- **system-architect:** Technology choices backed by benchmarks, not hype
- **experience-engineer:** Performance optimizations based on profiling, not assumptions
- **security-architect:** Vulnerability assessments based on OWASP taxonomy, not gut feel
- **quality-engineer:** Coverage targets based on cyclomatic complexity, not arbitrary %

**Example (system-architect):**

```
❌ "Let's use microservices because they're modern"
✅ "Microservices justified because:
   - Team size: 20+ engineers (Conway's Law)
   - Independent deployment needed (business requirement)
   - Bounded contexts clearly defined (DDD analysis)"
```

---

### 2. Pareto Efficiency (80/20 Rule)

**Rule:** Focus on 20% of work that delivers 80% of value

**Application by Node:**

- **design-architect:** Design 5 core components → derive 50 variations (composition)
- **quality-engineer:** Test 20% of code (high complexity) → catch 80% of bugs
- **platform-engineer:** Cache 20% of endpoints → reduce 80% of DB load
- **knowledge-architect:** Document 20% of functions (public API) → enable 80% of use cases

**Example (quality-engineer):**

```typescript
// Instead of testing EVERYTHING...
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Test all 100 functions (wasted effort)

// ✅ Test high-complexity functions (20%)
function processRefund(order: Order, items: Item[]): RefundResult {
  // Cyclomatic complexity: 18 (MANDATORY tests)
  // ...complex logic with many branches
}
```

---

### 3. Second-Order Effects

**Rule:** Analyze consequences of consequences

**Application by Node:**

- **system-architect:** Choosing microservices?
  - 1st order: Independent deployment ✅
  - 2nd order: Network overhead, distributed tracing complexity ⚠️
- **experience-engineer:** Adding state library?
  - 1st order: Easier state management ✅
  - 2nd order: Larger bundle, learning curve for team ⚠️
- **security-architect:** Implementing 2FA?
  - 1st order: Better security ✅
  - 2nd order: User friction, support tickets increase ⚠️

**Framework:**

```
Decision: [X]
1st Order: [Immediate effect]
2nd Order: [Consequence of 1st order]
3rd Order: [Consequence of 2nd order]
Net Benefit: [Weighted sum]
```

---

### 4. Occam's Razor (Simplicity)

**Rule:** Prefer simplest solution that solves the problem

**Application by Node:**

- **system-architect:** Monolith > Microservices (unless proven otherwise)
- **experience-engineer:** `useState` > Zustand > XState (escalate only when needed)
- **data-architect:** Normalize but don't over-normalize (3NF sweet spot)
- **quality-engineer:** Test behavior, not implementation (less brittle)

**Example (experience-engineer):**

```typescript
// ❌ Overengineered
import { createMachine } from "xstate";

const toggleMachine = createMachine({
  initial: "off",
  states: {
    off: { on: { TOGGLE: "on" } },
    on: { on: { TOGGLE: "off" } },
  },
});

// ✅ Occam's Razor
const [isOn, setIsOn] = useState(false);
```

---

## Domain-Specific Competencies

### Matrix: Who Knows What

| Competency                  | Primary Node        | Secondary Nodes                        | Rationale                                                            |
| --------------------------- | ------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| **Color Theory**            | design-architect    | interface-artisan, experience-engineer | Design systems define, artisans implement, engineers optimize        |
| **SQL Optimization**        | data-architect      | platform-engineer                      | Architects design schemas, platform monitors performance             |
| **State Machines**          | experience-engineer | quality-engineer                       | Engineers design patterns, testers validate state transitions        |
| **Container Orchestration** | platform-engineer   | system-architect                       | Platform deploys, architects plan infrastructure                     |
| **WCAG Standards**          | interface-artisan   | design-architect, quality-engineer     | Artisans implement, architects define, testers validate              |
| **OWASP Top 10**            | security-architect  | experience-engineer                    | Security audits, engineers prevent vulnerabilities                   |
| **i18n/l10n**               | i18n-specialist     | interface-artisan, experience-engineer | Specialist designs patterns, artisans implement, engineers integrate |

---

## Knowledge Transfer Protocols

### When Node A Needs Node B's Expertise

**Example:** experience-engineer needs SQL optimization advice

**Protocol:**

1. **Check Competency Matrix:** Is this Node B's primary domain?
2. **Consult Interface Contract:** What output format does Node B provide?
3. **Request Specific Artifact:** "Generate optimized query for X"
4. **Validate Output:** Run performance benchmark

**Anti-Pattern:**

```
❌ experience-engineer writes SQL themselves (out of domain)
✅ experience-engineer requests: "Optimize this query" → data-architect responds
```

---

## Cross-Cutting Concerns

### Concern 1: Performance

**Responsibility Matrix:**

| Layer        | Primary Node        | Metric             | Target |
| ------------ | ------------------- | ------------------ | ------ |
| **Frontend** | experience-engineer | Lighthouse score   | ≥95    |
| **API**      | experience-engineer | p95 latency        | <200ms |
| **Database** | data-architect      | Query time         | <50ms  |
| **Network**  | platform-engineer   | CDN cache hit rate | >90%   |

**Shared Heuristic:**

- Measure before optimizing (no premature optimization)
- Use profiling tools (Chrome DevTools, `EXPLAIN ANALYZE`, APM)
- Optimize hot paths (20% of code = 80% of time)

---

### Concern 2: Security

**Layered Defense (All Nodes Contribute):**

```
┌──────────────────────────────────────────────┐
│ experience-engineer: XSS prevention          │ ← Input sanitization
├──────────────────────────────────────────────┤
│ data-architect: SQL injection prevention     │ ← Parameterized queries
├──────────────────────────────────────────────┤
│ data-architect: Role-based access control    │ ← DB permissions
├──────────────────────────────────────────────┤
│ platform-engineer: Network policies, secrets │ ← Infrastructure
├──────────────────────────────────────────────┤
│ security-architect: Pentesting, audits       │ ← Verification
└──────────────────────────────────────────────┘
```

**Shared Principle:** Defense in depth (multiple layers, not single chokepoint)

---

## Decision Frameworks

### Framework 1: Cost-Benefit Analysis

**Template (All Nodes):**

```markdown
## Decision: [Use Technology X]

### Costs

- **Time:** X hours to implement
- **Complexity:** +Y lines of code
- **Risk:** Z% chance of failure

### Benefits

- **Performance:** A% improvement
- **Maintainability:** B% less code
- **Scalability:** Supports C users

### Net Value

Benefit Score - Cost Score = [Net]

If Net > 0 → Proceed
If Net < 0 → Reject
```

---

### Framework 2: Architectural Trade-Off Analysis (ATAM)

**For Major Decisions:**

| Quality Attribute   | Option A | Option B | Winner |
| ------------------- | -------- | -------- | ------ |
| **Performance**     | 95/100   | 80/100   | A      |
| **Scalability**     | 70/100   | 90/100   | B      |
| **Maintainability** | 85/100   | 60/100   | A      |
| **Cost**            | $5k/mo   | $2k/mo   | B      |

**Weighted Score:**

```
Option A: (95*0.3) + (70*0.2) + (85*0.3) + (50*0.2) = 78.5
Option B: (80*0.3) + (90*0.2) + (60*0.3) + (80*0.2) = 76.0

Winner: Option A (by 2.5 points)
```

---

## Continuous Learning

### Knowledge Sharing Mechanism

**Scenario:** experience-engineer discovers performance pattern

**Action:**

1. Document pattern in `knowledge/patterns/performance-patterns.md`
2. Update competency matrix (add "Performance Patterns" row)
3. Share with quality-engineer (add perf tests), platform-engineer (monitor in prod)

**Result:** Individual learning becomes collective knowledge

---

## Conflict Resolution

**When Two Nodes Disagree:**

**Example:** system-architect wants microservices, platform-engineer says monolith

**Resolution Protocol:**

1. **State Assumptions:** Each node lists their reasoning
2. **Identify Constraints:** What hard requirements exist?
3. **Run Experiments:** Prototype both (time-boxed)
4. **Measure:** Compare against agreed metrics
5. **Decide:** Evidence wins, not seniority

---

## Anti-Patterns to Avoid

### 1. Analysis Paralysis

❌ Spending 3 weeks debating architecture
✅ Time-box to 2 days, prototype, measure

### 2. Not Invented Here (NIH) Syndrome

❌ "We'll build our own React"
✅ Use proven libraries, customize only when necessary

### 3. Resume-Driven Development

❌ "Let's use Kubernetes because it's on my résumé"
✅ Choose tech that solves actual problems

### 4. Cargo Cult Programming

❌ "Google uses microservices, so we must too"
✅ Understand context (Google = 1000s of engineers, we = 5)

---

**Enforcement:** These heuristics are referenced in `rules/global.md` and taught during node initialization.
