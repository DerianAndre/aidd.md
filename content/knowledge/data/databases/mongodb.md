---
name: MongoDB
category: data
last_updated: 2026-01-14
maturity: stable
---

# MongoDB

## Overview

Document-oriented NoSQL database storing data as JSON-like BSON documents. Schema-less flexibility for semi-structured data. Alternative to PostgreSQL for non-relational workloads.

## Key Metrics

- **Performance:** Excellent for read-heavy workloads (horizontal sharding built-in)
- **Scalability:** Horizontal scaling via sharding (auto-partitioning)
- **Query Speed:** <10ms for indexed queries, slower for complex joins
- **DX:** Mongoose ODM, MongoDB Atlas (managed), Compass GUI
- **Maturity:** 15+ years, production-grade, massive adoption
- **Cost:** Atlas free tier, higher cost for high storage (vs Postgres)

## Use Cases

| Scenario                               | Fit Score (1-10) | Rationale                                         |
| -------------------------------------- | ---------------- | ------------------------------------------------- |
| Semi-structured data (varying schemas) | 10               | No schema enforcement = flexible data models      |
| Content management systems             | 9                | Nested documents = natural fit for articles/posts |
| Real-time analytics (logs, events)     | 9                | High write throughput, horizontal sharding        |
| Relational data (foreign keys, ACID)   | 4                | Use PostgreSQL for complex relations              |
| Transactions across documents          | 5                | ACID transactions added, but PostgreSQL better    |

## Trade-offs

### Strengths

- **Flexible Schema:** Add/remove fields without migrations
- **Horizontal Scaling:** Built-in sharding across servers
- **Nested Documents:** Store related data together (vs joins in SQL)
- **High Write Throughput:** Optimized for writes (logs, events)

### Weaknesses

- **No Foreign Keys:** Manual relationship management (vs PostgreSQL)
- **Query Complexity:** Complex queries harder than SQL (no JOIN)
- **Storage Overhead:** BSON format larger than row-based storage
- **Eventual Consistency:** Default mode (configurable to strong)

## Implementation Pattern

```typescript
// Mongoose (MongoDB ODM)
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  metadata: {
    role: String,
    preferences: {
      theme: String,
      notifications: Boolean,
    },
  },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
});

const User = mongoose.model("User", userSchema);

// Create
const user = new User({
  email: "alice@example.com",
  name: "Alice",
  metadata: { role: "admin", preferences: { theme: "dark" } },
});
await user.save();

// Query nested data
const admins = await User.find({ "metadata.role": "admin" });

// Populate references (similar to SQL JOIN)
const userWithPosts = await User.findById(userId).populate("posts");
```

## When MongoDB > PostgreSQL

| Scenario               | Why MongoDB Wins                                             |
| ---------------------- | ------------------------------------------------------------ |
| **Varying schemas**    | Products with different attributes (clothing vs electronics) |
| **Nested data**        | Comments → replies → nested replies (store as tree)          |
| **Horizontal scaling** | Auto-sharding vs manual Postgres sharding (Citus)            |
| **High writes**        | Log aggregation, event tracking                              |

## When PostgreSQL > MongoDB

| Scenario              | Why PostgreSQL Wins                                         |
| --------------------- | ----------------------------------------------------------- |
| **Complex relations** | Orders → OrderItems → Products (foreign keys)               |
| **ACID critical**     | Financial transactions requiring strong consistency         |
| **Ad-hoc queries**    | Business intelligence (SQL easier than MongoDB aggregation) |
| **Structured data**   | User profiles with fixed schema                             |

## Alternatives

| Alternative    | When to Choose Instead                            |
| -------------- | ------------------------------------------------- |
| **PostgreSQL** | Need ACID, complex relations, SQL queries         |
| **DynamoDB**   | AWS-native, serverless, key-value access patterns |
| **Cassandra**  | Extreme scale (multi-datacenter replication)      |

## References

- [MongoDB Official Docs](https://www.mongodb.com/docs/)
- [PostgreSQL vs MongoDB (2026)](https://www.bytebase.com/blog/postgres-vs-mongodb/)
- [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database)
