---
name: tRPC
category: backend
last_updated: 2026-01-14
maturity: stable
---

# tRPC

## Overview

End-to-end type-safe RPC framework for TypeScript monorepos. No schema, no codegen—TypeScript types shared directly between client and server. Alternative to REST/GraphQL.

## Key Metrics

- **Type Safety:** 100% end-to-end (compile errors if API breaks)
- **Bundle Size:** ~10KB client (vs GraphQL ~50KB)
- **DX:** Auto-completion, no schema files, instant refactoring
- **Performance:** Similar to REST (HTTP transport)
- **Maturity:** v10+ (2023-2026), production-grade, T3 Stack default
- **Cost:** Free, open-source

## Use Cases

| Scenario                             | Fit Score (1-10) | Rationale                                                  |
| ------------------------------------ | ---------------- | ---------------------------------------------------------- |
| TypeScript monorepos (Next.js + API) | 10               | Zero-cost type safety (no GraphQL schema, no OpenAPI)      |
| Internal APIs (same codebase)        | 10               | Types shared directly (import server types in client)      |
| Rapid prototyping                    | 9                | No schema overhead (refactor server = client auto-updates) |
| Public APIs (third-party consumers)  | 3                | TypeScript-only (use REST/GraphQL for non-TS clients)      |
| Polyglot systems (Python + Node.js)  | 1                | TypeScript-only (use gRPC/REST)                            |

## Trade-offs

### Strengths

- **Type Safety:** Compile errors when API contract breaks
- **No Codegen:** Import server types directly (vs GraphQL codegen)
- **DX:** Auto-completion, rename function = rename everywhere
- **Performance:** HTTP/JSON (vs GraphQL parsing overhead)

### Weaknesses

- **TypeScript Only:** Can't use from Python, Go, mobile apps
- **Monorepo Required:** Server/client must share types (same repo)
- **Public APIs:** Not suitable for third-party consumers
- **Ecosystem:** Smaller than REST/GraphQL (newer technology)

## Implementation Pattern

```typescript
// server/router.ts (Server)
import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { db } from "./db";

const t = initTRPC.create();

export const appRouter = t.router({
  // Queries (read operations)
  getUserById: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, input.id),
      });
    }),

  // Mutations (write operations)
  createUser: t.procedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(2),
      })
    )
    .mutation(async ({ input }) => {
      const [user] = await db.insert(users).values(input).returning();
      return user;
    }),
});

export type AppRouter = typeof appRouter;

// app/api/trpc/[trpc]/route.ts (Next.js API Route)
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/router";

export const GET = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
  });
```

```typescript
// client/trpc.ts (Client Setup)
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/server/router";

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/api/trpc",
    }),
  ],
});

// components/UserProfile.tsx (Client Usage)
import { trpc } from "@/client/trpc";

export function UserProfile({ userId }: { userId: string }) {
  // Type-safe call (auto-completion, compile errors if API changes)
  const { data, isLoading } = trpc.getUserById.useQuery({ id: userId });

  if (isLoading) return <div>Loading...</div>;

  return <div>{data.name}</div>; // `data` is fully typed
}

// Mutation example
function CreateUser() {
  const mutation = trpc.createUser.useMutation();

  async function handleSubmit(data: { email: string; name: string }) {
    await mutation.mutateAsync(data); // Type-safe
  }
}
```

## tRPC vs REST vs GraphQL

| Aspect          | tRPC         | REST               | GraphQL          |
| --------------- | ------------ | ------------------ | ---------------- |
| **Type Safety** | Automatic ✅ | Manual (OpenAPI)   | Codegen required |
| **Public API**  | No (TS-only) | Yes ✅             | Yes ✅           |
| **Schema**      | None ✅      | OpenAPI (optional) | Required         |
| **Ecosystem**   | Growing      | Largest ✅         | Large ✅         |
| **Monorepo**    | Required     | No ✅              | No ✅            |

## When tRPC > GraphQL

| Scenario                | Why tRPC Wins                                  |
| ----------------------- | ---------------------------------------------- |
| **TypeScript monorepo** | No schema, no codegen (types auto-shared)      |
| **Rapid iteration**     | Refactor server function = client auto-updates |
| **Internal APIs**       | No public access needed (same codebase)        |

## Alternatives

| Alternative                  | When to Choose Instead                              |
| ---------------------------- | --------------------------------------------------- |
| **REST**                     | Public APIs, non-TypeScript clients, HTTP caching   |
| **GraphQL**                  | Flexible queries, multiple clients, need federation |
| **Server Actions (Next.js)** | Next.js-only, prefer framework integration          |

## References

- [tRPC Official Docs](https://trpc.io/)
- [tRPC vs GraphQL](https://trpc.io/docs/FAQ#how-does-trpc-compare-to-graphql)
- [T3 Stack (tRPC default)](https://create.t3.gg/)
