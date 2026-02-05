# Brainstorming — Diverge, Analyze, Converge, Document

> Structured ideation that prevents anchoring bias and ensures evidence-based decisions.

**Effort Tier**: 1 (HIGH_EFFORT)
**AIDD Skill**: `skills/system-architect/SKILL.md` (Strategic Planning)

---

## Purpose

Apply a Diverge-Analyze-Converge-Document pattern to generate, evaluate, and select the optimal approach for a given problem or feature request. This template prevents premature convergence and ensures all viable options are explored before committing.

---

## Preconditions

- [ ] Clear problem statement or feature request defined
- [ ] Scope boundaries established (what is in/out of scope)
- [ ] Success criteria identified (how do we know the solution works)
- [ ] Relevant codebase context loaded (architecture, constraints, existing patterns)

---

## Sub-Agent Roles

| Role | Responsibility |
|------|---------------|
| **Product Analyst** | Defines the problem space, user impact, and success metrics. Challenges assumptions about what users actually need. |
| **System Architect** | Evaluates technical feasibility, integration complexity, and architectural alignment. Identifies constraints and dependencies. |
| **UX Researcher** | Assesses usability, developer experience, and interaction patterns. Advocates for simplicity and consistency. |

---

## Process Steps

### Step 1: Define Problem Space

Clearly articulate:
- **What** is the problem or opportunity?
- **Who** is affected?
- **Why** does it matter now?
- **What constraints** exist (time, technical, organizational)?
- **What does success look like?**

### Step 2: Diverge — Generate Options

Generate **at least 3 distinct approaches**. Rules:
- No filtering or criticism during this phase
- Each option must be genuinely different (not variations of the same idea)
- Include at least one "unconventional" option
- Document each option with: name, summary, high-level approach, key trade-off

### Step 3: Analyze — Comparison Matrix

Evaluate each option against these criteria:

| Criteria | Weight | Option A | Option B | Option C |
|----------|--------|----------|----------|----------|
| Feasibility (can we build it?) | High | | | |
| Complexity (effort to implement) | High | | | |
| Maintainability (long-term cost) | Medium | | | |
| UX Impact (user value) | High | | | |
| Performance (runtime cost) | Medium | | | |
| Security (risk surface) | Medium | | | |
| Alignment (fits existing patterns) | Medium | | | |

Score each cell: Strong (++), Adequate (+), Neutral (0), Weak (-), Disqualifying (--)

### Step 4: Converge — Select Optimal Path

- Identify the option with the best weighted score
- Document **why** it wins over alternatives with specific evidence
- Identify risks in the selected approach and mitigation strategies
- Define the implementation boundary (what is included in this iteration)

### Step 5: Document — Decision Record

Produce a decision record containing:
- **Decision**: What was decided
- **Context**: Why this decision was needed
- **Options Considered**: Brief summary of each
- **Rationale**: Why the selected option was chosen
- **Trade-offs Accepted**: What we are giving up
- **Rejected Alternatives**: Why each was not selected
- **Risks and Mitigations**: Known risks with the chosen path

---

## Quality Gates

- [ ] At least 3 genuinely distinct options were explored
- [ ] Comparison matrix is completed with all criteria scored
- [ ] Decision is documented with rationale and evidence
- [ ] Rejected alternatives have documented reasons
- [ ] Trade-offs are explicitly acknowledged
- [ ] Implementation scope is clearly bounded

---

## Anti-Patterns

| Anti-Pattern | Description | Mitigation |
|-------------|-------------|------------|
| **Anchoring** | Fixating on the first idea generated | Force yourself to generate all options before evaluating any |
| **Premature Convergence** | Selecting an approach before exploring alternatives | Enforce the "3 options minimum" rule strictly |
| **NFR Blindness** | Ignoring non-functional requirements (performance, security, maintainability) | Use the full comparison matrix; do not skip criteria |
| **Bikeshedding** | Spending disproportionate time on trivial details | Time-box each phase; focus analysis on high-weight criteria |
| **Groupthink** | All options are variations of the same core idea | Require at least one option that challenges the dominant assumption |
| **Analysis Paralysis** | Over-analyzing without reaching a decision | Set a decision deadline; "good enough" with iteration beats "perfect" |

---

## Cross-References

- **Workflow**: `workflows/product.md`
- **Decision tree**: `rules/decision-tree.md`
- **System Architect skill**: `skills/system-architect/SKILL.md`
- **BLUF-6 output format**: `spec/bluf-6.md`
- **Technology selection workflow**: `workflows/technology-selection.md`
