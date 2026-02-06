# Analysis — Read-Only Audit and Investigation

> Systematic investigation that produces evidence-based findings without modifying the codebase.

**Effort Tier**: 1 (HIGH_EFFORT)
**AIDD Skill**: `skills/system-architect/SKILL.md` (Technical Audit)

---

## Purpose

Conduct a read-only audit of code, architecture, or systems to identify patterns, anti-patterns, risks, and improvement opportunities. No changes are made during the analysis phase. The output is a structured findings report with severity-ranked issues and prioritized recommendations.

---

## Preconditions

- [ ] Clear scope definition (specific files, modules, or system boundaries)
- [ ] Objectives defined (what questions need answering)
- [ ] Access to all relevant code and documentation within scope
- [ ] Understanding of the system's intended behavior and constraints

---

## Sub-Agent Roles

| Role              | Responsibility                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Auditor**       | Systematically reads and catalogs code within scope. Identifies deviations from conventions, potential bugs, and structural issues. Measures quantitative metrics.       |
| **Domain Expert** | Interprets findings in the context of the project's architecture, business rules, and design decisions. Distinguishes intentional trade-offs from accidental complexity. |

---

## Process Steps

### Step 1: Define Scope and Objectives

Document precisely:
- **Scope**: Which files, modules, layers, or features are being analyzed
- **Objectives**: What questions this analysis should answer
- **Out of scope**: What is explicitly excluded
- **Depth**: Surface scan vs. deep dive

### Step 2: Read and Catalog

Systematically read all code and documentation within scope:
- Map the dependency graph (what depends on what)
- Catalog public interfaces, data flows, and integration points
- Note naming conventions, patterns in use, and structural organization
- Record file sizes, function counts, and structural observations

### Step 3: Identify Patterns and Issues

For each finding, document:
- **What**: Description of the pattern or issue
- **Where**: Specific file(s) and location(s)
- **Severity**: Critical / High / Medium / Low / Informational
- **Category**: Bug risk, performance, security, maintainability, consistency, correctness
- **Evidence**: Concrete code references supporting the finding

### Step 4: Measure

Collect quantitative metrics where possible:
- Lines of code per module/file
- Cyclomatic complexity of key functions
- Coupling between modules (import analysis)
- Test coverage (if available)
- Duplication (repeated patterns or copy-paste code)
- Dependency count and depth

### Step 5: Produce Findings Report

Structure the report in this exact format:

#### Executive Summary (BLUF)
Bottom Line Up Front: 2-3 sentences summarizing the overall health and the most critical finding.

#### Detailed Findings (Severity-Ranked)
Ordered from Critical to Informational. Each finding includes: ID, severity, category, description, location, evidence, and suggested remediation.

#### Metrics
Quantitative data collected in Step 4, presented in tables or bullet points.

#### Recommendations (Prioritized by Impact/Effort)
Ordered by impact-to-effort ratio. Each recommendation includes: what to do, why, expected impact, estimated effort, and dependencies.

---

## Quality Gates

- [ ] All files and modules within scope have been read
- [ ] Every finding has a severity level and evidence
- [ ] Findings are severity-ranked (Critical first)
- [ ] Quantitative metrics are included (not just opinions)
- [ ] Recommendations are actionable with clear next steps
- [ ] Recommendations are prioritized by impact/effort ratio
- [ ] No modifications were made to the codebase during analysis

---

## Anti-Patterns

| Anti-Pattern                       | Description                                                    | Mitigation                                                                         |
| ---------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Drive-By Fixing**                | Making changes during analysis instead of documenting findings | Enforce strict read-only discipline; all changes go into recommendations           |
| **Scope Creep**                    | Analysis expands beyond defined boundaries                     | Refer back to Step 1 scope definition; note out-of-scope observations separately   |
| **Opinion Without Evidence**       | Stating subjective preferences as findings                     | Every finding must reference specific code locations and explain the concrete risk |
| **Missing Quantitative Data**      | Relying only on qualitative observations                       | Always include measurable metrics; numbers ground the analysis in reality          |
| **Severity Inflation**             | Marking everything as Critical or High                         | Use the full severity range; reserve Critical for production-risk issues           |
| **Recommendation Without Context** | Suggesting changes without considering trade-offs              | Each recommendation must acknowledge effort, risk, and dependencies                |

---

## Cross-References

- **Workflow**: `workflows/analyze.md`
- **Audit workflow**: `workflows/audit.md`
- **BLUF-6 format**: `specs/bluf-6.md`
- **Global rules**: `rules/global.md`
- **Security rules**: `rules/security.md`
