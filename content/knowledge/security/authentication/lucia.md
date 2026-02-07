---
name: Lucia Auth
category: security
last_updated: 2026-01-14
maturity: stable
---

# Lucia Auth

## Overview

Minimalist TypeScript-first authentication library focused on session management. Provides low-level primitives for custom auth flows. Alternative to Auth.js for developers needing full control.

## Key Metrics

- **Bundle Size:** ~5KB (vs Auth.js ~20KB)
- **DX:** TypeScript-first, minimal API, framework-agnostic
- **Flexibility:** Full control over auth logic (vs Auth.js opinionated)
- **Maturity:** 3+ years, production-ready
- **Cost:** Free, open-source

## Use Cases

| Scenario                              | Fit Score (1-10) | Rationale                                       |
| ------------------------------------- | ---------------- | ----------------------------------------------- |
| Custom auth flows (MFA, passwordless) | 10               | Low-level primitives = full flexibility         |
| TypeScript-first projects             | 10               | Type-safe session management, database adapters |
| Framework-agnostic                    | 9                | Works with Next.js, SvelteKit, Astro, etc.      |
| Need simple OAuth setup               | 5                | Use Auth.js (80+ providers built-in)            |
| Want pre-built UI                     | 2                | Use Clerk (Lucia is headless)                   |

## Trade-offs

### Strengths

- **Lightweight:** ~5KB (vs Auth.js ~20KB)
- **TypeScript-First:** Strong typing, type-safe sessions
- **Full Control:** Implement custom flows (magic links, WebAuthn)
- **Database Agnostic:** Adapters for Prisma, Drizzle, MongoDB

### Weaknesses

- **Manual Setup:** No built-in OAuth providers (vs Auth.js 80+)
- **Learning Curve:** Low-level API requires understanding auth concepts
- **No Pre-built UI:** Headless (vs Clerk components)
- **Smaller Ecosystem:** Fewer integrations than Auth.js

## Implementation Pattern

```bash
npm install lucia
```

```typescript
// lib/auth.ts
import { Lucia } from "lucia";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { db, sessionTable, userTable } from "./db";

const adapter = new DrizzleSQLiteAdapter(db, sessionTable, userTable);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      name: attributes.name,
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      name: string;
    };
  }
}
```

```typescript
// app/actions/auth.ts
"use server";
import { lucia } from "@/lib/auth";
import { cookies } from "next/headers";
import { hash, verify } from "@node-rs/argon2";

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const passwordHash = await hash(password);
  const userId = await db.insert(user).values({ email, passwordHash });

  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const user = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (!user) throw new Error("Invalid credentials");

  const validPassword = await verify(user.passwordHash, password);
  if (!validPassword) throw new Error("Invalid credentials");

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
}
```

## Lucia vs Alternatives

| Aspect          | Lucia   | Auth.js     | Clerk       |
| --------------- | ------- | ----------- | ----------- |
| **Bundle Size** | ~5KB ✅ | ~20KB       | ~50KB       |
| **Control**     | Full ✅ | High        | Medium      |
| **Setup**       | Complex | Moderate    | Easy ✅     |
| **OAuth**       | Manual  | Built-in ✅ | Built-in ✅ |
| **Cost**        | Free ✅ | Free ✅     | Paid        |

## Alternatives

| Alternative       | When to Choose Instead                              |
| ----------------- | --------------------------------------------------- |
| **Auth.js**       | Need OAuth providers (Google, GitHub), faster setup |
| **Clerk**         | Want pre-built UI, easy MFA, willing to pay         |
| **Supabase Auth** | Using Supabase, want integrated solution            |

## References

- [Lucia Auth Official Docs](https://lucia-auth.com/)
- [Lucia vs Auth.js](https://lucia-auth.com/guides/comparison)
- [Building Auth with Lucia](https://www.youtube.com/watch?v=lucia-tutorial-2026)
