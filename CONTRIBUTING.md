# Contributing to AIDD

> AI-Driven Development — The open standard for AI agent coordination.

Thank you for your interest in contributing to AIDD. This document provides guidelines for contributing to the project.

---

## Table of Contents

- [Contributing to AIDD](#contributing-to-aidd)
  - [Table of Contents](#table-of-contents)
  - [1. Getting Started](#1-getting-started)
  - [2. Types of Contributions](#2-types-of-contributions)
  - [3. Creating a New Rule](#3-creating-a-new-rule)
  - [4. Creating a New Skill](#4-creating-a-new-skill)
  - [5. Creating a New Workflow](#5-creating-a-new-workflow)
  - [6. Creating a New Template](#6-creating-a-new-template)
  - [7. Adding Knowledge Base Entries](#7-adding-knowledge-base-entries)
  - [8. Pull Request Process](#8-pull-request-process)
  - [9. Code of Conduct](#9-code-of-conduct)

---

## 1. Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/aidd.md.git`
3. Create a feature branch: `git checkout -b feature/your-contribution`
4. Install dependencies: `npm install` (for validation scripts)
5. Make your changes following the guidelines below
6. Submit a pull request

---

## 2. Types of Contributions

| Type | Location | Description |
|------|----------|-------------|
| Rule | `rules/` | Immutable constraint files (prescriptive, MUST follow) |
| Skill | `skills/<name>/SKILL.md` | Specialized agent capabilities with optional scripts |
| Workflow | `workflows/` | Multi-step procedures for common tasks |
| Template | `templates/` | Task-specific development templates |
| Spec | `spec/` | Formal specification documents (descriptive reference) |
| Knowledge | `knowledge/<domain>/` | Technology Knowledge Base entries |
| Adapter | `adapters/<ide>/` | IDE/AI integration guides |
| Example | `examples/` | Example project setups |

---

## 3. Creating a New Rule

Rules are immutable constraints that apply across all contexts. Place in `rules/`.

**Format**:
```markdown
# Rule Name — Subtitle

> One-line purpose.

**Scope**: Where this rule applies
**Priority**: How it ranks against other rules

---

## Constraints

1. MUST/MUST NOT statements (prescriptive)
2. Each constraint testable and verifiable
3. Include rationale for non-obvious constraints

## Anti-Patterns

- What NOT to do (with explanation)

## Cross-References

- Related rules, specs, or skills
```

**Guidelines**:
- Rules use imperative language (MUST, MUST NOT, SHOULD)
- Each constraint must be independently verifiable
- Reference `spec/` documents for detailed rationale
- Update `AGENTS.md` Golden Rules section if adding a universal constraint

---

## 4. Creating a New Skill

Skills are specialized agent capabilities. Each lives in `skills/<name>/`.

**Required**: `SKILL.md` with YAML frontmatter:
```yaml
---
name: skill-name
description: When to use this skill
model: claude-opus-4-6|claude-sonnet-4-5|claude-haiku-4-5
---
```

**Optional**: `scripts/` directory for TypeScript validation tools.

**Guidelines**:
- One responsibility per skill
- Define clear activation keywords
- Include input/output contracts
- Reference relevant rules and workflows
- Update `AGENTS.md` agent system if adding a new role

---

## 5. Creating a New Workflow

Workflows are multi-step procedures. Place in `workflows/`.

**Format**:
```markdown
# Workflow Name

> Purpose and when to use.

## Prerequisites
## Steps (numbered)
## Success Criteria
## Rollback Plan
```

**Orchestrators** (multi-agent workflows): Follow `workflows/orchestrators/SPEC.md` — requires 3+ skills, model tier specs, success criteria, and cost estimation.

---

## 6. Creating a New Template

Templates are task-specific development guides. Place in `templates/`.

**Format**:
```markdown
# Template Name — Subtitle

> Tagline.

**Effort Tier**: 1 (HIGH) | 2 (STANDARD) | 3 (LOW)
**AIDD Skill**: skills/<name>/SKILL.md

## Preconditions
## Sub-Agent Roles (table)
## Process (numbered steps)
## Quality Gates (checklist)
## Anti-Patterns
## Cross-References
```

**Guidelines**:
- Templates are AI-agnostic (no tool-specific references)
- Reference AIDD skills, rules, and workflows
- Update `templates/routing.md` with keyword mappings

---

## 7. Adding Knowledge Base Entries

The Technology Knowledge Base (TKB) contains quantified metrics. Place in `knowledge/<domain>/`.

**Format**: Follow existing entries — include use case scores (1-10), benchmarks, trade-offs, and alternatives.

---

## 8. Pull Request Process

1. Ensure your contribution follows the format guidelines above
2. Update `AGENTS.md` if your change affects the system map or agent roles
3. Run validation scripts if applicable: `npm run validate:mermaid`, `npm run validate:openapi`, etc.
4. Write a clear PR description explaining what you're adding and why
5. Reference any related issues

**Commit format**: `type(scope): description`
- Types: feat, fix, docs, refactor, test, chore
- Scope: the affected component (e.g., rules, skills, workflows, templates, spec)

---

## 9. Code of Conduct

- Be respectful and constructive
- Focus on evidence-based technical discussions
- Follow the AIDD principles: Evidence-First, First Principles, Radical Neutrality
- No opinions without supporting logic, data, or principles
