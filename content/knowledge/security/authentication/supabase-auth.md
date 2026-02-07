---
name: Supabase Auth
category: security
last_updated: 2026-01-15
maturity: stable
---

# Supabase Auth

## Overview

A built-in authentication system for Supabase that integrates seamlessly with its PostgreSQL database. It handles user management, social logins, and Row Level Security (RLS) policies.

## Key Metrics

- **Mechanism:** GoTrue (Open Source API)
- **Features:** OAuth, Magic Links, MFA, RLS integration
- **Storage:** Built-in PostgreSQL `auth` schema
- **Maturity:** Stable v2.x (2026)
- **Cost:** Free tier (50k MAU), then paid

## Use Cases

| Scenario              | Fit Score (1-10) | Rationale                                      |
| --------------------- | ---------------- | ---------------------------------------------- |
| Supabase projects     | 10               | Native integration, RLS works automatically    |
| Postgres-first apps   | 10               | Directly manages user records in DB schema     |
| Rapid MVP development | 9                | Handles backend + auth with one client library |
| Non-Supabase DBs      | 2                | Not practical; use Auth.js or Better Auth      |

## Trade-offs

### Strengths

- **RLS Integration:** Secure data access directly via SQL policies based on `auth.uid()`.
- **Pre-built UI:** `auth-ui` library provides ready-made sign-in components.
- **Generous Free Tier:** 50k monthly active users is higher than Clerk.

### Weaknesses

- **Ecosystem Lock-in:** Hard to migrate off if you use RLS heavily.
- **Postgres Dependency:** Requires PostgreSQL as the source of truth.

## Implementation Pattern

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function signIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
  });
}

// In SQL (Row Level Security)
/*
CREATE POLICY "Users can only read their own data"
ON private_data
FOR SELECT
USING (auth.uid() = user_id);
*/
```

## Comparisons

| Aspect       | Supabase Auth   | Clerk      | Auth.js     |
| ------------ | --------------- | ---------- | ----------- |
| **Database** | Postgres ✅     | Hosted     | Your Choice |
| **Security** | RLS Policies ✅ | Admin API  | Middleware  |
| **Setup**    | Fast            | Fastest ✅ | Moderate    |

## References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [GoTrue API](https://github.com/supabase/gotrue)
