---
name: Fastify
category: backend
last_updated: 2026-01-14
maturity: stable
---

# Fastify

## Overview

High-performance Node.js web framework optimized for speed and low overhead. Schema-based validation, plugin architecture, and TypeScript support. Performance champion (2-4x faster than Express).

## Key Metrics

- **Performance:** ~60,000 requests/second (vs Express ~25k, NestJS ~25k)
- **Overhead:** Minimal (vs Express/NestJS abstraction layers)
- **DX:** Schema validation (JSON Schema), decorators support, excellent plugin ecosystem
- **Maturity:** 7+ years, production-grade, wide adoption
- **Cost:** Free, open-source

## Use Cases

| Scenario                                 | Fit Score (1-10) | Rationale                                           |
| ---------------------------------------- | ---------------- | --------------------------------------------------- |
| High-traffic APIs                        | 10               | 2-4x faster than Express, low overhead              |
| Microservices                            | 9                | Fast startup, small footprint, plugin extensibility |
| Real-time applications (WebSockets, SSE) | 9                | Low latency, efficient event handling               |
| Enterprise with complex architecture     | 7                | Use NestJS for DI/modules (can use Fastify adapter) |
| Serverless/Edge                          | 8                | Fast cold starts, lightweight                       |

## Trade-offs

### Strengths

- **Speed:** 60k req/s (2-4x Express), optimized request lifecycle
- **Schema Validation:** Built-in JSON Schema validation (request/response)
- **Plugin System:** Robust encapsulation, scope isolation
- **TypeScript:** First-class support, type-safe schemas

### Weaknesses

- **Learning Curve:** Different from Express (plugin scoping, lifecycle)
- **Ecosystem:** Smaller than Express (though growing fast)
- **No Opinionated Structure:** Freedom requires discipline (vs NestJS modules)
- **Manual DI:** No dependency injection (vs NestJS)

## Implementation Pattern

```bash
npm install fastify @fastify/cors @fastify/jwt
```

```typescript
// server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";

const fastify = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

// CORS
await fastify.register(cors);

// Schema-based route
fastify.post(
  "/users",
  {
    schema: {
      body: Type.Object({
        email: Type.String({ format: "email" }),
        name: Type.String({ minLength: 2 }),
      }),
      response: {
        201: Type.Object({
          id: Type.Number(),
          email: Type.String(),
          name: Type.String(),
        }),
      },
    },
  },
  async (request, reply) => {
    const { email, name } = request.body;

    // Auto-validated by schema
    const user = await db.insert({ email, name });

    reply.status(201).send(user);
  }
);

// Plugin example
fastify.register(async (fastify) => {
  fastify.get("/health", async () => {
    return { status: "ok" };
  });
});

await fastify.listen({ port: 3000, host: "0.0.0.0" });
```

## Fastify vs Alternatives

| Aspect           | Fastify        | Express      | NestJS          |
| ---------------- | -------------- | ------------ | --------------- |
| **Performance**  | 60k req/s ✅   | 25k req/s    | 25k req/s       |
| **Validation**   | Built-in ✅    | Manual (Zod) | Class-validator |
| **Plugins**      | Scoped ✅      | Middleware   | Modules ✅      |
| **Architecture** | Minimal        | Minimal      | Enterprise ✅   |
| **TypeScript**   | First-class ✅ | Supported    | First-class ✅  |

## Alternatives

| Alternative | When to Choose Instead                                         |
| ----------- | -------------------------------------------------------------- |
| **NestJS**  | Need enterprise architecture (DI, modules), team >10 engineers |
| **Hono**    | Edge/serverless, multi-runtime, even faster                    |
| **Express** | Team familiar with Express, large middleware ecosystem         |

## References

- [Fastify Official Docs](https://fastify.dev/)
- [Fastify vs Express Performance](https://medium.com/deno-the-complete-reference/fastify-vs-express-2026-performance-comparison)
- [Fastify Plugin Ecosystem](https://fastify.dev/ecosystem/)
