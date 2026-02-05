---
name: Auth.js (NextAuth.js)
category: security
last_updated: 2026-01-14
maturity: stable
---

# Auth.js (formerly NextAuth.js)

## Overview

Framework-agnostic authentication library with OAuth provider support, session management, and JWT handling. Industry standard for Next.js authentication in 2026. Free, open-source alternative to Clerk/Auth0.

## Key Metrics

- **Providers:** 80+ OAuth providers (Google, GitHub, Facebook, Auth0)
- **Session Management:** JWT and database sessions supported
- **DX:** Simple setup, TypeScript support, secure defaults
- **Maturity:** 7+ years (NextAuth.js → Auth.js), production-grade
- **Cost:** Free, open-source

## Use Cases

| Scenario                                 | Fit Score (1-10) | Rationale                                             |
| ---------------------------------------- | ---------------- | ----------------------------------------------------- |
| Next.js projects                         | 10               | Industry standard, native App Router support          |
| Multi-framework (Remix, SvelteKit, Nuxt) | 9                | Auth.js framework-agnostic (vs NextAuth Next.js-only) |
| OAuth social login (Google, GitHub)      | 10               | 80+ providers built-in, easy configuration            |
| Custom UI needed                         | 9                | Headless (vs Clerk pre-built UI)                      |
| Enterprise SSO (SAML, OIDC)              | 7                | Supported but manual setup (vs Clerk easier)          |

## Trade-offs

### Strengths

- **Free:** No vendor lock-in, unlimited users
- **OAuth Support:** 80+ providers (Google, GitHub, Apple, Auth0)
- **Flexibility:** JWT or database sessions, custom callbacks
- **Security:** Built-in CSRF protection, encrypted cookies

### Weaknesses

- **UI:** No pre-built components (vs Clerk sign-in widgets)
- **Setup Complexity:** Requires configuration (vs Clerk plug-and-play)
- **Database Required:** For database sessions (vs Clerk hosted)
- **Email Provider:** Manual SMTP setup (vs Clerk magic links)

## Implementation Pattern

```bash
npm install next-auth@beta
```

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});

export const { GET, POST } = handlers;
```

```typescript
// app/login/page.tsx
import { signIn } from "@/app/api/auth/[...nextauth]/route";

export default function LoginPage() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/dashboard" });
      }}
    >
      <button type="submit">Sign in with Google</button>
    </form>
  );
}

// app/dashboard/page.tsx
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <h1>Welcome {session.user.name}</h1>;
}
```

## Auth.js vs Alternatives

| Aspect              | Auth.js  | Clerk            | Lucia   |
| ------------------- | -------- | ---------------- | ------- |
| **Cost**            | Free ✅  | Paid ($25/month) | Free ✅ |
| **Pre-built UI**    | No       | Yes ✅           | No      |
| **OAuth Providers** | 80+ ✅   | 20+              | Manual  |
| **Customization**   | High ✅  | Medium           | Full ✅ |
| **Setup**           | Moderate | Easy ✅          | Complex |

## Alternatives

| Alternative       | When to Choose Instead                                     |
| ----------------- | ---------------------------------------------------------- |
| **Clerk**         | Need pre-built UI, easy setup, willing to pay ($25/month+) |
| **Lucia**         | Want full control, custom auth flows, TypeScript-first     |
| **Supabase Auth** | Using Supabase for database, want integrated auth          |

## References

- [Auth.js Official Docs](https://authjs.dev/)
- [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication)
- [Auth.js vs Clerk vs Lucia](https://dev.to/auth-js-vs-clerk-vs-lucia-2026)
