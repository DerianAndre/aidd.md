---
name: Clerk
category: security
last_updated: 2026-01-14
maturity: stable
---

# Clerk

## Overview

All-in-one user management and authentication platform with pre-built UI components. Fastest setup, social login, magic links, and MFA out of the box. Paid alternative to Auth.js/Lucia.

## Key Metrics

- **Setup Time:** <10 minutes (vs Auth.js ~1 hour)
- **Pre-built UI:** Sign-in, sign-up, user profile components
- **Features:** OAuth, magic links, MFA, user management dashboard
- **DX:** Excellent, zero auth code needed
- **Maturity:** 5+ years, production-grade, strong ecosystem
- **Cost:** $25/month (10k MAU), then usage-based

## Use Cases

| Scenario                    | Fit Score (1-10) | Rationale                                                  |
| --------------------------- | ---------------- | ---------------------------------------------------------- |
| MVP/startups (fast launch)  | 10               | Pre-built UI = ship in minutes (vs Auth.js hours of setup) |
| Need admin dashboard        | 10               | User management UI included (ban users, view sessions)     |
| Multi-factor authentication | 10               | Built-in MFA (SMS, authenticator app)                      |
| Budget-conscious projects   | 4                | $25/month minimum (vs Auth.js free)                        |
| Custom auth UI required     | 6                | Use Auth.js/Lucia for full UI control                      |

## Trade-offs

### Strengths

- **Fast Setup:** `<ClerkProvider>` + `<SignIn />` = done
- **Pre-built Components:** Sign-in, sign-up, user profile widgets
- **Admin Dashboard:** Manage users, ban accounts, view analytics
- **MFA Built-in:** SMS, authenticator app, backup codes

### Weaknesses

- **Cost:** $25/month minimum (vs Auth.js/Lucia free)
- **Vendor Lock-in:** Migration to Auth.js/Lucia requires rewrite
- **Customization Limits:** Theme-based customization (vs Lucia full control)
- **Pricing Scales:** Usage-based after 10k MAU (can get expensive)

## Implementation Pattern

```bash
npm install @clerk/nextjs
```

```typescript
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}

// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <SignIn />; // That's it!
}

// app/dashboard/page.tsx
import { auth, currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  return <h1>Welcome {user?.firstName}</h1>;
}
```

## Clerk vs Alternatives

| Aspect              | Clerk       | Auth.js | Lucia    |
| ------------------- | ----------- | ------- | -------- |
| **Setup Time**      | <10 min ✅  | ~1 hour | ~2 hours |
| **Pre-built UI**    | Yes ✅      | No      | No       |
| **Admin Dashboard** | Yes ✅      | No      | No       |
| **Cost**            | $25/month   | Free ✅ | Free ✅  |
| **Customization**   | Theme-based | High ✅ | Full ✅  |

## Alternatives

| Alternative       | When to Choose Instead                                           |
| ----------------- | ---------------------------------------------------------------- |
| **Auth.js**       | Want free solution, need full customization, 80+ OAuth providers |
| **Lucia**         | Need full control, custom flows, TypeScript-first                |
| **Supabase Auth** | Using Supabase database, want integrated auth                    |

## References

- [Clerk Official Docs](https://clerk.com/docs)
- [Clerk Pricing](https://clerk.com/pricing)
- [Clerk vs Auth.js](https://clerk.com/blog/clerk-vs-nextauth)
