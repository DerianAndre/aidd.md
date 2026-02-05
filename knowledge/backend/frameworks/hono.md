---
name: Hono
category: backend
last_updated: 2026-01-14
maturity: stable
---

# Hono

## Overview

Ultrafast, lightweight web framework with multi-runtime support (Node.js, Bun, Deno, Cloudflare Workers). Built on web standards with TypeScript-first design. Modern Express alternative optimized for edge computing.

## Key Metrics

- **Performance:** ~80,000 requests/second (4x Express, Bun runtime)
- **Bundle Size:** ~12KB (vs Express ~200KB)
- **Multi-Runtime:** Node.js, Bun, Deno, Cloudflare Workers, Vercel Edge
- **DX:** Clean API, TypeScript-first, middleware chaining
- **Maturity:** 3+ years, production-ready, rapid adoption in 2026
- **Cost:** Free, open-source

## Use Cases

| Scenario                                         | Fit Score (1-10) | Rationale                                               |
| ------------------------------------------------ | ---------------- | ------------------------------------------------------- |
| Edge functions (Cloudflare Workers, Vercel Edge) | 10               | <1ms cold start, multi-runtime support                  |
| Bun runtime projects                             | 10               | Optimized for Bun, 80k req/s                            |
| Serverless APIs                                  | 9                | Lightweight, fast startup, small bundle                 |
| Traditional server apps                          | 8                | Works well, but NestJS/Fastify have stronger ecosystems |
| Enterprise with complex DI                       | 5                | Use NestJS for dependency injection                     |

## Trade-offs

### Strengths

- **Multi-Runtime:** Same code runs on Node.js, Bun, Deno, Workers
- **Performance:** 80k req/s on Bun (4x Express, faster than Fastify)
- **Lightweight:** 12KB bundle (vs Fastify ~50KB, Express ~200KB)
- **Web Standards:** Built on Request/Response (portable across runtimes)

### Weaknesses

- **Ecosystem:** Smaller than Express/Fastify (newer framework)
- **Middleware:** Fewer third-party middleware vs Express
- **No Opinionated Structure:** Simple API = need discipline for large apps
- **Learning Curve:** Different from Express patterns

## Implementation Pattern

```typescript
// src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());

// Zod validation
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

app.post("/users", zValidator("json", createUserSchema), async (c) => {
  const { email, name } = c.req.valid("json");

  const user = await db.insert({ email, name });

  return c.json(user, 201);
});

// Route groups
const api = new Hono();
api.get("/health", (c) => c.json({ status: "ok" }));
app.route("/api", api);

// Multi-runtime export
export default app; // Cloudflare Workers, Vercel Edge
// export default { fetch: app.fetch }; // Bun
```

## Multi-Runtime Example

```typescript
// Works on Node.js
import { serve } from "@hono/node-server";
serve(app);

// Works on Bun
export default app;

// Works on Cloudflare Workers
export default {
  fetch: app.fetch,
};

// Works on Deno
Deno.serve(app.fetch);
```

## Hono vs Alternatives

| Aspect            | Hono         | Fastify   | Express    |
| ----------------- | ------------ | --------- | ---------- |
| **Performance**   | 80k req/s ✅ | 60k req/s | 25k req/s  |
| **Bundle Size**   | 12KB ✅      | ~50KB     | ~200KB     |
| **Multi-Runtime** | Yes ✅       | No        | No         |
| **Ecosystem**     | Growing      | Large ✅  | Largest ✅ |
| **Edge Support**  | Excellent ✅ | No        | No         |

## Alternatives

| Alternative | When to Choose Instead                                       |
| ----------- | ------------------------------------------------------------ |
| **Fastify** | Node.js-only, need plugin ecosystem, schema validation       |
| **NestJS**  | Enterprise architecture, dependency injection, microservices |
| **Express** | Team familiar with Express, need large middleware ecosystem  |

## References

- [Hono Official Docs](https://hono.dev/)
- [Hono Multi-Runtime Support](https://hono.dev/top)
- [Hono vs Express vs Fastify](https://medium.com/hono-vs-express-vs-fastify-2026)
