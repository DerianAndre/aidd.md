---
name: Bun
category: runtime
last_updated: 2026-01-14
maturity: emerging
---

# Bun

## Overview

High-performance JavaScript/TypeScript runtime built on JavaScriptCore and Zig, designed for maximum throughput and minimal cold starts. Includes built-in package manager, bundler, and test runner.

## Key Metrics

- **Performance:** ~70,000 requests/second (M2 hardware, Hello World benchmark)
- **Cold Start:** ~50ms (vs ~200ms Node.js)
- **Memory:** 2-3x more efficient than Node.js for I/O-heavy workloads
- **DX:** All-in-one toolchain (package manager 29x faster than npm install)
- **Maturity:** Rapidly evolving, 95%+ npm package compatibility
- **Cost:** Reduced infrastructure costs due to higher throughput/instance

## Use Cases

| Scenario                           | Fit Score (1-10) | Rationale                                      |
| ---------------------------------- | ---------------- | ---------------------------------------------- |
| High-throughput microservices      | 10               | 70k req/s vs 25k (Node.js) = 2.8x improvement  |
| Serverless functions               | 9                | 50ms cold start critical for Lambda/Edge       |
| Local development tooling          | 10               | Unified toolchain eliminates npm/webpack/jest  |
| Legacy codebases with obscure deps | 6                | 5% incompatibility risk with niche C++ modules |
| Production monoliths (2026)        | 7                | Ecosystem gaps for some enterprise libs        |

## Trade-offs

### Strengths

- **Throughput:** 2.8x faster than Node.js in HTTP benchmarks
- **Tooling Integration:** Single binary replaces npm, webpack, jest, tsx
- **Memory Efficiency:** Lower baseline memory (~100MB vs ~300MB Node.js)
- **TypeScript:** Native execution without transpilation step

### Weaknesses

- **Ecosystem Maturity:** Not all Node.js APIs fully implemented (as of 2026)
- **Breaking Changes:** Rapid iteration may introduce instability (v1.x)
- **Debugging Tools:** Less mature than Node.js ecosystem (Chrome DevTools)
- **Enterprise Support:** Limited compared to Node.js (no LTS policy yet)

## Alternatives

| Alternative | When to Choose Instead                                                 |
| ----------- | ---------------------------------------------------------------------- |
| **Node.js** | Legacy compatibility critical, need LTS guarantees, C++ native modules |
| **Deno**    | Security-first (permissions model), Edge deployment with Deno Deploy   |

## References

- [Bun vs Node.js vs Deno Benchmark (2025)](https://dev.to/hamzakhan/nodejs-vs-bun-vs-deno-who-rules-the-server-in-2025-gl0)
- [Why Choose Bun (2026)](https://lalatenduswain.medium.com/why-choose-bun-over-node-js-deno-and-other-javascript-runtimes-in-late-2026-121f25f208eb)
- [Official Bun Documentation](https://bun.sh/docs)
