---
name: Deno
category: runtime
last_updated: 2026-01-14
maturity: stable
---

# Deno

## Overview

Security-first JavaScript/TypeScript runtime by Node.js creator Ryan Dahl. Restrictive-by-default permissions model and native web standards alignment for edge computing.

## Key Metrics

- **Performance:** ~40,000 requests/second (M2 hardware)
- **Cold Start:** ~100ms
- **Memory:** Similar to Bun (~150MB baseline)
- **DX:** Native TypeScript, web standards (fetch, Request, Response)
- **Maturity:** v1.0 released 2020, stable API surface
- **Cost:** Edge-optimized (Deno Deploy), pay-per-execution

## Use Cases

| Scenario                  | Fit Score (1-10) | Rationale                                         |
| ------------------------- | ---------------- | ------------------------------------------------- |
| Security-critical apps    | 10               | Permissions model prevents unauthorized access    |
| Edge computing            | 10               | Deploy integration, ~100ms cold start             |
| Multi-tenant platforms    | 9                | Sandboxed execution for untrusted code            |
| Utility scripts           | 9                | No package.json, URL imports, single executable   |
| Legacy npm-heavy projects | 5                | npm compatibility via compat layer (not seamless) |

## Trade-offs

### Strengths

- **Security:** Explicit --allow-net, --allow-read permissions (default deny)
- **Web Standards:** fetch, WebSocket, Worker APIs built-in
- **TypeScript:** First-class support without transpilation
- **Edge Performance:** Optimized for Deno Deploy, Cloudflare Workers

### Weaknesses

- **Ecosystem:** JSR (Deno registry) smaller than npm
- **npm Compatibility:** Works via node_modules compat mode but not seamless
- **Adoption:** Smaller community vs Node.js/Bun
- **Throughput:** 40k req/s (middle ground between Node.js and Bun)

## Alternatives

| Alternative | When to Choose Instead                                          |
| ----------- | --------------------------------------------------------------- |
| **Node.js** | Need npm ecosystem without friction, enterprise LTS support     |
| **Bun**     | Maximum throughput critical, integrated toolchain for dev speed |

## References

- [Deno Security Model](https://deno.land/manual/getting_started/permissions)
- [Node.js vs Bun vs Deno (2025)](https://dev.to/hamzakhan/nodejs-vs-bun-vs-deno-who-rules-the-server-in-2025-gl0)
- [Deno Deploy Performance](https://deno.com/deploy/docs)
