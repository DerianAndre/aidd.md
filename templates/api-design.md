# API Design — Contract-First Interface Engineering

> Spec first, implement second. The contract is the truth.

**Effort Tier**: 1→2 (HIGH for design, STANDARD for implementation)
**AIDD Skill**: `skills/contract-architect/SKILL.md`

---

## Preconditions

- API requirements clearly defined
- Consumer needs identified (frontend, mobile, third-party)
- Authentication/authorization strategy chosen

## Sub-Agent Roles

| Role | Focus |
|------|-------|
| **Contract Architect** | API spec, schema design, versioning strategy, error contracts |
| **Backend Engineer** | Implementation, validation, performance, error handling |

## Process

### Step 1 — Choose Protocol

| Protocol | When to Use |
|----------|-------------|
| **REST** (default) | CRUD operations, simple relationships, broad client compatibility |
| **GraphQL** | Complex nested relationships, multiple client types with different data needs |
| **gRPC** | High-performance internal service-to-service, streaming, strong typing |

### Step 2 — Design Contract First

For REST APIs, write OpenAPI 3.1 specification BEFORE implementation:

```yaml
openapi: 3.1.0
info:
  title: Service Name
  version: 1.0.0
paths:
  /resource:
    get:
      summary: List resources
      parameters:
        - name: cursor
          in: query
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
      responses:
        '200':
          description: Paginated list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedResponse'
```

### Step 3 — Define Schemas with Zod

Every request and response has a Zod schema:

```typescript
const CreateResourceSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['typeA', 'typeB']),
  metadata: z.record(z.string()).optional(),
});

const ResourceResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['typeA', 'typeB']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
```

### Step 4 — Error Responses (RFC 7807)

ALL errors follow Problem Details format:

```typescript
interface ProblemDetail {
  type: string;       // URI reference identifying the problem type
  title: string;      // Short human-readable summary
  status: number;     // HTTP status code
  detail: string;     // Human-readable explanation specific to this occurrence
  instance?: string;  // URI reference identifying the specific occurrence
}
```

Standard error mapping:

| Domain Exception | HTTP Status | Type |
|-----------------|-------------|------|
| ValidationException | 400 | /errors/validation |
| AuthenticationException | 401 | /errors/authentication |
| AuthorizationException | 403 | /errors/authorization |
| NotFoundException | 404 | /errors/not-found |
| ConflictException | 409 | /errors/conflict |
| RateLimitException | 429 | /errors/rate-limit |
| DomainException | 422 | /errors/domain |
| InternalException | 500 | /errors/internal |

### Step 5 — Pagination

**Cursor-based** (preferred):
```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6MTAwfQ==",
    "hasMore": true,
    "total": 1523
  }
}
```

**Offset-based** (when cursor not practical):
```json
{
  "data": [...],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 1523
  }
}
```

### Step 6 — Versioning

| Strategy | Format | When |
|----------|--------|------|
| URL path (preferred) | `/v1/resources` | Public APIs, clear major versions |
| Header | `Accept-Version: 1.0` | Internal APIs, granular versioning |
| Query param | `?version=1` | Quick and dirty (avoid) |

### Step 7 — Security

- **Authentication**: JWT in HttpOnly cookies (web), Bearer token (API clients)
- **Rate limiting**: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
- **CORS**: Strict origin allowlist, NEVER wildcard in production
- **Input validation**: Zod at every endpoint (reject before processing)
- **Output filtering**: Return only what the consumer needs (no data leakage)

### Step 8 — Implement Following Contract

- Controllers are THIN: validate → delegate → respond
- Business logic in domain services, never in controllers
- Adapters handle external integrations
- Every endpoint returns Content-Type header
- Consistent response envelope across all endpoints

## Quality Gates

- [ ] OpenAPI spec complete BEFORE implementation
- [ ] All error cases documented with RFC 7807 format
- [ ] Pagination on all list endpoints
- [ ] Rate limiting configured
- [ ] CORS restricted (no wildcard)
- [ ] Zod schemas for all request/response types
- [ ] Authentication/authorization on protected endpoints
- [ ] Versioning strategy documented

## Anti-Patterns

- Implementation before contract (spec drift)
- Inconsistent error formats across endpoints
- Missing pagination on list endpoints
- Overfetching: returning entire objects when consumer needs 3 fields
- No versioning strategy (breaking changes break clients)
- Business logic in controllers
- Using HTTP status codes incorrectly (200 for errors, 500 for validation)
- Exposing internal IDs or implementation details

---

## Cross-References

- **Contract Architect skill**: `skills/contract-architect/SKILL.md`
- **Backend rules**: `rules/backend.md`
- **Security rules**: `rules/security.md`
- **REST knowledge**: `knowledge/backend/communication/rest.md`
- **GraphQL knowledge**: `knowledge/backend/communication/graphql.md`
- **gRPC knowledge**: `knowledge/backend/communication/grpc.md`
- **Zod knowledge**: `knowledge/tooling/validation/zod.md`
