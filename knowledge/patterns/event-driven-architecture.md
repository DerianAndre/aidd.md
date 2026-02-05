---
name: Event-Driven Architecture (EDA)
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# Event-Driven Architecture (EDA)

## Overview

Architectural pattern where services communicate asynchronously via events published to a message bus. Decouples producers from consumers, enabling independent scaling and resilience.

## Key Metrics

- **Scalability:** Near-infinite horizontal scaling (each service scales independently)
- **Latency:** Asynchronous (trade eventual consistency for throughput)
- **Complexity:** Higher operational overhead vs monolith
- **DX:** Requires event schema management, distributed tracing
- **Maturity:** Battle-tested at Netflix, Uber, Amazon scale

## Use Cases

| Scenario                       | Fit Score (1-10) | Rationale                                              |
| ------------------------------ | ---------------- | ------------------------------------------------------ |
| Video platform (YouTube-like)  | 10               | Upload → Transcode → Notify → Thumbnail Gen (parallel) |
| E-commerce order processing    | 9                | Order → Payment → Inventory → Shipping (async steps)   |
| Real-time notification systems | 10               | Decouple event source from delivery channels           |
| Simple CRUD apps               | 3                | Unnecessary complexity for synchronous workflows       |
| Microservices at scale         | 10               | Eliminates HTTP coupling, enables independent deploy   |

## Trade-offs

### Strengths

- **Decoupling:** Services don't know about each other (only events)
- **Scalability:** Each consumer scales independently
- **Resilience:** Failed consumers retry without blocking producers
- **Flexibility:** Add new consumers without modifying producers

### Weaknesses

- **Complexity:** Requires message broker (Kafka, RabbitMQ), monitoring
- **Debugging:** Distributed tracing essential (hard to follow event flow)
- **Eventual Consistency:** Not suitable for strong consistency requirements
- **Ordering:** Event order guarantees require careful design

## Implementation Patterns

### Event Bus Technologies

| Technology          | When to Use                                    |
| ------------------- | ---------------------------------------------- |
| **Apache Kafka**    | High throughput, event sourcing, log retention |
| **Rabbit MQ**       | Task queues, routing flexibility, lower scale  |
| **Redis Pub/Sub**   | Lightweight, ephemeral events (no persistence) |
| **AWS EventBridge** | Serverless, AWS-native integration             |

### Example Flow (Video Upload)

```
VideoUploadService publishes → VideoUploaded event
├─ TranscodeService consumes → Creates multiple quality versions
├─ NotificationService consumes → Sends email to uploader
├─ ThumbnailService consumes → Generates preview images
└─ AnalyticsService consumes → Logs upload metrics
```

## Alternatives

| Alternative                 | When to Choose Instead                                      |
| --------------------------- | ----------------------------------------------------------- |
| **REST APIs (Synchronous)** | Strong consistency required, simple request-response        |
| **GraphQL Federation**      | Complex querying across services, still need sync responses |
| **Monolith**                | Early-stage product, team <5 engineers                      |

## References

- [Building Scalable Microservices with Node.js and EDA](https://dev.to/dhrumitdk/building-scalable-microservices-with-nodejs-and-event-driven-architecture-4ckc)
- [Netflix Event-Driven Architecture](https://netflixtechblog.com/)
- [Martin Fowler - Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
