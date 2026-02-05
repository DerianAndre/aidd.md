---
name: Traditional Monolith
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# Traditional Monolith

## Overview

Single-deployment application without internal modular boundaries. All code coexists in one codebase with shared database, no architectural enforcement. Comparison baseline for Modular Monolith and Microservices.

## Key Metrics

- **Complexity:** Lowest (single deployment, shared DB)
- **Scalability:** Vertical only (scale entire app, not components)
- **Team Size:** Best for 1-5 engineers
- **DX:** Simple debugging (single process), local development easy
- **Maturity:** Oldest pattern (decades-old approach)

## Use Cases

| Scenario                   | Fit Score (1-10) | Rationale                                                    |
| -------------------------- | ---------------- | ------------------------------------------------------------ |
| Rapid prototyping / MVPs   | 10               | Zero architectural overhead, maximum velocity                |
| Small teams (<5 engineers) | 9                | No coordination overhead, everyone knows full codebase       |
| Simple CRUD apps           | 10               | Overkill to add modules/microservices                        |
| Growing to 10+ engineers   | 4                | Codebase becomes "big ball of mud" without boundaries        |
| High scalability needs     | 3                | Must scale entire app (can't scale components independently) |

## Trade-offs

### Strengths

- **Simplicity:** No architectural boundaries to maintain
- **Fast Development:** No inter-module contracts, change anything directly
- **Single Deployment:** Deploy everything together (no coordination)
- **Shared Database:** Direct access to all tables (no API calls)

### Weaknesses

- **Scaling:** Must scale entire app (even if only checkout is slow)
- **Codebase Tangling:** Without discipline, becomes "big ball of mud"
- **Team Bottlenecks:** Single deployment = coordination required for releases
- **Technology Lock-in:** Entire app in one language/framework

## Implementation Pattern (Next.js Traditional Monolith)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── orders/page.tsx
│   │   └── products/page.tsx
│   └── api/
│       ├── auth/route.ts
│       ├── orders/route.ts
│       └── products/route.ts
├── lib/
│   ├── db.ts              # Shared DB access
│   ├── auth.ts            # Auth logic
│   └── utils.ts           # Utilities
└── components/
    ├── Header.tsx
    └── Footer.tsx
```

**Characteristics:**

- No module boundaries (any file can import any other file)
- Shared `lib/` directory for all logic
- Single database schema (all tables accessible everywhere)

## Evolution Path

```
Traditional Monolith (startup, 1-5 engineers)
         ↓
Modular Monolith (growing, 5-20 engineers, add internal boundaries)
         ↓
Microservices (scale, 20+ engineers, need independent deployment)
```

## Traditional Monolith vs Modular Monolith

| Aspect                | Traditional             | Modular Monolith                           |
| --------------------- | ----------------------- | ------------------------------------------ |
| **Module Boundaries** | None                    | Enforced (linting, architecture)           |
| **Imports**           | Any file → any file     | Restricted (catalog can't import checkout) |
| **Deployment**        | Single ✅               | Single ✅                                  |
| **Refactoring**       | Easy (no boundaries) ✅ | Harder (respect module boundaries)         |
| **Scalability**       | Vertical only           | Vertical only                              |

## When Traditional Monolith Wins

| Scenario           | Why Traditional Wins                           |
| ------------------ | ---------------------------------------------- |
| **Prototype**      | No time for architecture (ship fast)           |
| **Solo developer** | No team coordination needed                    |
| **Simple CRUD**    | Users, posts, comments = no complex boundaries |

## When to Evolve

**Red Flags (Time to Add Boundaries):**

- 📈 Team grows beyond 5 engineers (coordination overhead)
- 🔥 Merge conflicts frequent (everyone touching same code)
- 🐛 Bug in checkout breaks entire app (no fault isolation)
- 🚀 Need to scale checkout independently (but can't)

**Next Step:** Introduce module boundaries (Modular Monolith) without splitting to microservices.

## Alternatives

| Alternative              | When to Choose Instead                                    |
| ------------------------ | --------------------------------------------------------- |
| **Modular Monolith**     | Team >5 engineers, need boundaries but single deployment  |
| **Microservices**        | Team >20, need independent scaling, polyglot requirements |
| **Serverless Functions** | Event-driven, stateless workloads                         |

## References

- [Monolith vs Microservices](https://martinfowler.com/articles/break-monolith-into-microservices.html)
- [Modular Monolith Architecture](https://www.milanjovanovic.tech/blog/what-is-a-modular-monolith)
- [Shopify's Monolith Architecture](https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity)
