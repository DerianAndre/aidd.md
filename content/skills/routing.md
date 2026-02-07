# Skills — Routing Index

> Quick reference for specialized agent skills. Each skill defines a role, capabilities, and activation triggers via its `SKILL.md`.

---

## Skill Selection Matrix

| Skill | Role | Tier | Use When |
|-------|------|------|----------|
| [system-architect](system-architect/SKILL.md) | Principal Software Architect — C4 model, Mermaid diagrams, ADRs | T1 | "design", "architect", "diagram", "C4 model", "ADR", system planning |
| [contract-architect](contract-architect/SKILL.md) | API Governance Lead — OpenAPI 3.0/3.1 specs, contract-first development | T1 | "API design", "OpenAPI spec", "Swagger", "REST documentation", "endpoints" |
| [security-architect](security-architect/SKILL.md) | Security Engineer — OWASP Top 10 audits, vulnerability scanning, penetration testing | T1 | "audit security", "vulnerability scan", "OWASP", "encryption", "pre-deployment" |
| [data-architect](data-architect/SKILL.md) | Database Schema Engineer — DDL, 3NF normalization, PostgreSQL/MySQL/SQLite | T2 | "create table", "design schema", "write SQL", "data modeling", "DB normalization" |
| [design-architect](design-architect/SKILL.md) | Design Systems Architect — design tokens, Figma specs, bridge between design and code | T2 | "design system", "design tokens", "Figma", "visual design", "UI/UX strategy" |
| [experience-engineer](experience-engineer/SKILL.md) | Frontend Architect — state management, 60fps UX, performance optimization, Web APIs | T2 | "state management", "frontend architecture", "performance", "optimistic UI" |
| [platform-engineer](platform-engineer/SKILL.md) | DevOps/SRE Engineer — CI/CD pipelines, Docker, GitHub Actions, IaC, rollback strategies | T2 | "setup CI/CD", "deployment", "infrastructure", "Docker", "orchestration" |
| [interface-artisan](interface-artisan/SKILL.md) | Senior Frontend Engineer — React components, WCAG 2.1, Tailwind, Storybook, CDD workflow | T3 | "create component", "build UI", "React hook", accessibility audits |
| [quality-engineer](quality-engineer/SKILL.md) | QA Engineer — Vitest test suites, AAA pattern, cyclomatic complexity, coverage analysis | T3 | "write tests", "increase coverage", "test component", "regression test" |
| [knowledge-architect](knowledge-architect/SKILL.md) | Technology Librarian — TKB curation, schema compliance, technology entry maintenance | T3 | "add to TKB", "update technology", "validate schema", "technology review" |
| [i18n-specialist](i18n-specialist/SKILL.md) | Internationalization Expert — next-intl, react-i18next, locale routing, RTL support | T3 | Multilingual apps, translations, locale routing, pluralization, RTL layouts |

---

## Tier Distribution

| Tier | Effort | Skills |
|------|--------|--------|
| **T1** (High) | Architecture, Security, Planning | system-architect, contract-architect, security-architect |
| **T2** (Standard) | Implementation, Integration | data-architect, design-architect, experience-engineer, platform-engineer |
| **T3** (Low) | Components, Tests, Content | interface-artisan, quality-engineer, knowledge-architect, i18n-specialist |

---

## Workflow Mapping

| Workflow | Skills Involved |
|----------|----------------|
| orchestrator | system-architect, knowledge-architect, quality-engineer |
| full-stack-feature | All 10 skills (excludes i18n-specialist unless multilingual) |
| analyze | security-architect, quality-engineer, contract-architect, data-architect, platform-engineer, system-architect, experience-engineer |
| docs | knowledge-architect, contract-architect, system-architect |
