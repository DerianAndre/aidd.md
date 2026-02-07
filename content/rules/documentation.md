# Documentation: Normalized Patterns & Folder Structure

> **Activation:** All projects. These rules govern how documentation is structured, named, and maintained.

---

## Normalized Document Pattern

Every documentation file MUST follow this header structure:

```markdown
# Title — Subtitle
> Tagline (one-line purpose statement)

**Last Updated**: YYYY-MM-DD
**Status**: Living Document | Reference | Implementation In Progress | Archived

---

## Table of Contents

1. [Section Name](#1-section-name)
2. [Section Name](#2-section-name)

---

## 1. Section Name

Content...
```

### Rules

- **Title** MUST use `# Title — Subtitle` format (em dash separator)
- **Tagline** MUST be a single blockquote line summarizing the document's purpose
- **Last Updated** MUST be present and accurate. Update it on every meaningful change.
- **Status** MUST be one of: `Living Document`, `Reference`, `Implementation In Progress`, `Archived`
- **Table of Contents** MUST be numbered and use anchor links for documents with 3+ sections
- **Sections** MUST be numbered sequentially: `## 1.`, `## 2.`, etc.

---

## Folder Structure

Documentation MUST be organized in the following hierarchy:

```
docs/
├── architecture/     ← ADRs, system design, file maps, dependency diagrams
├── features/         ← Feature specs, roadmaps, checklists, ideas
├── guides/           ← Getting started, configuration, how-to guides
├── plans/
│   ├── active/       ← In-progress implementation plans
│   └── done/         ← Completed plans (date-prefixed)
└── specs/            ← Formal specifications (API contracts, protocols)
```

### Folder Responsibilities

| Folder               | Contains                                   | Naming Convention             |
| -------------------- | ------------------------------------------ | ----------------------------- |
| `docs/architecture/` | ADRs, system design, file maps             | `001-decision-name.md` (ADRs) |
| `docs/features/`     | Feature specs, roadmap, checklists, ideas  | `feature-name.md`             |
| `docs/guides/`       | Getting started, configuration, tutorials  | `topic-name.md`               |
| `docs/plans/active/` | Plans currently being implemented          | `feature-name.md`             |
| `docs/plans/done/`   | Completed plans (archived)                 | `YYYY-MM-DD-feature-name.md`  |
| `docs/specs/`        | Formal specs (API contracts, data formats) | `spec-name.md`                |

---

## Architecture Decision Records (ADR)

Every significant architectural decision MUST be recorded as an ADR in `docs/architecture/`.

### ADR Template

```markdown
# ADR-NNN: Decision Title

**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-NNN
**Date**: YYYY-MM-DD
**Deciders**: [names or roles]

## Context

What is the issue that we're seeing that motivates this decision?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult because of this change?
```

### ADR Rules

- MUST be numbered sequentially: `001-use-hexagonal-architecture.md`, `002-choose-zustand-over-redux.md`
- MUST NOT be deleted. Superseded ADRs are marked `Superseded by ADR-NNN`.
- MUST be committed separately: `docs(architecture): add ADR-003 for event sourcing`

---

## Plan Lifecycle

Plans track implementation work from inception to completion.

1. **Create**: New plan in `docs/plans/active/feature-name.md`
2. **Update**: Keep the plan current as implementation proceeds. Mark completed sections.
3. **Complete**: Move to `docs/plans/done/YYYY-MM-DD-feature-name.md` with date prefix
4. **Reference**: Completed plans serve as historical record of decisions and trade-offs

### Plan Rules

- Active plans MUST reflect current implementation state
- Completed plans MUST be date-prefixed: `2026-02-04-chat-persistence.md`
- Plans MUST NOT be deleted — move to `done/` when finished

---

## File Naming

- All documentation files MUST use **kebab-case**: `getting-started.md`, `chat-persistence.md`
- Archived/completed plans MUST use date prefix: `YYYY-MM-DD-feature-name.md`
- ADRs MUST use sequential numbering: `NNN-decision-name.md`
- MUST NOT use spaces, underscores, or camelCase in file names

---

## Anti-Patterns (MUST NOT)

- **Undocumented decisions**: Every architectural decision MUST have an ADR. "We discussed it in a meeting" is not documentation.
- **Stale documents**: If the code changed, the docs MUST be updated. Outdated docs are worse than no docs.
- **Missing Table of Contents**: Documents with 3+ sections MUST include a numbered, anchored TOC.
- **No status field**: Every document MUST declare its status. Readers need to know if content is current.
- **Orphaned plans**: Plans in `active/` that are actually completed MUST be moved to `done/`.
- **Documentation in code comments**: Long-form explanations belong in `docs/`, not in multi-paragraph code comments.
- **README as dumping ground**: README files MUST be concise entry points. Detailed content goes in `docs/`.

---

**Cross-references:** [specs/aidd-lifecycle.md](../specs/aidd-lifecycle.md) (PLAN and SPEC phases), [rules/global.md](global.md) (evidence-first, communication standards)

---

## Template: Documentation

> Absorbed from `templates/documentation.md`

### Documentation Types

| Type | Purpose | Audience |
|------|---------|----------|
| **Guide** | Step-by-step, task-oriented ("How to set up X") | Developers |
| **Reference** | Complete API/configuration docs, exhaustive | Developers |
| **Spec** | Formal specification, precise, unambiguous | Architects |
| **ADR** | Architecture Decision Record | Team |
| **Changelog** | Version changes log | All |
| **README** | Project overview, quick start | New developers |

### Writing Process

**Step 1 -- Classify Document Type**

Determine which type (Guide, Reference, Spec, ADR, Changelog, README) before writing.

**Step 2 -- Apply Normalized Pattern**

Title + tagline + metadata + ToC + numbered sections. Last Updated MUST be current date.

**Step 3 -- Write Content**

- **Accurate**: verify against actual code/behavior
- **Concise**: remove words that do not add meaning
- **Example-rich**: show, do not just tell
- **Scannable**: headers, lists, tables, code blocks

**Step 4 -- Verify**

- Code examples compile/run
- Links resolve (no broken references)
- No stale information
- Cross-references accurate

### Documentation Quality Gates

- [ ] Normalized pattern applied
- [ ] Code examples verified (compile/run)
- [ ] No broken links
- [ ] Last Updated is current date
- [ ] ToC matches actual sections
- [ ] Target audience appropriate language level

### Documentation Anti-Patterns (Template)

- Undated documents
- Missing table of contents
- Code examples that do not compile
- Mixing guide and reference styles
- Documenting implementation instead of behavior
- "TODO: write this later" placeholders left in
- Stale docs that no longer match code

**Version:** 1.0.0
**Last Updated:** 2026-02-04
**Applies To:** All projects with documentation
