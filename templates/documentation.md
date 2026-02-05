# Documentation — Normalized Technical Writing

> Accurate, concise, example-rich. Every doc follows the pattern.

**Effort Tier**: 3→2 (LOW for simple docs, STANDARD for complex)
**AIDD Skill**: `skills/knowledge-architect/SKILL.md`

---

## Preconditions

- Feature or system to document identified
- Target audience defined (developers, users, stakeholders)
- Documentation type determined

## Sub-Agent Roles

| Role | Focus |
|------|-------|
| **Technical Writer** | Clarity, accuracy, structure, examples |
| **Knowledge Architect** | Information architecture, cross-references, discoverability |

## Documentation Types

| Type | Purpose | Audience |
|------|---------|----------|
| **Guide** | Step-by-step, task-oriented ("How to set up X") | Developers |
| **Reference** | Complete API/configuration docs, exhaustive | Developers |
| **Spec** | Formal specification, precise, unambiguous | Architects |
| **ADR** | Architecture Decision Record | Team |
| **Changelog** | Version changes log | All |
| **README** | Project overview, quick start | New developers |

## Normalized Pattern (MANDATORY)

```
# Title — Subtitle
> Tagline (one sentence describing the document)

**Last Updated**: YYYY-MM-DD
**Status**: Living Document | Reference | Implementation In Progress

---

## Table of Contents (numbered, anchored)

---

## 1. Section Name
Content...

## 2. Section Name
Content...
```

## Process

### Step 1 — Classify Document Type
- Guide, Reference, Spec, ADR, Changelog, README

### Step 2 — Apply Normalized Pattern
- Title + tagline + metadata + ToC + numbered sections
- Last Updated MUST be current date

### Step 3 — Write Content
- **Accurate**: verify against actual code/behavior
- **Concise**: remove words that don't add meaning
- **Example-rich**: show, don't just tell
- **Scannable**: headers, lists, tables, code blocks

### Step 4 — Verify
- Code examples compile/run
- Links resolve (no broken references)
- No stale information
- Cross-references accurate

## ADR Format

```markdown
# ADR-NNN: Title

**Status**: proposed | accepted | deprecated | superseded
**Date**: YYYY-MM-DD
**Deciders**: [who was involved]

## Context
What forces are at play? Why is this decision needed?

## Decision
What was decided and why?

## Consequences
### Positive
### Negative
### Neutral
```

## Doc Folder Structure

```
docs/
├── architecture/    — ADRs, system design
├── features/        — specs, roadmap, checklists
├── guides/          — how-to, getting started
├── plans/
│   ├── active/      — in-progress plans
│   └── done/        — completed (date-prefixed)
└── specs/           — formal specifications
```

## Quality Gates

- [ ] Normalized pattern applied
- [ ] Code examples verified (compile/run)
- [ ] No broken links
- [ ] Last Updated is current date
- [ ] ToC matches actual sections
- [ ] Target audience appropriate language level

## Anti-Patterns

- Undated documents
- Missing table of contents
- Code examples that don't compile
- Mixing guide and reference styles
- Documenting implementation instead of behavior
- "TODO: write this later" placeholders left in
- Stale docs that no longer match code

---

## Cross-References

- **Docs workflow**: `workflows/docs.md`
- **Knowledge Architect skill**: `skills/knowledge-architect/SKILL.md`
- **Global rules**: `rules/global.md`
- **Code style rules**: `rules/code-style.md`
