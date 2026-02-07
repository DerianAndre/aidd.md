---
name: Cloudflare Workers
category: infrastructure
last_updated: 2026-01-14
maturity: stable
---

# Cloudflare Workers

## Overview

Edge compute platform running JavaScript/TypeScript on Cloudflare's global network (300+ locations). Sub-millisecond cold starts, V8 isolates (not containers). Serverless alternative to AWS Lambda.

## Key Metrics

- **Cold Start:** <1ms (vs AWS Lambda 50-200ms)
- **Global Distribution:** 300+ edge locations automatically
- **Pricing:** 100k requests/day free, then $0.50 per million
- **Memory:** 128MB limit (vs Lambda 10GB)
- **Duration:** 30s CPU time limit (vs Lambda 15 minutes)
- **Maturity:** 7+ years, production-grade, powers millions of sites

## Use Cases

| Scenario                                   | Fit Score (1-10) | Rationale                             |
| ------------------------------------------ | ---------------- | ------------------------------------- |
| Edge APIs (low latency critical)           | 10               | <1ms cold start, global distribution  |
| Static site transformation (resize images) | 10               | Process at edge, close to users       |
| A/B testing / feature flags                | 9                | Low latency, modify responses at edge |
| Long-running tasks (video encoding)        | 2                | 30s CPU limit (use Lambda)            |
| Memory-intensive (ML inference)            | 4                | 128MB limit restrictive               |

## Trade-offs

### Strengths

- **Cold Start:** <1ms (V8 isolates vs containers)
- **Global:** Auto-deployed to 300+ locations (vs Lambda regional)
- **Cost:** $0.50/million requests (vs Lambda $0.20 + compute)
- **DX:** Wrangler CLI, integrated KV/D1/R2 storage

### Weaknesses

- **Memory Limit:** 128MB (vs Lambda 10GB)
- **CPU Time:** 30s limit (vs Lambda 15 minutes)
- **Ecosystem:** Smaller than Lambda (Node.js modules may not work)
- **Debugging:** Harder than traditional serverless (distributed logs)

## Implementation Pattern

```typescript
// worker.ts
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Edge routing
    if (url.pathname === "/api/users") {
      return handleUsers(request, env);
    }

    // Default response
    return new Response("Not Found", { status: 404 });
  },
};

// Handler
async function handleUsers(request: Request, env: Env) {
  if (request.method === "GET") {
    // Query D1 (SQLite at edge)
    const { results } = await env.DB.prepare(
      "SELECT * FROM users LIMIT 10"
    ).all();

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method === "POST") {
    const body = await request.json();

    // Insert to D1
    await env.DB.prepare("INSERT INTO users (email, name) VALUES (?, ?)")
      .bind(body.email, body.name)
      .run();

    return new Response("Created", { status: 201 });
  }
}
```

## Cloudflare Stack

| Service             | Purpose                                  |
| ------------------- | ---------------------------------------- |
| **Workers**         | Compute (edge functions)                 |
| **D1**              | SQLite database at edge                  |
| **KV**              | Key-value storage (eventual consistency) |
| **R2**              | Object storage (S3-compatible)           |
| **Durable Objects** | Stateful WebSocket connections           |

## Comparison with AWS Lambda

| Aspect                  | Cloudflare Workers | AWS Lambda                 |
| ----------------------- | ------------------ | -------------------------- |
| **Cold Start**          | <1ms ✅            | 50-200ms                   |
| **Global Distribution** | Automatic ✅       | Manual (Lambda@Edge)       |
| **Memory Limit**        | 128MB              | 10GB ✅                    |
| **Duration**            | 30s CPU            | 15 min ✅                  |
| **Pricing**             | $0.50/million      | $0.20/million + compute ✅ |
| **Ecosystem**           | Growing            | Largest ✅                 |

## When to Choose Workers Over Lambda

| Scenario                    | Why Workers Win                        |
| --------------------------- | -------------------------------------- |
| **Global users**            | 300+ locations vs Lambda single region |
| **Low latency**             | <1ms cold start vs 50-200ms            |
| **Edge processing**         | Image resize, A/B testing at edge      |
| **Static site enhancement** | Modify HTML at edge (no origin hit)    |

## Alternatives

| Alternative               | When to Choose Instead                              |
| ------------------------- | --------------------------------------------------- |
| **AWS Lambda**            | Need >128MB memory, >30s CPU time, larger ecosystem |
| **Vercel Edge Functions** | Next.js-focused, prefer Vercel ecosystem            |
| **Deno Deploy**           | Prefer Deno runtime, similar edge model             |

## References

- [Cloudflare Workers Official Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare vs AWS Lambda Performance](https://blog.cloudflare.com/serverless-performance-comparison-workers-lambda/)
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
