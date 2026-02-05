---
name: Valkey
category: data
last_updated: 2026-01-14
maturity: stable
---

# Valkey

## Overview

Open-source Redis fork backed by AWS, Google Cloud, and Oracle. Maintains Redis API compatibility while addressing licensing concerns. Drop-in replacement for Redis with community governance.

## Key Metrics

- **Performance:** Identical to Redis (sub-millisecond latency)
- **API Compatibility:** 100% Redis protocol compatible
- **Throughput:** 100k+ ops/sec (same as Redis)
- **DX:** Same Redis CLI, libraries work without modification
- **Maturity:** v1.0+ (2024 fork), production-ready, enterprise backing
- **Cost:** Open-source (Apache 2.0 vs Redis SSPL licensing)

## Use Cases

| Scenario                          | Fit Score (1-10) | Rationale                                                          |
| --------------------------------- | ---------------- | ------------------------------------------------------------------ |
| Avoiding Redis licensing concerns | 10               | Apache 2.0 license vs Redis SSPL (restrictive for cloud providers) |
| AWS/Google Cloud deployments      | 10               | Native support from cloud providers                                |
| Drop-in Redis replacement         | 10               | 100% API compatible, no code changes                               |
| New projects (greenfield)         | 8                | Redis still more mature, but Valkey gaining momentum               |
| Existing Redis deployments        | 9                | Easy migration path (same protocol)                                |

## Trade-offs

### Strengths

- **Licensing:** Apache 2.0 (vs Redis SSPL restrictive licensing)
- **Cloud Provider Support:** AWS, Google, Oracle backing = future-proof
- **API Compatibility:** Drop-in replacement (no code changes)
- **Community:** Multi-vendor governance (vs Redis Labs control)

### Weaknesses

- **Ecosystem:** Newer (2024), fewer tutorials than Redis (as of 2026)
- **Modules:** Some Redis modules may not work (check compatibility)
- **Maturity:** Less battle-tested than Redis (though codebase is same)
- **Brand Recognition:** Developers more familiar with "Redis" name

## Implementation Pattern

```typescript
// Same Redis client works with Valkey
import { createClient } from "redis";

const client = createClient({
  url: "redis://valkey-server:6379", // Just change URL
});

await client.connect();

// All Redis commands work identically
await client.set("key", "value", { EX: 60 });
const value = await client.get("key");

// Pub/Sub (identical to Redis)
await client.subscribe("channel", (message) => {
  console.log(message);
});

// Data structures (identical)
await client.hSet("user:123", { name: "Alice", email: "alice@example.com" });
await client.lPush("queue", "task1", "task2");
```

## Migration from Redis

```bash
# 1. No code changes needed (100% compatible)

# 2. Update connection string
# Before: redis://redis-server:6379
# After:  redis://valkey-server:6379

# 3. Deploy Valkey
docker run -d -p 6379:6379 valkey/valkey

# 4. Optional: Replication for zero-downtime
# Configure Valkey as Redis replica → switch traffic → deprecate Redis
```

## Redis vs Valkey (2026)

| Aspect            | Redis              | Valkey               |
| ----------------- | ------------------ | -------------------- |
| **Performance**   | Sub-ms             | Identical ✅         |
| **API**           | Standard           | 100% compatible ✅   |
| **License**       | SSPL (restrictive) | Apache 2.0 ✅        |
| **Cloud Support** | Redis Labs managed | AWS/Google native ✅ |
| **Maturity**      | 15+ years ✅       | 2+ years             |
| **Ecosystem**     | Largest ✅         | Growing              |

## Alternatives

| Alternative     | When to Choose Instead                                                             |
| --------------- | ---------------------------------------------------------------------------------- |
| **Redis**       | Established deployments, mature ecosystem, no licensing concerns for your use case |
| **DragonflyDB** | Want Redis API with better multi-core scaling (different codebase)                 |
| **Memcached**   | Simpler caching (no data structures, persistence)                                  |

## References

- [Valkey Official Site](https://valkey.io/)
- [AWS ElastiCache Valkey Support](https://aws.amazon.com/elasticache/valkey/)
- [Redis vs Valkey Licensing Comparison](https://www.infoworld.com/article/3714245/valkey-project-forks-redis.html)
