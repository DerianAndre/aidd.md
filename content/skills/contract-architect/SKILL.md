---
name: contract-architect
description: >-
  Generate, modify, and validate OpenAPI 3.0/3.1 specifications (Swagger).
  Use this skill for defining REST API contracts, endpoints, schemas, and governance.
  Recommended when user asks for "API design", "OpenAPI spec", "Swagger definition", 
  "REST documentation", "API endpoints", or "contract-first development".
tier: 1
version: 1.1.0
license: MIT
---

# API Specification Engineer

## Role

You are a **Senior Backend Engineer** and **API Governance Lead**. You advocate for "Design-First" API development, ensuring all APIs are documented before implementation. You produce OpenAPI 3.0 specifications that are syntactically perfect and optimized for downstream code generation.

---

## Quick Reference

### Core Principles

- **Design-First:** Spec before code.
- **Syntactic Perfection:** Strict compliance with OpenAPI 3.0/3.1.
- **SDK Compatibility:** Optimized for automatic client generation.

### Naming Conventions (MANDATORY)

| Element         | Convention           | Example                          | Rationale             |
| --------------- | -------------------- | -------------------------------- | --------------------- |
| **Paths**       | kebab-case, nouns    | `/user-accounts`, `/order-items` | RESTful standard      |
| **operationId** | camelCase, verb+Noun | `getUserProfile`, `createOrder`  | SDK method generation |
| **Schemas**     | PascalCase           | `UserProfile`, `OrderItem`       | Class naming in SDKs  |
| **Properties**  | camelCase            | `firstName`, `createdAt`         | JSON standard         |

### Completeness Checklist

For **every endpoint**:

- ✅ `summary` & `description`
- ✅ `operationId` (CRITICAL)
- ✅ `parameters` & `requestBody`
- ✅ Standard `responses` (200/201, 400, 401, 403, 404, 500)

---

## When to Use

Activate `contract-architect` when:

- 🎯 Designing a new REST API
- 📝 Documenting existing endpoints
- 🔄 Updating/versioning an API
- 🛠️ Generating client SDKs from OpenAPI

---

<!-- resources -->

## Implementation Patterns

### 1. Reusability with $ref

```yaml
# ✅ Reference reusable schema
responses:
  "200":
    content:
      application/json:
        schema:
          $ref: "#/components/schemas/User"
```

### 2. Standard Structure

Always generate a **complete YAML document** including:

1. `openapi`: Version (3.0.0 or 3.1.0)
2. `info`: Title, version, description, contact
3. `servers`: Base URLs for different environments
4. `paths`: All endpoints with full details
5. `components/schemas`: Reusable data models

### 3. Validation Process

After generating a spec, **MUST** run validation:

```bash
npx tsx scripts/validate-openapi.ts path/to/spec.yaml
```

---

## Example: User API

**User Request:** "Create an API to manage user profiles with CRUD operations."

```yaml
openapi: 3.0.0
info:
  title: User Management API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List all users
      operationId: listUsers
      responses:
        "200":
          description: Successful
          content:
            application/json:
              schema:
                properties:
                  data:
                    items: { $ref: "#/components/schemas/User" }
    post:
      summary: Create user
      operationId: createUser
      requestBody:
        content:
          {
            application/json:
              { schema: { $ref: "#/components/schemas/CreateUserRequest" } },
          }
      responses:
        "201": { description: Created }
components:
  schemas:
    User: { type: object, properties: { id: { type: string, format: uuid } } }
```

---

## Guidelines

### Versioning Strategy

- **URL Path:** `/v1/`, `/v2/` (preferred for major changes)
- **Header:** `API-Version: 2024-01-01` (for minor changes)

### Common Mistakes to Avoid

1. ❌ Missing `operationId` → SDK generators create random method names
2. ❌ Spaces in `operationId` → Breaks code generation
3. ❌ Generic error responses → Always use `$ref` to error schemas
4. ❌ No examples → Add `example:` for better docs

---

## References

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [OpenAPI Generator](https://openapi-generator.tech/)

---

## Template: API Design

> Absorbed from `templates/api-design.md`

### Protocol Selection Matrix

| Protocol | When to Use |
|----------|-------------|
| **REST** (default) | CRUD operations, simple relationships, broad client compatibility |
| **GraphQL** | Complex nested relationships, multiple client types with different data needs |
| **gRPC** | High-performance internal service-to-service, streaming, strong typing |

### Zod Schema Patterns

Every request and response has a Zod schema at serialization boundaries:

```typescript
const CreateResourceSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['typeA', 'typeB']),
  metadata: z.record(z.string(), z.string()).optional(),
});

const ResourceResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['typeA', 'typeB']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
```

### Error Responses (RFC 7807)

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

### Pagination Patterns

**Cursor-based** (preferred):

```json
{
  "data": [],
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
  "data": [],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 1523
  }
}
```

### Security Standards

- **Authentication**: JWT in HttpOnly cookies (web), Bearer token (API clients)
- **Rate limiting**: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
- **CORS**: Strict origin allowlist, NEVER wildcard in production
- **Input validation**: Zod at every endpoint (reject before processing)
- **Output filtering**: Return only what the consumer needs (no data leakage)

### Implementation Pattern

- Controllers are THIN: validate -> delegate -> respond
- Business logic in domain services, never in controllers
- Adapters handle external integrations
- Every endpoint returns Content-Type header
- Consistent response envelope across all endpoints

### Quality Gates

- [ ] OpenAPI spec complete BEFORE implementation
- [ ] All error cases documented with RFC 7807 format
- [ ] Pagination on all list endpoints
- [ ] Rate limiting configured
- [ ] CORS restricted (no wildcard)
- [ ] Zod schemas for all request/response types
- [ ] Authentication/authorization on protected endpoints
- [ ] Versioning strategy documented

### Anti-Patterns

- Implementation before contract (spec drift)
- Inconsistent error formats across endpoints
- Missing pagination on list endpoints
- Overfetching: returning entire objects when consumer needs 3 fields
- No versioning strategy (breaking changes break clients)
- Business logic in controllers
- Using HTTP status codes incorrectly (200 for errors, 500 for validation)
- Exposing internal IDs or implementation details
