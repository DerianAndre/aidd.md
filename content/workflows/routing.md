# Workflows — Routing Index

> Quick reference for multi-step orchestration workflows. Each workflow coordinates multiple skills/agents through a defined pipeline.

---

## Decision Table

| File | Purpose | Use When |
|------|---------|----------|
| [orchestrator.md](orchestrator.md) | Full brainstorm-to-execution pipeline with adaptive model selection and phase gates | Building a feature from a vague idea; need structured ideation, research, planning, and implementation |
| [full-stack-feature.md](full-stack-feature.md) | End-to-end feature development from architecture to deployment with all 10 agent roles | Implementing a complete API + UI feature with testing and documentation |
| [analyze.md](analyze.md) | Security assessment and quality audit using OWASP Top 10 with recursive feedback loops | Pre-production deployment, post-incident review, compliance audits, PR quality gates |
| [audit.md](audit.md) | Hexagonal architecture and monorepo boundary evaluation for decoupling compliance | Verifying domain purity, framework agnosticism, and dependency direction |
| [design.md](design.md) | WCAG 2.1 AA accessibility and Tailwind CSS visual design audit | Accessibility compliance checks, mobile-first audits, component quality reviews |
| [docs.md](docs.md) | Documentation sync and maintenance — keeps code and docs aligned | After major features, before releases, post-refactoring, API contract updates |
| [feature-branch.md](feature-branch.md) | Complete Git Flow workflow from branch creation to Pull Request | Creating feature branches, structuring commits, preparing PRs |
| [product.md](product.md) | Technical specification and Gherkin scenario generation for Definition of Ready | Writing specs, BDD scenarios (Given-When-Then), refining requirements before development |
| [review.md](review.md) | Pre-merge code review focused on architecture, security, and technical debt | Branch reviews, staged change audits, pre-merge quality checks |
| [technology-selection.md](technology-selection.md) | Evidence-based technology selection using the Technology Knowledge Base | Choosing frameworks, databases, runtimes, or tools based on project constraints |
| [test.md](test.md) | Complete test suite generation with Vitest using cyclomatic complexity prioritization | Writing tests, increasing coverage, targeting high-risk code paths |
| [SPEC.md](SPEC.md) | Workflow orchestrator specification — defines the standard format for all workflows | Creating new workflows, understanding the orchestrator contract and frontmatter schema |

---

## Complexity Quick Reference

| Complexity | Workflows |
|------------|-----------|
| **High** | orchestrator, full-stack-feature, analyze |
| **Medium** | docs, product, review, technology-selection, test |
| **Standard** | audit, design, feature-branch |

---

## Model Strategy

| Strategy | Workflows |
|----------|-----------|
| **Hybrid** (Tier 1 planning + Tier 2 execution) | orchestrator, analyze |
| **Sequential** (phased tier progression) | full-stack-feature |
| **Parallel** (concurrent agent dispatch) | docs |
