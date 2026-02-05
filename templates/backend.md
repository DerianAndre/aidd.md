# Backend Development — Domain-Driven Service Engineering

> DDD/Hexagonal patterns. Domain → Schemas → Adapters → Wiring.

**Effort Tier**: 2 (STANDARD)
**AIDD Skill**: `skills/system-architect/SKILL.md` + `skills/contract-architect/SKILL.md`

---

## Preconditions

- API requirements or domain model defined
- Project architecture identified (Hexagonal, Clean, MVC)
- Database technology chosen

## Sub-Agent Roles

| Role | Focus |
|------|-------|
| **System Architect** | Domain boundaries, aggregate design, port definitions |
| **Backend Engineer** | Implementation, adapters, wiring, error handling |

## Process

### Step 1 — Domain Model
- Identify entities, value objects, aggregates
- Define aggregate boundaries (consistency boundaries)
- Map domain events (what happened, not what to do)
- Define domain exceptions (business rule violations)

### Step 2 — Ports (Interfaces)
- Define what the domain NEEDS (not how)
- Repository ports: save, findById, findAll, delete
- Service ports: external integrations (LLM, email, payment)
- Event ports: publish, subscribe

### Step 3 — Schemas (Anti-Corruption Layer)
- Zod schemas at EVERY serialization boundary
- API request/response validation
- Storage serialization/deserialization
- Import/export format validation

### Step 4 — Domain Services
- Pure business logic, ZERO framework dependencies
- Only depends on: TypeScript, Zod, domain utilities
- Operations return new instances (immutable)
- Factory methods: `Entity.create()` not `new Entity()`

### Step 5 — Adapters
- Implement port interfaces
- Framework-specific code lives HERE (and only here)
- Repository adapters: database queries, ORM calls
- Client adapters: HTTP calls, SDK usage

### Step 6 — Wiring (Composition Root)
- Connect adapters to ports
- Dependency injection at application entry point
- Configuration loading and validation

### Step 7 — Controllers/Handlers
- Thin layer: validate input → call domain → format output
- Error mapping: domain exceptions → HTTP status codes
- Request validation via Zod schemas

## Architecture Rules

```
Domain (pure)     → ZERO framework dependencies
Ports (interfaces) → Defined in domain/ports/
Adapters (impl)    → Framework-specific, in infrastructure/
Dependencies       → Flow INWARD only
```

### Exception Layers
- `DomainException`: business rule violations
- `ApplicationException`: use case failures
- `InfrastructureException`: technical failures (DB down, API timeout)

## Quality Gates

- [ ] Domain has zero framework imports
- [ ] All ports have adapter implementations
- [ ] Zod schemas at every boundary
- [ ] No SELECT * in production queries
- [ ] No raw SQL without parameterization
- [ ] Error responses follow RFC 7807
- [ ] Dependencies flow inward only

## Anti-Patterns

- Business logic in controllers (controllers should be thin)
- Domain importing from infrastructure
- God services (single service doing everything)
- Anemic domain model (entities with only getters/setters)
- Leaking infrastructure details to domain
- String-based error handling (use typed exceptions)

---

## Cross-References

- **Backend rules**: `rules/backend.md`
- **System Architect skill**: `skills/system-architect/SKILL.md`
- **Contract Architect skill**: `skills/contract-architect/SKILL.md`
- **Security rules**: `rules/security.md`
- **Global rules**: `rules/global.md`
- **DDD knowledge**: `knowledge/patterns/domain-driven-design.md`
