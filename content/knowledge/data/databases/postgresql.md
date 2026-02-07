---
name: PostgreSQL
category: data
last_updated: 2026-01-14
maturity: stable
---

# PostgreSQL

## Overview

Advanced open-source relational database with ACID compliance, JSONB support, full-text search, and extensive extensions. Industry standard for structured data, preferred over MySQL in modern apps.

## Key Metrics

- **Performance:** Excellent for complex queries, OLTP workloads
- **Features:** JSONB, arrays, full-text search, geospatial (PostGIS)
- **Scalability:** Vertical scaling (single-server), horizontal via Citus/sharding
- **DX:** pgAdmin, psql CLI, excellent documentation
- **Maturity:** 30+ years, battle-tested at enterprise scale

## Use Cases

| Scenario                           | Fit Score (1-10) | Rationale                                             |
| ---------------------------------- | ---------------- | ----------------------------------------------------- |
| Relational data (e-commerce, SaaS) | 10               | ACID, foreign keys, transactions                      |
| JSON/semi-structured data          | 9                | JSONB (indexed JSON) better than MySQL JSON           |
| Full-text search                   | 8                | Built-in (though Elasticsearch better for advanced)   |
| Analytics (OLAP)                   | 7                | Works but ClickHouse/BigQuery optimized for analytics |
| Edge computing                     | 4                | Use SQLite or Neon (serverless Postgres)              |

## Trade-offs

### Strengths

- **Rich Features:** JSONB, arrays, full-text search, CTEs, window functions
- **ACID Compliance:** Reliable transactions, referential integrity
- **Extensions:** PostGIS (geospatial), pgvector (AI embeddings), Citus (sharding)
- **Standards-Compliant:** SQL standard adherence (vs MySQL deviations)

### Weaknesses

- **Complexity:** More features = steeper learning curve than SQLite
- **Write Performance:** Slightly slower than MySQL for simple inserts (MVCC overhead)
- **Horizontal Scaling:** Not native (requires Citus extension or sharding logic)
- **Memory Usage:** Higher than MySQL for same workload

## Implementation Pattern (Drizzle ORM)

```typescript
// schema.ts
import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  metadata: jsonb("metadata"), // JSONB column
  createdAt: timestamp("created_at").defaultNow(),
});

// queries.ts
import { db } from "./db";
import { users } from "./schema";
import { eq, sql } from "drizzle-orm";

// Insert
const newUser = await db
  .insert(users)
  .values({
    email: "user@example.com",
    name: "Alice",
    metadata: { role: "admin", preferences: { theme: "dark" } },
  })
  .returning();

// JSONB query
const admins = await db
  .select()
  .from(users)
  .where(sql`${users.metadata}->>'role' = 'admin'`);

// Full-text search
const results = await db
  .select()
  .from(users)
  .where(sql`to_tsvector('english', ${users.name}) @@ to_tsquery('alice')`);
```

## Serverless Options

| Service      | When to Use                                                 |
| ------------ | ----------------------------------------------------------- |
| **Neon**     | Serverless, database branching, scale-to-zero               |
| **Supabase** | Postgres + Firebase-like features (auth, storage, realtime) |
| **AWS RDS**  | Traditional managed Postgres (not serverless)               |

## Alternatives

| Alternative           | When to Choose Instead                                    |
| --------------------- | --------------------------------------------------------- |
| **MySQL/PlanetScale** | Need horizontal sharding (Vitess), prefer MySQL ecosystem |
| **SQLite**            | Embedded, edge computing, local-first apps                |
| **MongoDB**           | Document-heavy, schema-less flexibility critical          |

## References

- [PostgreSQL Official Docs](https://www.postgresql.org/docs/)
- [Best PostgreSQL Hosting (2026)](https://northflank.com/blog/best-postgresql-hosting-providers)
- [pgvector for AI Embeddings](https://github.com/pgvector/pgvector)
