---
name: Redis
category: data
last_updated: 2026-01-14
maturity: stable
---

# Redis

## Overview

In-memory data structure store used as cache, message broker (Pub/Sub), and session store. Industry standard for high-speed key-value operations and real-time systems.

## Key Metrics

- **Performance:** Sub-millisecond latency (<1ms GET/SET)
- **Throughput:** 100k+ ops/sec on modest hardware
- **Persistence:** Optional (RDB snapshots, AOF logs)
- **DX:** Simple API, rich data structures (lists, sets, sorted sets)
- **Maturity:** 15+ years, battle-tested at scale
- **Cost:** Memory-intensive (RAM costs vs disk-based DBs)

## Use Cases

| Scenario                         | Fit Score (1-10) | Rationale                                 |
| -------------------------------- | ---------------- | ----------------------------------------- |
| Caching layer (DB query results) | 10               | Sub-ms latency = perfect for cache        |
| Session storage                  | 10               | Fast reads/writes, TTL support            |
| Real-time leaderboards           | 10               | Sorted sets optimized for rankings        |
| Message broker (Pub/Sub)         | 8                | Good but Kafka better for event streaming |
| Primary database                 | 4                | Memory-only = expensive, use Postgres     |

## Trade-offs

### Strengths

- **Speed:** Sub-millisecond latency (in-memory)
- **Data Structures:** Lists, sets, sorted sets, hashes (not just key-value)
- **Pub/Sub:** Built-in message broker for real-time
- **TTL:** Automatic key expiration (perfect for caching)

### Weaknesses

- **Memory Cost:** RAM expensive vs disk-based storage
- **Durability:** Not ACID-compliant (use Postgres for critical data)
- **Complexity at Scale:** Requires clustering (Redis Cluster) for sharding
- **Query Flexibility:** No SQL, limited querying vs databases

## Alternatives

| Alternative     | When to Choose Instead                                         |
| --------------- | -------------------------------------------------------------- |
| **Memcached**   | Simpler caching needs, don't need data structures              |
| **Valkey**      | Want Redis fork without licensing concerns (AWS/Google backed) |
| **DragonflyDB** | Need Redis API with better multi-core scaling                  |

## References

- [Redis Official Docs](https://redis.io/docs/)
- [Redis Use Cases](https://redis.io/docs/about/use-cases/)
- [Redis vs Memcached](https://aws.amazon.com/elasticache/redis-vs-memcached/)
