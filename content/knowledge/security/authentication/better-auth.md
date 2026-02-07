---
name: Better Auth
category: security
last_updated: 2026-01-15
maturity: stable
---

# Better Auth

## Overview

A modern, framework-agnostic authentication library that serves as a successor to patterns found in NextAuth/Auth.js. It focuses on better TypeScript support, cleaner APIs, and improved performance.

## Key Metrics

- **Foundations:** TypeScript-first, Database-first
- **Approaches:** Traditional Sessions + JWT support
- **Compatibility:** Next.js, Remix, Nitro, Hono, etc.
- **Maturity:** Rapidly rising in late 2024-2026 (Modern choice)
- **Cost:** Free, open-source

## Use Cases

| Scenario                                | Fit Score (1-10) | Rationale                                                     |
| --------------------------------------- | ---------------- | ------------------------------------------------------------- |
| New Next.js / Hono projects             | 10               | Designed specifically for modern edge-ready runtimes          |
| Complex Database Auth                   | 9                | Deeply integrated with Prisma, Drizzle, etc.                  |
| Teams tired of Auth.js v4-v5 complexity | 10               | Simplified API and better TypeScript inference                |
| Legacy PHP/Java migrations              | 6                | Modern TS focus makes integration with non-JS backends harder |

## Trade-offs

### Strengths

- **Native TypeScript:** Doesn't feel like a port from a non-typed world.
- **Plugins:** Modular architecture allows adding Two-Factor (2FA), Magic Links, and Social login as needed.
- **Database Adapters:** Optimized for modern ORMs like Drizzle.

### Weaknesses

- **Younger Ecosystem:** Fewer community tutorials than NextAuth.
- **Moving Target:** API evolving quickly as it gains traction in 2026.

## Implementation Pattern

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    schema: {
      user: "users",
      session: "sessions",
      account: "accounts",
      verification: "verifications",
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
});
```

## Comparisons

| Aspect       | Better Auth    | Auth.js                     | Clerk         |
| ------------ | -------------- | --------------------------- | ------------- |
| **TS Logic** | Native ✅      | Improving                   | Excellent ✅  |
| **Runtime**  | Agnostic ✅    | React-heavy (traditionally) | SaaS          |
| **API**      | Function-based | Middleware-heavy            | Components ✅ |

## References

- [Better Auth Official](https://www.better-auth.com/)
- [Better Auth GitHub](https://github.com/better-auth/better-auth)
- [Modern Auth Comparison](https://www.better-auth.com/docs/concepts/comparison)
