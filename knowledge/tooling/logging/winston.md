---
name: Winston
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# Winston

## Overview

Production-grade logging library for Node.js with multiple transports (console, file, HTTP, databases). Industry standard for backend logging. Alternative to Pino with richer features and ecosystem.

## Key Metrics

- **Features:** Multiple transports, log levels, formatting, exception handling
- **Performance:** ~10k logs/second (vs Pino ~50k)
- **Ecosystem:** Large plugin ecosystem, mature integrations
- **Maturity:** 10+ years, battle-tested
- **Cost:** Free, open-source

## Use Cases

| Scenario                               | Fit Score (1-10) | Rationale                                               |
| -------------------------------------- | ---------------- | ------------------------------------------------------- |
| Production backend apps                | 10               | Structured logging, multiple transports, error tracking |
| Need log aggregation (Datadog, Splunk) | 10               | Built-in transports for external services               |
| Complex logging requirements           | 9                | Custom formats, metadata, exception handling            |
| Performance-critical (high throughput) | 6                | Use Pino (5-10x faster)                                 |
| Simple console logging                 | 5                | Native `console.log` may suffice                        |

## Trade-offs

### Strengths

- **Transports:** Console, file, HTTP, MongoDB, Elasticsearch, Datadog
- **Levels:** error, warn, info, http, verbose, debug, silly
- **Formats:** JSON, simple, colorize, custom
- **Exception Handling:** Uncaught exception + rejection logging

### Weaknesses

- **Performance:** ~10k logs/sec (vs Pino ~50k)
- **Complexity:** More config than Pino
- **Bundle Size:** Larger than minimal loggers
- **Overhead:** For simple apps, may be over-engineered

## Implementation Pattern

```bash
npm install winston
```

```typescript
// lib/logger.ts
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console (development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // File (production)
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: "logs/rejections.log" }),
  ],
});

export default logger;

// Usage
import logger from "./lib/logger";

logger.info("User logged in", { userId: 123, email: "user@example.com" });
logger.error("Failed to fetch data", { error: err.message, stack: err.stack });
logger.debug("Debugging info", { data: someObject });
```

## Winston vs Alternatives

| Aspect          | Winston  | Pino        | console.log  |
| --------------- | -------- | ----------- | ------------ |
| **Performance** | ~10k/sec | ~50k/sec ✅ | Slowest      |
| **Transports**  | Many ✅  | Few         | Console only |
| **Ecosystem**   | Large ✅ | Growing     | N/A          |
| **Complexity**  | High     | Low ✅      | Lowest ✅    |
| **Features**    | Rich ✅  | Minimal     | Basic        |

## Alternatives

| Alternative     | When to Choose Instead                                |
| --------------- | ----------------------------------------------------- |
| **Pino**        | Performance-critical, high throughput, minimal config |
| **console.log** | Simple scripts, development, no production logging    |
| **Bunyan**      | Similar to Winston, prefer Bunyan's API               |

## References

- [Winston Official Docs](https://github.com/winstonjs/winston)
- [Winston Transports](https://github.com/winstonjs/winston/blob/master/docs/transports.md)
- [Winston vs Pino Performance](https://medium.com/winston-vs-pino-logging-2026)
