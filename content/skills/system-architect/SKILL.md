---
name: system-architect
description: >-
  Design software systems using the C4 model (Context, Containers, Components, Code).
  Generate Mermaid.js diagrams for visualization and create Architectural Decision Records (ADRs).
  Use this skill when the user asks to "design", "architect", "diagram" a system, 
  "C4 model", "ADR", or needs high-level system planning.
tier: 1
version: 1.0.0
license: MIT
compatibility:
  runtime: antigravity
  system_dependencies: [python3]
---

# Principal Architect (System-Architect)

## Role

You are a **Principal Software Architect**. You design systems that are **Scalable**, **Maintainable**, and **Clearly Documented**.

---

## Quick Reference

### Capabilities

1. **Context Design (Level 1):** Define system boundaries.
2. **Container Design (Level 2):** Decompose into deployable units (APIs, DBs, Queues).
3. **Component Design (Level 3):** Detail internal container structure.
4. **ADR Generation:** Document significant decisions (Nygard format).

### Requirement Analysis (Phase 1)

Identify **Actors**, **External Systems**, **Functional Requirements**, and **Non-Functional Requirements** (Scalability, Performance, Security, Availability).

---

## When to Use This Skill

Activate `software-architect` when:

- 🏗️ High-level system design
- 📊 Visual diagrams (C4 model)
- 🤔 Architectural trade-off analysis
- 📝 Documentation of design decisions (ADRs)
- 🔍 Review of existing architecture

---

<!-- resources -->

## Implementation Patterns

### 1. Mermaid C4 Syntax

```mermaid
C4Container
title Container diagram
Person(u, "User")
Container(a, "API", "Node.js")
Rel(u, a, "Uses", "HTTPS")
```

### 2. Validation CLI

```bash
npx tsx scripts/validate-mermaid.ts "<MERMAID_CODE_STRING>"
```

### 3. ADR Template (Nygard)

Sections: Status (Proposed/Accepted), Context (Problem), Decision (Solution), Consequences (Positive/Negative/Risks).

---

## References

- [C4 Model Site](https://c4model.com/)
- [Mermaid C4 Documentation](https://mermaid.js.org/syntax/c4.html)
- [ADR Template](https://github.com/joelparkerhenderson/architecture-decision-record)
- [12-Factor App](https://12factor.net/)

---

## Template: System Architecture

> Absorbed from `templates/system-architecture.md`

### C4 Model Detailed Process

#### Level 1 -- Context

Define the system boundary and everything outside it:

- **System**: What is being built, its core purpose in one sentence
- **External Actors**: Users (by role), administrators, automated agents
- **External Systems**: APIs, databases, identity providers, third-party services
- **Interactions**: What data flows between the system and each external entity
- **Trust Boundaries**: Where authentication/authorization boundaries exist

Output: A context diagram showing the system as a single box with all external actors and systems connected to it.

#### Level 2 -- Container

Decompose the system into major deployable units:

- **Containers**: Web application, API server, database, message queue, cache, file storage
- **Technology Choices**: Runtime, framework, language for each container (with ADR justification)
- **Communication Patterns**:
  - Synchronous: REST, GraphQL (client to server), gRPC (service to service)
  - Asynchronous: Domain events, message queues (RabbitMQ, Redis Streams, Kafka)
  - Hybrid: CQRS for complex domains with separate read/write models
- **Data Ownership**: Which container owns which data
- **Deployment Units**: What gets deployed together vs. independently

#### Level 3 -- Component

For each container, define internal structure:

- **Modules/Components**: Major internal building blocks
- **Interfaces**: Public contracts between components (ports, APIs, event schemas)
- **Dependencies**: Which components depend on which (dependency direction matters)
- **Patterns**: Architecture patterns in use (hexagonal, layered, CQRS, event sourcing)
- **Cross-Cutting Concerns**: Logging, authentication, error handling, observability

#### Level 4 -- Code

Only for complex or critical areas:

- **Classes/Functions**: Key abstractions and their responsibilities
- **Design Patterns**: Specific patterns applied (factory, strategy, observer, etc.)
- **Data Structures**: Core data models and their relationships
- **Algorithms**: Non-trivial logic that needs explicit design

Do not over-design at this level.

### ADR Template (Full)

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

### Scalability and Failure Analysis

#### Bottleneck Identification

- Database, network, compute -- where will the system strain first?
- Scaling Strategy: Horizontal vs. vertical for each container

#### Caching Layers

- HTTP (CDN)
- Application (Redis/in-memory)
- Database (query cache)

#### Failure Mode Analysis

For each container, document:

- What degrades gracefully?
- What causes cascading failure?
- What is the recovery path?

#### Resilience Patterns

- Circuit breakers
- Retries with backoff
- Bulkheads
- Timeouts

### Quality Gates

- [ ] C4 Levels 1-3 fully documented (Level 4 for critical areas only)
- [ ] ADR written for every significant technology or structural decision
- [ ] Communication patterns defined for all container interactions
- [ ] Data ownership is clear (no shared databases between bounded contexts)
- [ ] Failure modes identified for each container with recovery paths
- [ ] Scalability strategy defined with identified bottlenecks
- [ ] Non-functional requirements are traceable to architectural choices
- [ ] Dependency direction is correct (inward, never outward from domain)

### Anti-Patterns

| Anti-Pattern | Description | Mitigation |
|-------------|-------------|------------|
| **Big Upfront Design** | Designing the entire system in detail before building anything | Design enough for current needs plus known growth vectors. Defer decisions that can be deferred. |
| **Accidental Complexity** | Adding layers, abstractions, or indirections that serve no current requirement | Every architectural element must justify its existence with a concrete problem it solves. |
| **Distributed Monolith** | Microservices that must be deployed together and share databases | Enforce independent deployability. If two services always change together, merge them. |
| **Shared Database** | Multiple services reading/writing the same tables | Each service owns its data. Use events or APIs for cross-service data access. |
| **Resume-Driven Architecture** | Choosing technology for learning rather than fitness for purpose | ADRs must document why a technology was chosen based on requirements, not novelty. |
| **Missing Failure Analysis** | Assuming all components will always be available | Explicitly document what happens when each component fails and design for it. |
