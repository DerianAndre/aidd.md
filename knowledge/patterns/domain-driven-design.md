---
name: Domain-Driven Design (DDD)
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# Domain-Driven Design (DDD)

## Overview

Software design philosophy organizing code around business domains rather than technical layers. Emphasizes ubiquitous language, bounded contexts, and separation of domain logic from infrastructure.

## Key Metrics

- **Scalability:** High (enables independent domain evolution)
- **Complexity:** Higher upfront cost, long-term maintainability benefit
- **Team Size:** Optimal for 5+ engineers (communication overhead justified)
- **DX:** Requires domain expertise, steep learning curve
- **Maturity:** 20+ years (Eric Evans, 2003), battle-tested at enterprise scale

## Use Cases

| Scenario                                     | Fit Score (1-10) | Rationale                                      |
| -------------------------------------------- | ---------------- | ---------------------------------------------- |
| Complex business logic (fintech, healthcare) | 10               | Domain entities map to real-world concepts     |
| Microservices architecture                   | 9                | Bounded contexts = service boundaries          |
| Long-lived projects (5+ years)               | 9                | Maintainability benefit compounds over time    |
| Simple CRUD apps                             | 3                | Over-engineering, unnecessary abstraction      |
| Startups (MVP phase)                         | 4                | Premature optimization, slows initial velocity |

## Trade-offs

### Strengths

- **Maintainability:** Clear domain boundaries, easier to reason about
- **Scalability:** Domains evolve independently (bounded contexts)
- **Team Communication:** Ubiquitous language aligns devs with business
- **Testability:** Pure domain logic easily unit-tested

### Weaknesses

- **Upfront Cost:** Requires domain modeling, slower initial development
- **Complexity:** Abstractions (Repositories, Aggregates, Value Objects)
- **Overkill:** Simple apps don't benefit from DDD overhead
- **Learning Curve:** Team must understand domain modeling

## Implementation Patterns (Next.js Example)

### Module Structure

```
src/modules/
├── invoicing/
│   ├── domain/
│   │   ├── entities/         # Invoice, LineItem (pure business logic)
│   │   ├── value-objects/    # Money, InvoiceNumber
│   │   └── interfaces/       # IInvoiceRepository
│   ├── application/
│   │   ├── actions.ts        # Server Actions (use cases)
│   │   └── queries.ts        # Data fetching logic
│   ├── infrastructure/
│   │   ├── repositories/     # InvoiceRepository (Drizzle ORM)
│   │   └── api-client.ts
│   └── ui/
│       └── components/       # Invoice-specific UI
```

### Key Concepts

| Concept             | Purpose                 | Example                             |
| ------------------- | ----------------------- | ----------------------------------- |
| **Entity**          | Object with identity    | `Invoice` (has unique ID)           |
| **Value Object**    | Immutable value         | `Money(100, 'USD')`                 |
| **Aggregate**       | Consistency boundary    | `Order` + `OrderLines`              |
| **Repository**      | Data access abstraction | `IInvoiceRepository`                |
| **Bounded Context** | Domain boundary         | `Invoicing`, `Payments`, `Shipping` |

## Alternatives

| Alternative                           | When to Choose Instead                            |
| ------------------------------------- | ------------------------------------------------- |
| **Transaction Script**                | Simple CRUD, straightforward business logic       |
| **Layered Architecture**              | Standard 3-tier app, don't need domain complexity |
| **Functional Core, Imperative Shell** | Want purity without DDD ceremony                  |

## References

- [Domain-Driven Design (Eric Evans Book)](https://www.domainlanguage.com/ddd/)
- [DDD with React (Next.js)](https://blog.bitsrc.io/domain-driven-design-with-react-building-scalable-and-maintainable-applications-8aa854f18a69)
- [Clean Architecture in Next.js](https://dev.to/behnamrhp/how-we-fixed-nextjs-at-scale-di-clean-architecture-secrets-from-production-gnj)
