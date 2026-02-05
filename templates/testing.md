# Testing Strategy — Pyramid-Driven Quality Assurance

> Right test, right layer, right confidence.

**Effort Tier**: 3→1 (LOW for simple tests, HIGH for strategy)
**AIDD Skill**: `skills/quality-engineer/SKILL.md`

---

## Preconditions

- Code to test exists or is being TDD'd
- Testing framework configured (Vitest 4 primary)
- Clear acceptance criteria or requirements

## Sub-Agent Roles

| Role | Focus |
|------|-------|
| **Quality Engineer** | Test strategy, coverage targets, test architecture |
| **Domain Expert** | Business rule validation, edge cases, acceptance criteria |

## Test Pyramid

```
         /\
        /E2E\        10% — Critical user flows only
       /------\
      /Integr. \     20% — API/DB contracts, adapter compliance
     /----------\
    /   Unit     \   70% — Fast, isolated, domain logic
   /--------------\
```

## Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Domain | 100% | Business logic is non-negotiable |
| Application | 90% | Schemas, use cases |
| Infrastructure | 80% | Adapters, critical integrations |
| Presentation | 70% | Interaction paths, not visual details |

## Process

### Step 1 — Determine Test Type
- Pure logic, calculations, transformations → Unit
- API endpoints, DB operations, external calls → Integration
- Critical user journeys (login, checkout, etc.) → E2E

### Step 2 — Identify Test Cases
- From acceptance criteria (Given/When/Then)
- Happy path first
- Edge cases: boundaries, nulls, empty, max values
- Error cases: invalid input, failures, timeouts
- Concurrent: race conditions, abort signals

### Step 3 — Write Tests (AAA Pattern)
```typescript
describe('FeatureName', () => {
  it('should [expected behavior] when [condition]', () => {
    // Arrange — setup
    const input = createTestInput();

    // Act — execute
    const result = feature.execute(input);

    // Assert — verify
    expect(result).toEqual(expectedOutput);
  });
});
```

### Step 4 — Mock Strategy
- Mock at PORT boundaries (not deep internals)
- Use `vi.fn()` for spies
- Use `vi.useFakeTimers()` for timing-dependent tests
- Reset ALL state in `beforeEach` (stores, mocks, timers)
- Contract tests: verify adapters satisfy port interfaces

### Step 5 — Run and Verify
- Targeted tests during development (specific file)
- Full suite before commit
- Coverage check against targets

## Patterns

### Contract Tests
Verify adapters implement port contracts correctly:
```typescript
// FlowRepository.contract.ts
export function testFlowRepositoryContract(repo: FlowRepository) {
  it('should save and retrieve flow', async () => { ... });
  it('should delete flow', async () => { ... });
  // ... all port methods
}
```

### Abort Signal Testing
```typescript
it('should abort on signal', async () => {
  const controller = new AbortController();
  const promise = service.execute({ signal: controller.signal });
  controller.abort();
  await expect(promise).rejects.toThrow(ExecutionAbortedException);
});
```

### Store Testing
```typescript
beforeEach(() => {
  useFlowStore.setState(useFlowStore.getInitialState());
});
```

## Quality Gates

- [ ] Coverage targets met per layer
- [ ] All acceptance criteria have corresponding tests
- [ ] No skipped/disabled tests
- [ ] Tests run independently (no order dependency)
- [ ] Mocks at port boundaries only
- [ ] State reset in beforeEach

## Anti-Patterns

- Testing implementation details instead of behavior
- 100% coverage obsession on presentation layer
- Slow tests in unit suite (move to integration)
- Shared mutable state between tests
- Testing framework internals
- Disabling tests to make CI pass
- Testing private methods directly

---

## Cross-References

- **Test workflow**: `workflows/test.md`
- **Testing rules**: `rules/testing.md`
- **Quality Engineer skill**: `skills/quality-engineer/SKILL.md`
- **Testing knowledge (Vitest)**: `knowledge/testing/unit/vitest.md`
- **Testing knowledge (Playwright)**: `knowledge/testing/e2e/playwright.md`
- **Contract testing**: `knowledge/testing/patterns/contract-testing-pact.md`
