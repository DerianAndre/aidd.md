---
name: OpenTelemetry
category: infrastructure
last_updated: 2026-01-14
maturity: stable
---

# OpenTelemetry

## Overview

Vendor-neutral observability framework for collecting traces, metrics, and logs. Modern standard replacing proprietary agents (Datadog, New Relic). CNCF graduated project.

## Key Metrics

- **Vendor Lock-in:** Zero (export to any backend)
- **Overhead:** <5% performance impact (auto-instrumentation)
- **DX:** SDKs for all major languages, auto-instrumentation
- **Maturity:** v1.0+ (2023), production-ready, CNCF backing
- **Cost:** Free framework (pay only for backend storage)

## Use Cases

| Scenario                            | Fit Score (1-10) | Rationale                                               |
| ----------------------------------- | ---------------- | ------------------------------------------------------- |
| Microservices (distributed tracing) | 10               | Trace requests across 100+ services                     |
| Avoiding vendor lock-in             | 10               | Switch backends (Jaeger → Grafana) without code changes |
| Multi-language systems              | 9                | Unified observability (Node.js, Python, Go)             |
| Serverless architectures            | 8                | Works but cold start overhead                           |
| Teams with existing APM (Datadog)   | 7                | Migration effort, but future-proofs                     |

## Trade-offs

### Strengths

- **Vendor-Neutral:** Export to Jaeger, Prometheus, Grafana, ClickHouse
- **Standardized:** Single API across languages (no proprietary SDKs)
- **Auto-Instrumentation:** HTTP, DB queries traced automatically
- **Future-Proof:** Industry standard (CNCF, backed by Google/Microsoft)

### Weaknesses

- **Complexity:** Configuration overhead (exporters, samplers, collectors)
- **Learning Curve:** Tracing concepts (spans, traces, context propagation)
- **Cold Start:** Serverless initialization overhead (mitigated in 2026)
- **Backend Required:** Need storage (Jaeger, Tempo, ClickHouse)

## Alternatives

| Alternative       | When to Choose Instead                          |
| ----------------- | ----------------------------------------------- |
| **Datadog Agent** | Want batteries-included SaaS (no backend setup) |
| **New Relic**     | Legacy contract, not concerned about lock-in    |
| **Console.log**   | Simple debugging, not production monitoring     |

## References

- [OpenTelemetry Official Docs](https://opentelemetry.io/docs/)
- [OpenTelemetry NestJS Guide (2026)](https://signoz.io/blog/opentelemetry-nestjs/)
- [Distributed Tracing for NestJS](https://medium.com/@qaribhaider/distributed-tracing-for-nestjs-microservices-with-opentelemetry-and-jaeger-540692c51a55)
