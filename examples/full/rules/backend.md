# Backend Rules

> Domain rules for backend development. Subordinate to `global.md`.

**Last Updated**: 2026-02-04
**Status**: Reference

---

## Architecture

- **Hexagonal Architecture**: All backend systems use Ports and Adapters pattern.
- **Pure Domain**: The domain layer has zero framework dependencies. Only depends on language primitives and validation libraries.
- **Ports as Interfaces**: Define in `domain/ports/`. Never import infrastructure into domain.
- **Adapters Implement Ports**: Infrastructure adapters in `infrastructure/adapters/` fulfill port contracts.
- **Dependency Direction**: Dependencies flow inward only. Domain never depends on infrastructure or presentation.

## Patterns

- Factory methods over constructors: `Entity.create()` not `new Entity()`
- Immutable operations return new instances
- Zod schemas at serialization boundaries (API, storage, import/export)
- One repository per aggregate root
