# Rules — Routing Index

> Quick reference for domain-specific rules. Rules are loaded by agents based on task context and project detection.

---

## Decision Table

| File | Purpose | Applied When |
|------|---------|--------------|
| [global.md](global.md) | Core philosophy: evidence-first engineering, first principles, second-order effects, anti-bias protocol | Always — applies to ALL agents in ALL contexts without exception |
| [orchestrator.md](orchestrator.md) | Master system architect protocol: zero trust diagnostic, contextual audit, strategic mapping | Task classification, context loading, agent dispatch, and pipeline coordination |
| [code-style.md](code-style.md) | Naming conventions and TypeScript standards: kebab-case files, import patterns, type annotations | All TypeScript/JavaScript projects — non-negotiable for code consistency |
| [frontend.md](frontend.md) | WCAG 2.1 AA accessibility, semantic HTML, ARIA, React patterns, Tailwind best practices | Projects containing React, Vue, Angular, Tailwind, or frontend patterns |
| [backend.md](backend.md) | Hexagonal architecture (ports and adapters), layer separation, domain purity | Projects containing NestJS, Express, Fastify, Prisma, SQL, or backend patterns |
| [testing.md](testing.md) | Test strategy by cyclomatic complexity, AAA pattern, isolation, coverage philosophy | Writing tests, reviewing code, or analyzing coverage |
| [security.md](security.md) | OWASP Top 10 (2025) compliance: access control, injection, secrets, crypto | All code reviews, deployment workflows, and security audits |
| [documentation.md](documentation.md) | Normalized document pattern, folder structure, header format, status labels | All projects — governs how documentation is structured, named, and maintained |
| [git-workflow.md](git-workflow.md) | Conventional Commits format, branch strategy, commit hygiene | All projects using Git version control |
| [interfaces.md](interfaces.md) | Inter-agent contract matrix: zero fidelity loss between specialized agents | Multi-agent handoffs — ensures machine-readable outputs between pipeline nodes |
| [performance.md](performance.md) | Evidence-based profiling and optimization: measure first, optimize second | Investigating performance issues, establishing performance budgets |



> Loading priority and dispatch logic are defined in [`content/routing.md`](../routing.md) Section 2.
