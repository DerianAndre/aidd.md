---
name: Pact (Contract Testing)
category: testing
last_updated: 2026-01-14
maturity: stable
---

# Pact (Contract Testing)

## Overview

Consumer-Driven Contract Testing framework ensuring frontend-backend compatibility without integration tests. Consumer defines expected API responses, provider validates contracts.

## Key Metrics

- **Testing Speed:** 10-100x faster than E2E (no full system boot)
- **Decoupling:** Frontend/backend teams develop in parallel
- **DX:** Mock APIs guaranteed to match real provider behavior
- **Maturity:** 10+ years, production-grade, multi-language support
- **Cost:** Free, open-source

## Use Cases

| Scenario                              | Fit Score (1-10) | Rationale                                           |
| ------------------------------------- | ---------------- | --------------------------------------------------- |
| Microservices (100+ services)         | 10               | Verify API contracts without full integration tests |
| Frontend/backend parallel development | 10               | Frontend mocks guaranteed to match backend          |
| Preventing breaking API changes       | 10               | Producer tests fail if contract violated            |
| Monolith with single API              | 5                | Overhead not justified (use E2E tests)              |
| GraphQL APIs                          | 7                | Works but schema stitching simpler                  |

## Trade-offs

### Strengths

- **Decoupling:** Frontend tests run without backend server
- **Early Detection:** Breaking changes caught before deployment
- **Parallel Development:** Teams don't block each other
- **CI/CD Integration:** Publish contracts to Pact Broker, verify in pipeline

### Weaknesses

- **Learning Curve:** Contract testing paradigm unfamiliar to most teams
- **Pact Broker Setup:** Requires infrastructure (hosted or self-hosted)
- **Not E2E:** Doesn't test full system integration (complement, not replace)
- **GraphQL Maturity:** Less mature than for REST APIs

## Implementation Flow

```
1. Consumer (Frontend) writes test:
   "When I GET /users/123, expect {id: 123, name: string}"

2. Pact generates contract file

3. Contract published to Pact Broker

4. Provider (Backend) runs verification:
   "Does my API satisfy this contract?"

5. CI fails if provider breaks contract
```

## Alternatives

| Alternative                  | When to Choose Instead                                |
| ---------------------------- | ----------------------------------------------------- |
| **E2E Tests (Playwright)**   | Need full system integration validation               |
| **GraphQL Schema Stitching** | GraphQL APIs (schema auto-validates contracts)        |
| **TypeScript Shared Types**  | Monorepo (share types directly, no runtime contracts) |

## References

- [Pact JS Official Docs](https://github.com/pact-foundation/pact-js)
- [Pact Testing Framework Guide](https://medium.com/@marketing_55895/introduction-7344e0b6d337)
- [Contract Testing Overview](https://pactflow.io/how-pact-works/)
