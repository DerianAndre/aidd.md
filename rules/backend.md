# 🔧 Backend Development Rules

> **Activation:** Projects containing `nest`, `express`, `fastify`, `.prisma`, `.sql`, or backend-related patterns

---

## 🏛️ Architecture: Hexagonal (Ports & Adapters)

### Mandatory Layer Separation

```
src/
├── domain/           ← Business Logic (PURE, no dependencies)
│   ├── entities/
│   ├── value-objects/
│   └── repositories/  (interfaces only)
├── application/      ← Use Cases / Services
│   └── use-cases/
├── infrastructure/   ← External Adapters (DB, HTTP, Queue)
│   ├── persistence/
│   ├── http/
│   └── messaging/
└── presentation/     ← Controllers / GraphQL Resolvers
```

### Rules:

1. **Domain NEVER imports from infrastructure or presentation**
2. **Dependencies point inward** (Presentation → Application → Domain)
3. **Use Dependency Injection** for all cross-layer communication

---

## 🗄️ Database Best Practices

### ORM Usage (Prisma/TypeORM)

- ✅ **DO:** Use migrations for schema changes
- ✅ **DO:** Define indexes explicitly in schema
- ❌ **DON'T:** Use `synchronize: true` in production
- ❌ **DON'T:** Execute raw SQL without prepared statements

### Query Optimization

```typescript
// ❌ N+1 Query Problem
for (const user of users) {
  const posts = await db.post.findMany({ where: { userId: user.id } });
}

// ✅ Batch with JOIN or IN clause
const posts = await db.post.findMany({
  where: { userId: { in: users.map((u) => u.id) } },
  include: { user: true },
});
```

### Transactions

- **ACID Compliance:** Always use transactions for multi-table writes
- **Isolation Levels:** Explicitly set when dealing with concurrent updates

```typescript
await db.$transaction(async (tx) => {
  await tx.account.update({
    where: { id: fromId },
    data: { balance: { decrement: amount } },
  });
  await tx.account.update({
    where: { id: toId },
    data: { balance: { increment: amount } },
  });
});
```

---

## 🔐 Security Standards

### Authentication & Authorization

- **JWT:** Store in HttpOnly cookies, not localStorage (XSS protection)
- **Password Hashing:** Use bcrypt (cost factor ≥ 12) or Argon2id
- **API Keys:** Rotate every 90 days, store hashed in DB

### Input Validation

```typescript
// ✅ Use DTOs with class-validator
import { IsEmail, IsStrongPassword, Length } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsStrongPassword({ minLength: 12 })
  password: string;

  @Length(2, 50)
  name: string;
}
```

### SQL Injection Prevention

- ❌ **NEVER:** String concatenation in queries

```typescript
// ❌ VULNERABLE
db.query(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ SAFE (Prepared Statement)
db.query("SELECT * FROM users WHERE email = ?", [email]);
```

---

## 📡 API Design (REST)

### Naming Conventions

- **Resources:** Plural nouns (`/users`, `/orders`)
- **Actions:** HTTP verbs (GET, POST, PUT, PATCH, DELETE)
- **Nesting:** Max 2 levels (`/users/:id/orders`, not `/users/:id/orders/:id/items`)

### Status Codes (Required)

| Code | Meaning               | When to Use                                     |
| ---- | --------------------- | ----------------------------------------------- |
| 200  | OK                    | Successful GET/PUT/PATCH                        |
| 201  | Created               | Successful POST                                 |
| 204  | No Content            | Successful DELETE                               |
| 400  | Bad Request           | Validation failure                              |
| 401  | Unauthorized          | Missing/invalid token                           |
| 403  | Forbidden             | Valid token, insufficient permissions           |
| 404  | Not Found             | Resource doesn't exist                          |
| 409  | Conflict              | Duplicate resource (e.g., email already exists) |
| 500  | Internal Server Error | Unhandled exception                             |

### Versioning

- **Strategy:** URL path versioning (`/api/v1/users`)
- **Deprecation:** Maintain old versions for ≥6 months with warnings

---

## ⚡ Performance

### Caching Strategy

```typescript
// Redis Example
const cacheKey = `user:${userId}:profile`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const data = await db.user.findUnique({ where: { id: userId } });
await redis.setex(cacheKey, 3600, JSON.stringify(data)); // 1hr TTL
return data;
```

### Pagination

- **ALWAYS paginate** lists (default: 20 items, max: 100)

```typescript
interface PaginationQuery {
  page?: number; // Default: 1
  limit?: number; // Default: 20, max: 100
  sortBy?: string;
  order?: "asc" | "desc";
}
```

---

## 🧪 Testing Requirements

### Coverage Targets

- **Domain Logic:** 100% (no exceptions)
- **Application Services:** ≥90%
- **Controllers:** ≥70% (focus on validation logic)
- **Infrastructure:** ≥60% (mock external dependencies)

### Test Structure (AAA Pattern)

```typescript
describe("UserService.createUser", () => {
  it("should hash password before saving", async () => {
    // Arrange
    const dto = { email: "test@example.com", password: "plain123" };
    const mockRepo = { save: vi.fn() };

    // Act
    await service.createUser(dto);

    // Assert
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        password: expect.not.stringContaining("plain123"),
      })
    );
  });
});
```

---

## 📦 Dependency Management

### Allowed ORMs

- ✅ Prisma (preferred for TypeScript projects)
- ✅ TypeORM (for complex inheritance patterns)
- ⚠️ Sequelize (legacy only, do not use for new projects)

### Validation Libraries

- ✅ `class-validator` + `class-transformer` (NestJS standard)
- ✅ `zod` (for schema-first validation)
- ❌ `joi` (avoid in TypeScript; weak type inference)

---

## 🚨 Error Handling

### Custom Exception Hierarchy

```typescript
// Base
export class DomainException extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

// Specific
export class UserNotFoundException extends DomainException {
  constructor(userId: string) {
    super(`User ${userId} not found`, "USER_NOT_FOUND");
  }
}
```

### Global Exception Filter (NestJS)

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof DomainException) {
      return response.status(400).json({
        error: exception.code,
        message: exception.message,
      });
    }

    // Log but don't expose internal errors
    logger.error(exception);
    return response.status(500).json({ error: "INTERNAL_ERROR" });
  }
}
```

---

**Enforcement:** These rules are checked by `/review` and `/audit` workflows.
