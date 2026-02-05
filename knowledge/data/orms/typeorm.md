---
name: TypeORM
category: data
last_updated: 2026-01-14
maturity: stable
---

# TypeORM

## Overview

TypeScript ORM using Active Record and Data Mapper patterns with decorator-based entities. Feature-rich with migrations, relations, and query builder. Alternative to Drizzle/Prisma for class-based architecture.

## Key Metrics

- **Performance:** ~150ms cold start (vs Drizzle 50ms, Prisma 300ms)
- **Bundle Size:** ~500KB (vs Drizzle 30KB, Prisma 5MB)
- **DX:** Decorator-based entities, migration CLI, extensive docs
- **Maturity:** v0.3+ (10+ years), production-grade, large ecosystem
- **Cost:** Moderate serverless costs (3x slower cold start than Drizzle)

## Use Cases

| Scenario                                   | Fit Score (1-10) | Rationale                                                      |
| ------------------------------------------ | ---------------- | -------------------------------------------------------------- |
| Class-based architecture (NestJS)          | 10               | Native NestJS integration, decorator pattern alignment         |
| Traditional server apps (Express, Fastify) | 9                | Long-running processes = cold start irrelevant                 |
| Developers familiar with Java/C# ORMs      | 9                | Active Record pattern (similar to Entity Framework, Hibernate) |
| Serverless/Edge functions                  | 4                | 150ms cold start vs Drizzle 50ms (3x slower)                   |
| Greenfield TypeScript projects             | 6                | Drizzle lighter, better for modern serverless                  |

## Trade-offs

### Strengths

- **Active Record Pattern:** Entities have save/remove methods (vs Drizzle repository pattern)
- **Decorators:** Clean entity definitions with `@Entity()`, `@Column()`, `@ManyToOne()`
- **Migration System:** Robust migration generation and execution
- **Query Builder:** Type-safe queries with chainable methods

### Weaknesses

- **Bundle Size:** 500KB vs Drizzle 30KB (16x larger)
- **Cold Start:** 150ms vs Drizzle 50ms (3x slower for serverless)
- **Decorator Overhead:** `experimentalDecorators` in tsconfig required
- **Schema-First:** Can't introspect existing databases as easily as Prisma

## Implementation Pattern

```typescript
// entity/User.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  name: string;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  // Active Record methods
  async save() {
    return await getRepository(User).save(this);
  }
}

// Usage
const user = new User();
user.email = "test@example.com";
user.name = "Alice";
await user.save(); // Active Record pattern

// Or Data Mapper pattern
import { getRepository } from "typeorm";
const userRepo = getRepository(User);
await userRepo.save(user);
```

## Comparison with Drizzle/Prisma

| Feature                | TypeORM       | Drizzle        | Prisma       |
| ---------------------- | ------------- | -------------- | ------------ |
| **Cold Start**         | 150ms         | 50ms ✅        | 300ms        |
| **Bundle Size**        | 500KB         | 30KB ✅        | 5MB          |
| **Pattern**            | Active Record | Data Mapper ✅ | Schema-first |
| **NestJS Integration** | Native ✅     | Manual         | Manual       |
| **Migrations**         | Excellent ✅  | Good           | Excellent ✅ |

## Alternatives

| Alternative | When to Choose Instead                                                     |
| ----------- | -------------------------------------------------------------------------- |
| **Drizzle** | Serverless, need fast cold start, SQL-like queries                         |
| **Prisma**  | Want Prisma Studio GUI, schema introspection, willing to accept cold start |
| **Kysely**  | Pure query builder (no ORM), maximum SQL control                           |

## References

- [TypeORM Official Docs](https://typeorm.io/)
- [Node.js ORMs Comparison (2025)](https://thedataguy.pro/blog/2025/12/nodejs-orm-comparison-2025/)
- [TypeORM vs Drizzle vs Prisma](https://www.bytebase.com/blog/drizzle-vs-prisma/)
