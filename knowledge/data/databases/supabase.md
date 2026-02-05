---
name: Supabase
category: data
last_updated: 2026-01-14
maturity: stable
---

# Supabase

## Overview

Open-source Firebase alternative built on PostgreSQL. Backend-as-a-Service (BaaS) with database, authentication, storage, real-time subscriptions, and edge functions. Self-hostable or managed.

## Key Metrics

- **Stack:** PostgreSQL + PostgREST (auto-generated REST API) + GoTrue (auth) + Realtime
- **DX:** Auto-generated TypeScript types, client SDKs, Supabase Studio GUI
- **Performance:** PostgreSQL-level (sub-second queries), real-time via WebSockets
- **Maturity:** v2.0+ (5+ years), production-grade, massive adoption
- **Cost:** Free tier (500MB DB, 2GB storage), ~$25/month for production

## Use Cases

| Scenario                               | Fit Score (1-10) | Rationale                                        |
| -------------------------------------- | ---------------- | ------------------------------------------------ |
| Rapid prototyping / MVPs               | 10               | Auth + DB + storage in minutes (no backend code) |
| Real-time apps (chat, collaboration)   | 10               | PostgreSQL Realtime (subscribe to DB changes)    |
| PostgreSQL + Auth needed               | 9                | Integrated auth (vs DIY Postgres + NextAuth)     |
| High customization (unique auth flows) | 6                | Use Postgres + custom backend for max control    |
| NoSQL data models                      | 3                | Use MongoDB/Firebase (Supabase is SQL-based)     |

## Trade-offs

### Strengths

- **Auto-Generated API:** PostgREST creates REST API from Postgres schema
- **Real-Time:** Subscribe to DB changes (chat, collaborative editing)
- **Row-Level Security:** PostgreSQL policies enforce access control
- **Self-Hostable:** Docker Compose for full control (vs vendor lock-in)

### Weaknesses

- **SQL Required:** Need to understand PostgreSQL schemas, RLS policies
- **Vendor Features:** Some features (Edge Functions) require Supabase Cloud
- **Complexity:** More setup than Firebase (but more powerful)
- **Cost at Scale:** $25/month + usage vs self-hosted Postgres

## Implementation Pattern

```typescript
// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Database queries
const { data: users, error } = await supabase
  .from("users")
  .select("*")
  .eq("status", "active")
  .limit(10);

// Insert
await supabase
  .from("users")
  .insert({ email: "alice@example.com", name: "Alice" });

// Update
await supabase.from("users").update({ name: "Alice Updated" }).eq("id", 123);

// Delete
await supabase.from("users").delete().eq("id", 123);
```

## Authentication

```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "secure-password",
});

// Sign in
await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "secure-password",
});

// OAuth (Google, GitHub, etc.)
await supabase.auth.signInWithOAuth({ provider: "google" });

// Get current user
const {
  data: { user },
} = await supabase.auth.getUser();
```

## Real-Time Subscriptions

```typescript
// Subscribe to table changes
const channel = supabase
  .channel("public:messages")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages" },
    (payload) => {
      console.log("New message:", payload.new);
    }
  )
  .subscribe();

// Unsubscribe
channel.unsubscribe();
```

## Row-Level Security (RLS)

```sql
-- SQL Policy (users can only read their own data)
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);

-- Policy for inserts
CREATE POLICY "Users can insert own data"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);
```

## Supabase vs Firebase vs PostgreSQL

| Aspect        | Supabase      | Firebase    | PostgreSQL (Raw)  |
| ------------- | ------------- | ----------- | ----------------- |
| **Database**  | PostgreSQL ✅ | NoSQL       | PostgreSQL ✅     |
| **Real-Time** | Yes ✅        | Yes ✅      | DIY               |
| **Auth**      | Built-in ✅   | Built-in ✅ | Manual (NextAuth) |
| **Storage**   | Built-in ✅   | Built-in ✅ | Manual (S3)       |
| **SQL**       | Yes ✅        | No          | Yes ✅            |
| **Self-Host** | Yes ✅        | No          | Yes ✅            |

## Alternatives

| Alternative             | When to Choose Instead                                     |
| ----------------------- | ---------------------------------------------------------- |
| **Firebase**            | NoSQL data model, Google Cloud ecosystem, prefer Firestore |
| **Postgres + NextAuth** | Need max customization, avoid BaaS vendor                  |
| **Neon**                | Just need Postgres (no auth/storage/realtime)              |

## References

- [Supabase Official Docs](https://supabase.com/docs)
- [Supabase vs Firebase](https://supabase.com/alternatives/supabase-vs-firebase)
- [Self-Hosting Supabase](https://supabase.com/docs/guides/self-hosting)
