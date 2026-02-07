---
name: SQLite
category: data
last_updated: 2026-01-14
maturity: stable
---

# SQLite

## Overview

Embedded SQL database engine storing data in a single file. Zero-config, serverless, ideal for edge computing, mobile apps, and local-first applications.

## Key Metrics

- **Performance:** <1ms query times (in-process, no network)
- **Bundle Size:** ~600KB library
- **Scalability:** Single-writer (concurrent reads OK, writes serialized)
- **DX:** SQL syntax, single file, zero configuration
- **Maturity:** 20+ years, most deployed database (billions of devices)

## Use Cases

| Scenario                                | Fit Score (1-10) | Rationale                             |
| --------------------------------------- | ---------------- | ------------------------------------- |
| Edge computing (Cloudflare Workers)     | 10               | In-process, no external DB connection |
| Mobile apps (React Native, Expo)        | 10               | Offline-first, embedded database      |
| Local-first apps (Obsidian, Notion)     | 10               | Data stored locally, sync optional    |
| Desktop apps (Electron, Tauri)          | 9                | Embedded, no server setup             |
| High-concurrency writes (Twitter-scale) | 2                | Single writer bottleneck              |

## Trade-offs

### Strengths

- **Zero Config:** No server, no connection strings (just a file path)
- **Portability:** Single file = easy backup, transfer, version control
- **Performance:** In-process = no network overhead (<1ms queries)
- **Reliability:** ACID-compliant, battle-tested (used in browsers, phones)

### Weaknesses

- **Concurrency:** Single writer (writes serialized, not parallel)
- **Network Access:** Not designed for remote clients (use Postgres)
- **Size Limits:** Practical limit ~1TB (not for big data)
- **Replication:** No built-in replication (use Litestream for backups)

## Implementation Pattern

```typescript
// Node.js (better-sqlite3)
import Database from "better-sqlite3";

const db = new Database("app.db");

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`);

// Insert
const insert = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
insert.run("Alice", "alice@example.com");

// Query
const users = db.prepare("SELECT * FROM users").all();
console.log(users);
```

## Edge Usage (Cloudflare D1)

```typescript
// Cloudflare Worker with D1 (SQLite at edge)
export default {
  async fetch(request, env) {
    const results = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(1)
      .all();

    return new Response(JSON.stringify(results));
  },
};
```

## Alternatives

| Alternative        | When to Choose Instead                                    |
| ------------------ | --------------------------------------------------------- |
| **PostgreSQL**     | Need concurrent writes, network access, advanced features |
| **IndexedDB**      | Browser-only (no server-side SQLite needed)               |
| **Turso (LibSQL)** | Want SQLite with replication and edge distribution        |

## References

- [SQLite Official Docs](https://www.sqlite.org/docs.html)
- [SQLite as Vector Database](https://dev.to/sfundomhlungu/how-to-build-a-vector-database-with-sqlite-in-nodejs-1epd)
- [Cloudflare D1 (SQLite at Edge)](https://developers.cloudflare.com/d1/)
