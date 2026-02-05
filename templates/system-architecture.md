# System Architecture — Design, C4 Diagrams, and Architecture Decision Records

> Design systems that communicate intent at every zoom level, from bird's eye to code.

**Effort Tier**: 1 (HIGH_EFFORT)
**AIDD Skill**: `skills/system-architect/SKILL.md` (System Design & ADR)

---

## Purpose

Produce a layered architectural design using the C4 model (Context, Container, Component, Code) alongside Architecture Decision Records (ADRs) for every significant choice. The output is a navigable set of diagrams and documents that explain the system at four levels of abstraction, with traceable reasoning for each structural decision.

---

## Preconditions

- [ ] System requirements gathered (functional and non-functional)
- [ ] Constraints identified (technology mandates, budget, team size, timeline)
- [ ] Non-functional requirements quantified (latency targets, throughput, availability SLA)
- [ ] External systems and integrations inventoried
- [ ] Stakeholder concerns documented (security, compliance, operational)

---

## Sub-Agent Roles

| Role | Responsibility |
|------|---------------|
| **System Architect** | Designs the C4 model across all four levels. Selects communication patterns, defines boundaries, and ensures structural coherence. Documents ADRs with full context and consequences. |
| **Domain Expert** | Validates that architectural boundaries align with domain boundaries. Ensures bounded contexts are correctly identified. Reviews that the design supports domain invariants and business rules. |

---

## Process Steps

### Step 1: Context (C4 Level 1)

Define the system boundary and everything outside it:
- **System**: What is being built, its core purpose in one sentence
- **External Actors**: Users (by role), administrators, automated agents
- **External Systems**: APIs, databases, identity providers, third-party services
- **Interactions**: What data flows between the system and each external entity
- **Trust Boundaries**: Where authentication/authorization boundaries exist

Output: A context diagram showing the system as a single box with all external actors and systems connected to it.

### Step 2: Container (C4 Level 2)

Decompose the system into major deployable units:
- **Containers**: Web application, API server, database, message queue, cache, file storage
- **Technology Choices**: Runtime, framework, language for each container (with ADR justification)
- **Communication Patterns**: How containers talk to each other
  - Synchronous: REST, GraphQL (client to server), gRPC (service to service)
  - Asynchronous: Domain events, message queues (RabbitMQ, Redis Streams, Kafka)
  - Hybrid: CQRS for complex domains with separate read/write models
- **Data Ownership**: Which container owns which data
- **Deployment Units**: What gets deployed together vs. independently

Output: A container diagram showing all deployable units, their technologies, and communication paths.

### Step 3: Component (C4 Level 3)

For each container, define internal structure:
- **Modules/Components**: Major internal building blocks
- **Interfaces**: Public contracts between components (ports, APIs, event schemas)
- **Dependencies**: Which components depend on which (dependency direction matters)
- **Patterns**: Architecture patterns in use (hexagonal, layered, CQRS, event sourcing)
- **Cross-Cutting Concerns**: Logging, authentication, error handling, observability

Output: A component diagram per container showing internal modules and their relationships.

### Step 4: Code (C4 Level 4)

Only for complex or critical areas, provide code-level design:
- **Classes/Functions**: Key abstractions and their responsibilities
- **Design Patterns**: Specific patterns applied (factory, strategy, observer, etc.)
- **Data Structures**: Core data models and their relationships
- **Algorithms**: Non-trivial logic that needs explicit design

Output: Class diagrams or detailed pseudocode for critical paths only. Do not over-design at this level.

### Step 5: Architecture Decision Records

For each significant decision made during Steps 1-4, write an ADR:

```
### ADR-NNN: [Short Descriptive Title]

**Status**: proposed | accepted | deprecated | superseded

**Context**:
What forces are at play. Why this decision is needed now. What constraints
exist. What alternatives were considered.

**Decision**:
What was decided and why this option was chosen over alternatives.
Be specific about the trade-offs accepted.

**Consequences**:
- Positive: benefits gained
- Negative: costs and risks accepted
- Neutral: things that change but are neither good nor bad
```

### Step 6: Scalability and Failure Analysis

- **Bottleneck Identification**: Database, network, compute -- where will the system strain first?
- **Scaling Strategy**: Horizontal vs. vertical for each container
- **Caching Layers**: HTTP (CDN), application (Redis/in-memory), database (query cache)
- **Failure Mode Analysis**: For each container, document what happens when it fails
  - What degrades gracefully?
  - What causes cascading failure?
  - What is the recovery path?
- **Resilience Patterns**: Circuit breakers, retries with backoff, bulkheads, timeouts

---

## Quality Gates

- [ ] C4 Levels 1-3 fully documented (Level 4 for critical areas only)
- [ ] ADR written for every significant technology or structural decision
- [ ] Communication patterns defined for all container interactions
- [ ] Data ownership is clear (no shared databases between bounded contexts)
- [ ] Failure modes identified for each container with recovery paths
- [ ] Scalability strategy defined with identified bottlenecks
- [ ] Non-functional requirements are traceable to architectural choices
- [ ] Dependency direction is correct (inward, never outward from domain)

---

## Anti-Patterns

| Anti-Pattern | Description | Mitigation |
|-------------|-------------|------------|
| **Big Upfront Design** | Designing the entire system in detail before building anything | Design enough for current needs plus known growth vectors. Defer decisions that can be deferred. |
| **Accidental Complexity** | Adding layers, abstractions, or indirections that serve no current requirement | Every architectural element must justify its existence with a concrete problem it solves. |
| **Distributed Monolith** | Microservices that must be deployed together and share databases | Enforce independent deployability. If two services always change together, merge them. |
| **Shared Database** | Multiple services reading/writing the same tables | Each service owns its data. Use events or APIs for cross-service data access. |
| **Resume-Driven Architecture** | Choosing technology for learning rather than fitness for purpose | ADRs must document why a technology was chosen based on requirements, not novelty. |
| **Missing Failure Analysis** | Assuming all components will always be available | Explicitly document what happens when each component fails and design for it. |

---

## Cross-References

- **System Architect skill**: `skills/system-architect/SKILL.md`
- **Audit workflow**: `workflows/audit.md`
- **Technology selection workflow**: `workflows/technology-selection.md`
- **DDD knowledge**: `knowledge/patterns/domain-driven-design.md`
- **CQRS knowledge**: `knowledge/patterns/cqrs.md`
- **Event-driven architecture**: `knowledge/patterns/event-driven-architecture.md`
- **Microservices knowledge**: `knowledge/backend/architecture/microservices.md`
- **Modular monolith knowledge**: `knowledge/backend/architecture/modular-monolith.md`
- **Global rules**: `rules/global.md`
