---
name: Modular Monolith
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# Modular Monolith

## Overview

Single-deployment application with clear internal module boundaries. Combines monolith simplicity with microservices modularity. Recommended starting point for most projects.

## Key Metrics

- **Complexity:** Low (single deployment, no distributed systems)
- **Scalability:** Vertical scaling (scale entire app, not individual modules)
- **Team Size:** Optimal for 5-20 engineers
- **DX:** Simpler debugging (single process, local development easy)
- **Maturity:** Modern interpretation of monolith (Shopify, GitHub use)

## Use Cases

| Scenario                          | Fit Score (1-10) | Rationale                                             |
| --------------------------------- | ---------------- | ----------------------------------------------------- |
| Startups (MVP to Series A)        | 10               | Maximum velocity, defer complexity                    |
| Well-defined domains (e-commerce) | 9                | Modules map to domains (catalog, checkout, shipping)  |
| Teams <20 engineers               | 10               | No coordination overhead of microservices             |
| Uncertain domain boundaries       | 10               | Easy to refactor modules vs splitting services        |
| Global scaling (YouTube-level)    | 4                | Eventually need microservices for independent scaling |

## Trade-offs

### Strengths

- **Simplicity:** Single deployment, local development straightforward
- **Performance:** No network overhead (in-process calls)
- **Transactions:** ACID across modules (vs eventual consistency)
- **Refactoring:** Easy to move code between modules

### Weaknesses

- **Scaling:** Must scale entire app (can't scale checkout independently)
- **Deployment:** Deploy everything together (coordination overhead)
- **Language Lock-in:** Entire app in one language (vs polyglot microservices)
- **Fault Isolation:** Bug in payments module can crash entire app

## Implementation Pattern (Next.js Example)

```
src/modules/
├── catalog/
│   ├── domain/       # Business logic
│   ├── application/  # Use cases (Server Actions)
│   ├── infrastructure/ # DB, external APIs
│   └── ui/           # React components
├── checkout/
└── shipping/
```

**Enforcement:**

- Module dependency rules (catalog can't import checkout)
- Linting rules prevent circular dependencies
- Shared kernel for cross-cutting (auth, logging)

## Migration Path

**Phase 1:** Modular Monolith (0-50k users)  
**Phase 2:** Extract high-load modules (e.g., video transcoding) to services  
**Phase 3:** Full microservices (if team >50 engineers)

## Alternatives

| Alternative              | When to Choose Instead                                 |
| ------------------------ | ------------------------------------------------------ |
| **Microservices**        | Team >20, independent scaling critical, polyglot needs |
| **Serverless**           | Event-driven, stateless, unpredictable traffic         |
| **Traditional Monolith** | Prototype only (no modularity needed)                  |

## References

- [Modular Monolith Architecture](https://www.milanjovanovic.tech/blog/what-is-a-modular-monolith)
- [Shopify's Modular Monolith](https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity)
- [Clean Architecture in Next.js](https://dev.to/behnamrhp/how-we-fixed-nextjs-at-scale-di-clean-architecture-secrets-from-production-gnj)
