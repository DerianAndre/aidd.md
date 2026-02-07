---
name: CQRS (Command Query Responsibility Segregation)
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# CQRS (Command Query Responsibility Segregation)

## Overview

Architectural pattern separating read and write operations into distinct models. Commands modify state, Queries read state. Enables independent scaling and optimization of reads vs writes.

## Key Metrics

- **Scalability:** Independent scaling of read/write databases (10x more reads than writes = scale reads independently)
- **Complexity:** High (dual models, eventual consistency)
- **Performance:** Optimized query models (denormalized for fast reads)
- **DX:** Clear separation (commands vs queries), testability
- **Maturity:** 15+ years (Greg Young, Udi Dahan), proven at enterprise scale

## Use Cases

| Scenario                                   | Fit Score (1-10) | Rationale                                                     |
| ------------------------------------------ | ---------------- | ------------------------------------------------------------- |
| Read-heavy systems (10:1 read/write ratio) | 10               | Scale read DB independently (e.g., reporting dashboards)      |
| Complex business logic                     | 9                | Commands encapsulate domain rules, queries simple projections |
| Event-sourced systems                      | 10               | Natural fit (commands = events, queries = projections)        |
| Simple CRUD apps                           | 2                | Over-engineering, use standard MVC                            |
| Real-time collaboration                    | 8                | Commands update state, queries poll projections               |

## Trade-offs

### Strengths

- **Independent Scaling:** 10x reads? Scale read DB 10x, write DB 1x
- **Optimized Queries:** Denormalized read models (no joins, fast queries)
- **Clear Responsibilities:** Commands = business logic, Queries = simple reads
- **Eventual Consistency:** Acceptable for most reads (stale data by design)

### Weaknesses

- **Complexity:** Dual models (write DB + read DB), synchronization overhead
- **Eventual Consistency:** Read model lags behind write model (seconds)
- **Data Duplication:** Same data stored in write DB and read DB
- **Learning Curve:** Paradigm shift from traditional CRUD

## Implementation Pattern (Next.js + Event Sourcing)

```typescript
// Command (write model)
// domain/commands/CreateOrderCommand.ts
export class CreateOrderCommand {
  constructor(
    public readonly userId: string,
    public readonly items: OrderItem[]
  ) {}
}

// Command Handler
export class CreateOrderHandler {
  async execute(command: CreateOrderCommand) {
    // 1. Validate business rules
    if (command.items.length === 0) throw new Error("Empty order");

    // 2. Create domain event
    const event = new OrderCreatedEvent(command.userId, command.items);

    // 3. Persist to event store (write DB)
    await eventStore.append(event);

    // 4. Publish event (update read model asynchronously)
    await eventBus.publish(event);
  }
}

// Query (read model)
// queries/GetOrderByIdQuery.ts
export class GetOrderByIdQuery {
  constructor(public readonly orderId: string) {}
}

// Query Handler
export class GetOrderByIdHandler {
  async execute(query: GetOrderByIdQuery) {
    // Read from denormalized read DB (fast, no joins)
    return readDb.orders.findOne({ id: query.orderId });
  }
}

// Event Handler (updates read model)
eventBus.on(OrderCreatedEvent, async (event) => {
  // Denormalize data for fast queries
  await readDb.orders.insert({
    id: event.orderId,
    userId: event.userId,
    items: event.items,
    total: event.items.reduce((sum, i) => sum + i.price, 0),
    status: "pending",
  });
});
```

## Architecture Diagram

```
User → Command → Write DB (Postgres - normalized)
                   ↓ Event
                   ↓
                Read DB (MongoDB - denormalized)
                   ↑
User → Query ←─────┘
```

## CQRS + Event Sourcing

| Pattern            | Responsibility                              |
| ------------------ | ------------------------------------------- |
| **CQRS**           | Separate read/write models                  |
| **Event Sourcing** | Store events (not current state)            |
| **Combined**       | Commands produce events → update read model |

**Example:**

```
Command: CreateOrder
→ Event: OrderCreated {userId, items, total}
→ Write DB: Append event to event log
→ Read DB: Update denormalized order projection
```

## When CQRS > Traditional CRUD

| Scenario                | Why CQRS Wins                                              |
| ----------------------- | ---------------------------------------------------------- |
| **Analytics Dashboard** | Read model pre-calculates aggregations (vs live queries)   |
| **Audit Trail**         | Event sourcing + CQRS = full history                       |
| **Read Scaling**        | 1000 users querying vs 10 users writing = scale reads only |

## Alternatives

| Alternative            | When to Choose Instead                                  |
| ---------------------- | ------------------------------------------------------- |
| **Traditional CRUD**   | Simple apps, 1:1 read/write ratio, no complex reporting |
| **Repository Pattern** | Need abstraction without dual models                    |
| **GraphQL**            | Flexible querying without full CQRS complexity          |

## References

- [CQRS Pattern (Martin Fowler)](https://martinfowler.com/bliki/CQRS.html)
- [CQRS with Event Sourcing](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Implementing CQRS in Next.js](https://dev.to/saswatapal/implementing-cqrs-in-nextjs-achieving-clean-architecture-with-server-actions-11ip)
