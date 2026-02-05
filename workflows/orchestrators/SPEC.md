---
description: Orchestrator specification and standard format
---

# Workflow Orchestrator Specification

> **Purpose:** Define standards for multi-agent workflow orchestration

---

## What is an Orchestrator?

An orchestrator coordinates multiple specialized skills/agents to accomplish complex, multi-phase tasks that require sequential or parallel execution across different domains.

**Key Characteristics:**

- Coordinates 3+ skills/agents
- Has clear input → process → output flow
- Optimizes model usage (Opus → Sonnet → Haiku)
- Produces concrete artifacts
- Has measurable success criteria

---

## Standard Format

### Frontmatter (Required)

```yaml
---
name: orchestrator-name # Hyphen-case, descriptive
description: What this orchestrator does and when to use it
complexity: low|medium|high # Task complexity
estimated_duration: X minutes # Typical execution time
skills_required: # Skills activated during workflow
  - skill-name-1
  - skill-name-2
  - skill-name-3
model_strategy: sequential|hybrid # Model usage pattern
---
```

### Content Structure (Required)

```markdown
# Orchestrator Name

## Purpose

Brief description of what problem this orchestrator solves and when to use it.

## Workflow Stages

Sequential stages with skill, model tier, and specific task:

1. **Stage 1:** `skill-name` (model-tier)

   - Task: What this stage does
   - Input: What it needs
   - Output: What it produces

2. **Stage 2:** `skill-name` (model-tier)
   - Task: What this stage does
   - Input: Previous stage output
   - Output: What it produces

...

## Artifacts Produced

- Artifact 1 (format, location)
- Artifact 2 (format, location)
- Artifact 3 (format, location)

## Success Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Cost Estimation

| Model     | Stages | Est. Tokens   | Cost   |
| --------- | ------ | ------------- | ------ |
| Opus      | X      | ~Y tokens     | $Z     |
| Sonnet    | X      | ~Y tokens     | $Z     |
| Haiku     | X      | ~Y tokens     | $Z     |
| **Total** | **X**  | **~Y tokens** | **$Z** |

## Notes

Optional context, gotchas, or additional guidance.
```

---

## Model Strategy Patterns

### Sequential (Tiered Execution)

```
Opus (Critical Planning)
  ↓
Sonnet (Complex Execution)
  ↓
Haiku (Fast Operations)
```

**Example:** Feature development

- Opus: Architecture decisions
- Sonnet: Implementation patterns
- Haiku: Code generation, tests, deployment

### Hybrid (Mixed Execution)

```
      Opus (Critical)
       ↙     ↘
  Sonnet   Sonnet (Parallel)
       ↘     ↙
      Haiku (Fast)
```

**Example:** Security hardening

- Opus: Initial scan + final verification
- Sonnet: Remediation strategies
- Haiku: Test generation

### Parallel (Independent Tasks)

```
Opus ←→ Sonnet ←→ Haiku (Concurrent)
```

**Example:** Documentation sync

- Knowledge-architect (Haiku): Code scanning
- Contract-architect (Opus): API docs
- System-architect (Opus): Architecture diagrams

---

## Guidelines

### DO ✅

- Use clear, descriptive stage names
- Specify exact skill names (match directory names)
- Include concrete outputs for each stage
- Estimate token usage and costs
- Document failure scenarios

### DON'T ❌

- Create orchestrators for simple 1-2 skill tasks
- Skip model tier specifications
- Omit success criteria
- Forget to document dependencies

---

## Example Orchestrator

```yaml
---
name: api-security-audit
description: Comprehensive API security review using OWASP standards
complexity: high
estimated_duration: 45 minutes
skills_required:
  - contract-architect
  - security-architect
  - data-architect
model_strategy: hybrid
---

# API Security Audit Orchestrator

## Purpose

Perform a comprehensive security audit of REST APIs against OWASP Top 10 (2025).

## Workflow Stages

1. **Stage 1:** `contract-architect` (Opus)
   - Task: Validate OpenAPI spec completeness
   - Input: api-spec.yaml
   - Output: Spec validation report

2. **Stage 2:** `security-architect` (Opus)
   - Task: OWASP Top 10 vulnerability scan
   - Input: Source code + spec
   - Output: Vulnerability report (JSON)

3. **Stage 3:** `data-architect` (Sonnet)
   - Task: SQL injection prevention review
   - Input: Database queries
   - Output: Query safety report

4. **Stage 4:** `security-architect` (Opus)
   - Task: Generate remediation plan
   - Input: All reports
   - Output: security-remediation.md

## Artifacts Produced

- `spec-validation.json` - OpenAPI completeness
- `owasp-vulnerabilities.json` - Security findings
- `query-safety-report.md` - SQL injection analysis
- `security-remediation.md` - Fix recommendations

## Success Criteria

- [ ] All OWASP Top 10 categories reviewed
- [ ] No critical vulnerabilities unaddressed
- [ ] Remediation plan with priority levels
- [ ] All database queries validated

## Cost Estimation

| Model | Stages | Est. Tokens | Cost |
|-------|--------|-------------|------|
| Opus  | 3      | ~15,000     | $0.23 |
| Sonnet| 1      | ~5,000      | $0.02 |
| **Total** | **4** | **~20,000** | **$0.25** |
```

---

## Activation Patterns

Orchestrators are activated via:

1. **Slash command:** `/orchestrate <name> "<task>"`
2. **Direct reference:** "Use the api-security-audit orchestrator"
3. **Workflow trigger:** When complex multi-skill task is detected

---

**This specification is the canonical reference for all workflow orchestrators.**
