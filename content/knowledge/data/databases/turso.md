---
name: Turso (LibSQL)
category: data
last_updated: 2026-01-14
maturity: emerging
---

# Turso (LibSQL)

## Overview

Edge-compatible SQLite fork with built-in replication and branching. Distributed SQLite for global applications running on Cloudflare Workers, Vercel Edge, AWS Lambda.

## Key Metrics

- **Cold Start:** <10ms connection (embedded SQLite-compatible)
- **Global Replication:** Multi-region read replicas (eventual consistency)
- **Query Performance:** SQLite-level (sub-ms local reads)
- **DX:** libSQL client, database branching (like Git), schema migrations
- **Maturity:** v1.0+ (2024-2026), production-ready, ChiselStrike/Turso backing
- **Cost:** Free tier (500 databases), then $29/month for production

## Use Cases

| Scenario                               | Fit Score (1-10) | Rationale                                            |
| -------------------------------------- | ---------------- | ---------------------------------------------------- |
| Edge applications (Cloudflare Workers) | 10               | Embedded SQLite + global replication = <10ms latency |
| Multi-region deployments               | 10               | Read replicas in 30+ regions automatically           |
| Development/staging workflows          | 9                | Database branching (test with prod data copy)        |
| High-write concurrency                 | 5                | SQLite single-writer limitation (use Postgres)       |
| Complex transactions                   | 7                | ACID locally, eventual consistency across regions    |

## Trade-offs

### Strengths

- **Edge Compatibility:** Runs on Cloudflare Workers, Vercel Edge, Deno Deploy
- **Global Replication:** Automatic multi-region read replicas
- **Database Branching:** Create branch DBs for testing (like Neon)
- **SQLite API:** Use existing SQLite tools, drivers, ORMs

### Weaknesses

- **Write Concurrency:** Single writer per database (SQLite limitation)
- **Eventual Consistency:** Cross-region writes take seconds to replicate
- **Ecosystem:** Smaller than PostgreSQL (newer service)
- **Cost at Scale:** $29/month per production DB (vs self-hosted SQLite)

## Implementation Pattern

```typescript
// Cloudflare Worker with Turso
import { createClient } from "@libsql/client/web";

export default {
  async fetch(request: Request, env: Env) {
    // Connect to Turso
    const client = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    });

    // Query (same as SQLite)
    const users = await client.execute("SELECT * FROM users LIMIT 10");

    return new Response(JSON.stringify(users.rows), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

// Insert
await client.execute({
  sql: "INSERT INTO users (email, name) VALUES (?, ?)",
  args: ["alice@example.com", "Alice"],
});

// Transactions (local ACID)
await client.batch(
  [
    {
      sql: "UPDATE accounts SET balance = balance - 100 WHERE id = ?",
      args: [1],
    },
    {
      sql: "UPDATE accounts SET balance = balance + 100 WHERE id = ?",
      args: [2],
    },
  ],
  "write"
);
```

## Database Branching Workflow

```bash
# Create branch from production
turso db create dev-branch --from-db production

# Make schema changes on branch
turso db shell dev-branch
> ALTER TABLE users ADD COLUMN bio TEXT;

# Test changes
turso db show dev-branch

# Merge back to production
turso db copy dev-branch production
```

## Turso vs Neon vs Traditional SQLite

| Aspect                 | Turso         | Neon (Postgres)    | SQLite (Local) |
| ---------------------- | ------------- | ------------------ | -------------- |
| **Edge Compatible**    | Yes ✅        | No (TCP)           | Yes ✅         |
| **Global Replication** | Yes ✅        | No (single region) | No             |
| **Branching**          | Yes ✅        | Yes ✅             | Manual         |
| **Concurrency**        | Single writer | Multi-writer ✅    | Single writer  |
| **Cost**               | $29/month     | $0-100/month       | Free ✅        |

## When Turso > Traditional Postgres

| Scenario           | Why Turso Wins                      |
| ------------------ | ----------------------------------- |
| **Edge Functions** | Embedded (no TCP), <10ms connection |
| **Global Apps**    | Auto-replicated to 30+ regions      |
| **Dev Workflows**  | Branch databases for each PR        |
| **Serverless**     | No cold start penalty (embedded)    |

## Alternatives

| Alternative         | When to Choose Instead                                 |
| ------------------- | ------------------------------------------------------ |
| **Neon (Postgres)** | Need multi-writer, PostgreSQL features (JSONB, arrays) |
| **SQLite (local)**  | Simple embedded needs, no replication required         |
| **PlanetScale**     | MySQL ecosystem, extreme write concurrency             |

## References

- [Turso Official Docs](https://docs.turso.tech/)
- [LibSQL GitHub](https://github.com/tursodatabase/libsql)
- [Turso vs Traditional Databases](https://turso.tech/blog/why-turso-is-the-ideal-database-for-edge-functions)
