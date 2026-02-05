---
name: HyperDX
category: infrastructure
last_updated: 2026-01-14
maturity: emerging
---

# HyperDX

## Overview

Open-source observability platform built on ClickHouse for high-cardinality data. Modern alternative to Datadog/New Relic with OpenTelemetry-native integration and self-hostable deployment.

## Key Metrics

- **Performance:** ClickHouse backend = handles billions of events
- **Cost:** Self-hosted (free) or cloud ($0.10/GB ingested vs Datadog $15-20/GB)
- **Cardinality:** Handles high-cardinality data (user IDs, trace IDs) without cost explosion
- **DX:** OpenTelemetry-native, session replay, distributed tracing
- **Maturity:** Emerging (2023+), production-ready, growing adoption

## Use Cases

| Scenario                                      | Fit Score (1-10) | Rationale                                         |
| --------------------------------------------- | ---------------- | ------------------------------------------------- |
| High-cardinality data (traces, user sessions) | 10               | ClickHouse optimized for high-cardinality queries |
| Cost-conscious teams                          | 10               | Self-host or cloud at 1/150th Datadog cost        |
| OpenTelemetry-first architecture              | 10               | Native OTel integration (no proprietary agents)   |
| Enterprise compliance (SOC 2)                 | 6                | Datadog more mature for compliance                |
| Teams without DevOps expertise                | 5                | Self-hosting requires infrastructure management   |

## Trade-offs

### Strengths

- **Cost:** 1/150th Datadog cost (self-hosted) or 1/15th (cloud)
- **Open Source:** Self-hostable, no vendor lock-in
- **ClickHouse:** Handles high-cardinality data (millions of unique trace IDs)
- **Session Replay:** Built-in (vs Datadog's paid addon)

### Weaknesses

- **Maturity:** Newer than Datadog/New Relic (smaller community)
- **Self-Hosting Overhead:** Requires managing ClickHouse, Kafka, Redis
- **Alerting:** Less sophisticated than Datadog PagerDuty integration
- **Ecosystem:** Fewer integrations than mature APM tools

## Implementation Pattern

```yaml
# docker-compose.yml (self-hosted)
version: "3.8"
services:
  hyperdx:
    image: hyperdx/hyperdx:latest
    ports:
      - "8080:8080"
    environment:
      OTEL_EXPORTER_OTLP_ENDPOINT: http://localhost:4318

  clickhouse:
    image: clickhouse/clickhouse-server
    volumes:
      - clickhouse_data:/var/lib/clickhouse
```

```typescript
// OpenTelemetry setup (Node.js)
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: "https://in-otel.hyperdx.io/v1/traces", // HyperDX cloud
    headers: {
      Authorization: `Bearer ${process.env.HYPERDX_API_KEY}`,
    },
  }),
});

sdk.start();
```

## Cost Comparison (100GB/month)

| Service                   | Monthly Cost | Notes                                   |
| ------------------------- | ------------ | --------------------------------------- |
| **HyperDX (self-hosted)** | ~$50         | Infrastructure only (ClickHouse on AWS) |
| **HyperDX Cloud**         | ~$100        | Managed ($0.10/GB)                      |
| **Datadog**               | ~$1,500      | $15/GB ingested                         |
| **New Relic**             | ~$1,000      | Tiered pricing                          |

## Alternatives

| Alternative                | When to Choose Instead                                    |
| -------------------------- | --------------------------------------------------------- |
| **Datadog**                | Enterprise, need compliance certifications, larger budget |
| **Grafana + Tempo + Loki** | Want full control, already using Grafana ecosystem        |
| **SigNoz**                 | Similar open-source alternative (also ClickHouse-based)   |

## References

- [HyperDX Official Docs](https://www.hyperdx.io/docs)
- [Top Infrastructure Monitoring Tools (2026)](https://clickhouse.com/resources/engineering/top-infrastructure-monitoring-tools-comparison)
- [Data Observability Tools (2026)](https://www.ovaledge.com/blog/data-observability-tools/)
