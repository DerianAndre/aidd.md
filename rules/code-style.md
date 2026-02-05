# Code Style: Naming Conventions & TypeScript Standards

> **Activation:** All TypeScript/JavaScript projects. These rules are non-negotiable for code consistency.

---

## File Naming

- All source files MUST use **kebab-case**: `flow-store.ts`, `chat-engine.ts`, `execution-context.ts`
- Test files MUST use `*.test.ts` and reside in `__tests__/` directories adjacent to the source
- Index files (`index.ts`) MUST only re-export — never contain logic
- One concern per file. If a file has two unrelated exports, split it

---

## Directory Structure

- All directories MUST use **kebab-case**: `value-objects/`, `domain-services/`, `chat-store/`
- Group by feature or layer, never by file type (no `interfaces/`, `types/`, `utils/` catch-alls at root)
- Collocate tests: `__tests__/` adjacent to the module under test
- Config directories: `config/` for per-entity configuration panels, `adapters/` for port implementations

---

## Import Patterns

- MUST use ES modules (`import`/`export`). **NEVER** use `require()` or `module.exports`
- MUST use destructured imports: `import { FlowExecutor } from '@aiflow/core'`
- MUST NOT use wildcard imports (`import * as`) unless re-exporting from an index file
- MUST order imports: external packages first, then internal aliases (`@/*`), then relative paths
- MUST NOT use circular imports. If detected, extract shared types to a separate file

---

## Naming Convention Table

| Entity              | Convention                        | Example                                    |
| ------------------- | --------------------------------- | ------------------------------------------ |
| Files               | kebab-case                        | `flow-store.ts`, `execution-engine.ts`     |
| Types / Interfaces  | PascalCase                        | `FlowNode`, `ExecutionStateUpdater`        |
| Classes             | PascalCase                        | `FlowAggregate`, `ConnectionValidator`     |
| Functions / Methods | camelCase (verb phrases)          | `executeFlow`, `addNode`, `fetchUserProfile` |
| Constants           | UPPER_SNAKE_CASE                  | `MAX_RETRIES`, `API_BASE_URL`              |
| React Components    | PascalCase                        | `ChatSidebar`, `AgentNode`, `FlowCanvas`   |
| Zustand Stores      | kebab-case file, `use*Store` hook | `chat-store.ts` -> `useChatStore`           |
| Directories         | kebab-case                        | `value-objects/`, `domain-services/`       |
| Test files          | `*.test.ts` in `__tests__/`      | `FlowExecutor.test.ts`                     |
| CSS classes         | kebab-case                        | `flow-canvas`, `node-shell`                |

### Supplementary Naming Rules

- **Booleans** MUST use predicates: `isActive`, `hasPermission`, `canEdit`
- **Variables** MUST use noun phrases: `userEmail`, `totalRevenue`, `activeNodes`
- **Event handlers** MUST use `handle*` prefix: `handleClick`, `handleNodeDrop`
- **Factory methods** MUST use descriptive verbs: `create`, `from`, `of` (e.g., `Position.create()`)

---

## TypeScript Standards

- **Strict mode** MUST be enabled (`strict: true` in `tsconfig.json`). No exceptions.
- **NEVER** use `any` without a documented exception (inline comment explaining why)
- **MUST** use discriminated unions for variant types:

```typescript
// CORRECT: Discriminated union
type FlowNode = TriggerNode | AgentNode | TaskNode | ConditionNode;

// WRONG: Loose union or 'any'
type FlowNode = Record<string, any>;
```

- **MUST** use `readonly` for properties that should not be reassigned after construction
- **MUST** use `satisfies` operator for type-safe object literals when inference is needed
- **MUST NOT** use `enum` — use `as const` objects or union types instead
- **MUST NOT** use non-null assertions (`!`) without a documented justification

---

## Immutability

- Aggregate operations MUST return new instances, never mutate in place
- MUST use factory methods: `Thing.create()`, not `new Thing()` (constructors are private/protected)
- Collections MUST use immutable operations: `map`, `filter`, `reduce` — never `push`, `splice`, `sort` in place
- State updates (Zustand) MUST use the `set` callback, never direct mutation

---

## Validation

- Zod schemas MUST be defined at serialization boundaries: API, storage, import/export
- Domain logic MUST NOT depend on Zod — use typed interfaces internally
- Every schema MUST have a corresponding TypeScript type inferred via `z.infer<typeof Schema>`
- Validation errors MUST be surfaced to the user, never silently swallowed

---

## Anti-Patterns (MUST NOT)

- **Magic strings/numbers**: Extract to named constants (`const MAX_RETRIES = 3`)
- **Premature abstractions**: Three similar lines are better than one clever abstraction
- **Commented-out code**: Delete it. Git has history.
- **Dead code**: Remove unused functions, imports, types. No dead exports.
- **Barrel files with logic**: Index files re-export only
- **God files**: If a file exceeds ~300 lines, it likely has multiple concerns — split it
- **Implicit dependencies**: Every dependency MUST be explicit in function signatures or constructors

---

**Cross-references:** [rules/global.md](global.md) (immutability constraints, naming conventions), [rules/backend.md](backend.md) (TypeScript patterns, error handling), [rules/frontend.md](frontend.md) (component patterns, accessibility)

**Version:** 1.0.0
**Last Updated:** 2026-02-04
**Applies To:** All TypeScript/JavaScript projects
