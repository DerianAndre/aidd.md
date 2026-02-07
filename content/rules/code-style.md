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

---

## Template: Refactoring

> Absorbed from `templates/refactoring.md`

### Core Principle

Every step independently verifiable. Green before, green after, or revert immediately. Refactoring changes structure without changing behavior.

### Preconditions

- [ ] Green test baseline confirmed (all tests pass before starting)
- [ ] Clear refactoring goal defined (what structural improvement and why)
- [ ] Scope bounded (which files/modules are affected)
- [ ] No unrelated changes in the working tree (clean git state preferred)
- [ ] Understanding of existing test coverage for affected code

### Atomic Transformation Sequence

Design a sequence where:

- Each step is a single, focused transformation
- Each step is independently deployable (the codebase works after each step)
- Steps are ordered to minimize risk (safest first)
- No step combines multiple unrelated changes

### Common Atomic Transformations

- Extract function/method
- Rename symbol
- Move to separate file
- Replace conditional with polymorphism
- Introduce interface/abstraction
- Inline unnecessary abstraction
- Consolidate duplicated logic

### Execution Protocol

For each transformation in the sequence:

1. **Make the change** -- One focused structural modification
2. **Run tests immediately** -- Execute targeted tests for the affected code
3. **Run type checking** -- Verify types if types are affected
4. **Evaluate result**:
   - All green: Proceed to next transformation
   - Any red: **Revert immediately**, analyze why, plan alternative approach

### Failure Handling

If a transformation breaks tests:

1. **Revert** the change immediately (do not attempt to "fix forward")
2. **Analyze** why the test broke (behavior change? missing dependency? wrong assumption?)
3. **Decompose** the transformation into smaller steps, or choose a different approach
4. **Retry** with the revised plan

### Refactoring Anti-Patterns

| Anti-Pattern | Mitigation |
|-------------|------------|
| **Refactoring Without Tests** | Verify green baseline; if coverage is insufficient, write tests first |
| **Big-Bang Refactoring** | Enforce atomic steps; one transformation, one test run |
| **Fix Forward** | Always revert on red; analyze and retry with a different approach |
| **Feature Mixing** | Refactoring changes structure, not behavior; keep feature work separate |
| **API Breaking** | If public APIs must change, provide a deprecation/migration plan first |
| **Invisible Rationale** | Every transformation must have a documented reason |
| **Coverage Assumption** | Verify coverage for affected code before starting; add tests if gaps exist |

### Refactoring Quality Gates

- [ ] Green baseline verified before first change
- [ ] Tests run after every single transformation (not batched)
- [ ] No test failures were "fixed forward" (all failures triggered revert)
- [ ] No behavior changes introduced (unless explicitly intended and documented)
- [ ] No new dependencies added without justification
- [ ] Type checking passes after all transformations
- [ ] Final diff reviewed for accidental changes
- [ ] Refactoring goal demonstrably achieved

**Version:** 1.0.0
**Last Updated:** 2026-02-04
**Applies To:** All TypeScript/JavaScript projects
