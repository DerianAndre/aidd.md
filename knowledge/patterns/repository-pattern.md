---
name: Repository Pattern
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# Repository Pattern

## Overview

Design pattern abstracting data access behind an interface. Separates business logic from data layer, enabling testability, swappable data sources, and domain-driven design.

## Key Metrics

- **Testability:** 10/10 (mock repositories in tests)
- **Complexity:** Medium (extra abstraction layer)
- **Decoupling:** High (business logic independent of DB)
- **DX:** Clear separation of concerns, easier refactoring
- **Maturity:** 20+ years (Enterprise Application Architecture pattern)

## Use Cases

| Scenario                           | Fit Score (1-10) | Rationale                                                      |
| ---------------------------------- | ---------------- | -------------------------------------------------------------- |
| Domain-Driven Design (DDD)         | 10               | Core pattern for DDD (aggregate repositories)                  |
| Unit testing business logic        | 10               | Mock repositories = test without DB                            |
| Swappable data sources             | 9                | Change DB (Postgres → MongoDB) without changing business logic |
| Simple CRUD apps                   | 4                | Over-engineering (ORM enough)                                  |
| Edge/serverless (direct DB access) | 5                | Abstraction overhead in serverless cold starts                 |

## Trade-offs

### Strengths

- **Testability:** Mock `IUserRepository` in tests (no DB needed)
- **Decoupling:** Business logic doesn't know about SQL/Drizzle
- **Swappable:** Switch from Postgres to MongoDB without changing domain logic
- **DDD Alignment:** Repositories per aggregate root (Order, User)

### Weaknesses

- **Boilerplate:** More code (interface + implementation)
- **Performance:** Extra abstraction layer (minimal overhead)
- **Overkill:** Simple apps don't benefit from abstraction
- **ORM Leakage:** Hard to avoid ORM-specific features leaking into interface

## Implementation Pattern (Next.js + Drizzle)

```typescript
// domain/IUserRepository.ts (Interface)
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  delete(id: string): Promise<void>;
}

// infrastructure/DrizzleUserRepository.ts (Implementation)
import { db } from "@/lib/db";
import { users } from "@/schema";

export class DrizzleUserRepository implements IUserRepository {
  async findById(id: string) {
    return db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });
  }

  async create(data: CreateUserDto) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  // ... other methods
}

// application/createUserUseCase.ts (Business Logic)
export async function createUser(
  data: CreateUserDto,
  userRepo: IUserRepository // Injected dependency
) {
  // Validate business rules (domain logic)
  if (await userRepo.findByEmail(data.email)) {
    throw new Error("Email already exists");
  }

  return userRepo.create(data);
}
```

## Testing

```typescript
// __tests__/createUserUseCase.test.ts
import { createUser } from "./createUserUseCase";

const mockUserRepo: IUserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn().mockResolvedValue(null), // No existing user
  create: vi.fn().mockResolvedValue({ id: "1", email: "test@example.com" }),
  update: vi.fn(),
  delete: vi.fn(),
};

test("creates user when email is unique", async () => {
  const user = await createUser({ email: "new@example.com" }, mockUserRepo);
  expect(user.email).toBe("test@example.com");
  expect(mockUserRepo.create).toHaveBeenCalled();
});
```

## Alternatives

| Alternative                 | When to Choose Instead                           |
| --------------------------- | ------------------------------------------------ |
| **Active Record (TypeORM)** | ORM handles both data + logic (simpler for CRUD) |
| **Direct ORM Usage**        | Simple apps, no need for abstraction             |
| **Query Builder (Kysely)**  | Want SQL control without repository overhead     |

## References

- [Repository Pattern (Martin Fowler)](https://martinfowler.com/eaaCatalog/repository.html)
- [Repository Pattern in Next.js](https://dev.to/behnamrhp/how-we-fixed-nextjs-at-scale-di-clean-architecture-secrets-from-production-gnj)
- [DDD with React](https://blog.bitsrc.io/domain-driven-design-with-react-building-scalable-and-maintainable-applications-8aa854f18a69)
