---
name: Server Actions (Next.js)
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# Server Actions (Next.js)

## Overview

Zero-API pattern in Next.js App Router enabling server-side mutations directly from React components. Replaces traditional API routes with server functions marked with `'use server'`.

## Key Metrics

- **DX:** No API boilerplate (direct function calls from client)
- **Type Safety:** End-to-end TypeScript without codegen
- **Performance:** Eliminates HTTP round-trip for server-side validation
- **Bundle Size:** Zero client JS for server code
- **Maturity:** Stable in Next.js 13+ (2023), production-ready

## Use Cases

| Scenario                         | Fit Score (1-10) | Rationale                                                  |
| -------------------------------- | ---------------- | ---------------------------------------------------------- |
| Form submissions (contact, auth) | 10               | Progressive enhancement, works without JS                  |
| Data mutations (CRUD operations) | 10               | Direct database access from components                     |
| Server-side validation           | 9                | Validate before DB query (no client-side bypass)           |
| Public APIs (third-party access) | 2                | Use REST/GraphQL instead (Server Actions are Next.js-only) |
| Complex workflows (multi-step)   | 7                | Works but can become nested/complex                        |

## Trade-offs

### Strengths

- **Zero API Layer:** No `/api` routes needed (call server functions directly)
- **Type Safety:** TypeScript types shared client/server (no OpenAPI schema)
- **Progressive Enhancement:** Forms work without JavaScript
- **Server-Side Validation:** Prevent client-side bypass of validation rules

### Weaknesses

- **Next.js Only:** Not portable to other frameworks (vendor lock-in)
- **Testing:** Harder to test than REST endpoints (request/response paradigm)
- **Caching:** Requires `revalidatePath`/`revalidateTag` (vs HTTP caching)
- **Public APIs:** Can't expose to third-party consumers

## Implementation Pattern

```typescript
// app/actions/user.ts
"use server"; // Marks this file as server-only

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export async function createUser(formData: FormData) {
  // 1. Validate input
  const parsed = createUserSchema.parse({
    email: formData.get("email"),
    name: formData.get("name"),
  });

  // 2. Server-side business logic
  const existing = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, parsed.email),
  });

  if (existing) {
    return { error: "Email already exists" };
  }

  // 3. Direct database access
  const [user] = await db.insert(users).values(parsed).returning();

  // 4. Revalidate cache
  revalidatePath("/users");

  return { success: true, user };
}

// app/users/new/page.tsx (Client Component)
("use client");

import { createUser } from "@/app/actions/user";

export default function NewUserPage() {
  async function handleSubmit(formData: FormData) {
    const result = await createUser(formData); // Direct call

    if (result.error) {
      alert(result.error);
    } else {
      router.push("/users");
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="email" type="email" required />
      <input name="name" type="text" required />
      <button type="submit">Create User</button>
    </form>
  );
}
```

## Progressive Enhancement (No JS)

```typescript
// Works without client JavaScript
<form action={createUser}>
  {" "}
  {/* Native HTML form action */}
  <input name="email" type="email" required />
  <button type="submit">Submit</button>
</form>
```

## Server Actions vs API Routes

| Aspect          | Server Actions    | API Routes                       |
| --------------- | ----------------- | -------------------------------- |
| **Boilerplate** | Minimal ✅        | High (request/response handling) |
| **Type Safety** | Automatic ✅      | Manual (OpenAPI schemas)         |
| **Caching**     | `revalidatePath`  | HTTP headers ✅                  |
| **Public API**  | No (Next.js only) | Yes ✅                           |
| **Testing**     | Component-level   | Endpoint-level ✅                |

## Alternatives

| Alternative           | When to Choose Instead                                        |
| --------------------- | ------------------------------------------------------------- |
| **API Routes (REST)** | Need public API, third-party access, HTTP caching             |
| **tRPC**              | Want type safety without Next.js lock-in (framework-agnostic) |
| **GraphQL**           | Complex querying needs, multiple clients                      |

## References

- [Next.js Server Actions Docs](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Exploring Next.js 15 and Server Actions](https://dev.to/brayancodes/exploring-nextjs-15-and-server-actions-features-and-best-practices-1393)
- [Server Actions Best Practices](https://www.fullstack.com/labs/resources/blog/best-practices-for-scalable-secure-react-node-js-apps-in-2025)
