---
name: Pino
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# Pino

## Overview

Ultrafast JSON logger for Node.js optimized for performance and low overhead. 5-10x faster than Winston. Minimal API with worker-based log processing. Performance-critical alternative to Winston.

## Key Metrics

- **Performance:** ~50,000 logs/second (vs Winston ~10k)
- **Overhead:** Minimal (asynchronous logging)
- **Format:** JSON-only (structured logging)
- **Maturity:** 8+ years, production-grade
- **Cost:** Free, open-source

## Use Cases

| Scenario                    | Fit Score (1-10) | Rationale                                        |
| --------------------------- | ---------------- | ------------------------------------------------ |
| High-throughput APIs        | 10               | 5-10x faster than Winston, minimal overhead      |
| Performance-critical        | 10               | Async logging = non-blocking                     |
| Structured logging (JSON)   | 10               | JSON-only format for log aggregation             |
| Need many transports        | 6                | Use Winston (Pino has fewer built-in transports) |
| Development (readable logs) | 7                | JSON = less human-readable (use pino-pretty)     |

## Trade-offs

### Strengths

- **Speed:** 50k logs/sec (5-10x Winston)
- **Low Overhead:** Async processing, minimal blocking
- **Structured:** JSON-only for log aggregation (Datadog, Elasticsearch)
- **Child Loggers:** Inherit context, efficient

### Weaknesses

- **Fewer Transports:** Limited built-in (use pino-transport)
- **JSON-Only:** Less readable in development (use pino-pretty)
- **Simpler Features:** vs Winston's rich ecosystem
- **Learning Curve:** Different API from Winston

## Implementation Pattern

```bash
npm install pino pino-pretty
```

```typescript
// lib/logger.ts
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined, // Production: raw JSON
});

export default logger;

// Usage
import logger from "./lib/logger";

logger.info({ userId: 123, email: "user@example.com" }, "User logged in");
logger.error({ err }, "Failed to fetch data");
logger.debug({ data: someObject }, "Debugging");

// Child logger (inherit context)
const childLogger = logger.child({ requestId: "123-456" });
childLogger.info("Request started"); // Includes requestId
```

## Pino vs Alternatives

| Aspect          | Pino        | Winston     | console.log |
| --------------- | ----------- | ----------- | ----------- |
| **Performance** | ~50k/sec ✅ | ~10k/sec    | Slowest     |
| **Overhead**    | Minimal ✅  | Higher      | High        |
| **Format**      | JSON ✅     | Multiple    | Plain text  |
| **Ecosystem**   | Growing     | Large ✅    | N/A         |
| **DX (dev)**    | pino-pretty | Colorize ✅ | Native ✅   |

## Alternatives

| Alternative     | When to Choose Instead                              |
| --------------- | --------------------------------------------------- |
| **Winston**     | Need many transports, richer features, familiar API |
| **console.log** | Simple scripts, development only                    |
| **Bunyan**      | Similar performance, prefer Bunyan's API            |

## References

- [Pino Official Docs](https://getpino.io/)
- [Pino vs Winston Benchmark](https://github.com/pinojs/pino/blob/master/docs/benchmarks.md)
- [Pino Best Practices](https://getpino.io/#/docs/best-practices)
