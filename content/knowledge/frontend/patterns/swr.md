---
name: SWR
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# SWR (Stale-While-Revalidate)

## Overview

React hooks library for data fetching by Vercel. Stale-while-revalidate strategy: show cached data immediately, refetch in background. Alternative to TanStack Query with simpler API.

## Key Metrics

- **Bundle Size:** ~5KB (vs TanStack Query ~15KB)
- **DX:** Minimal API (single `useSWR` hook), automatic caching
- **Performance:** Instant UI updates (stale data first), background refetch
- **Maturity:** 5+ years, production-grade, Vercel-backed
- **Cost:** Free, open-source

## Use Cases

| Scenario                   | Fit Score (1-10) | Rationale                                     |
| -------------------------- | ---------------- | --------------------------------------------- |
| Vercel/Next.js projects    | 10               | Made by Vercel, excellent Next.js integration |
| Simple data fetching needs | 9                | Minimal API vs TanStack Query complexity      |
| Real-time data (polling)   | 9                | Auto-refetch on interval/window focus         |
| Complex cache invalidation | 7                | TanStack Query better for advanced patterns   |
| Server Components (RSC)    | 3                | Client-side only (use RSC for server data)    |

## Trade-offs

### Strengths

- **Simplicity:** Single hook (`useSWR`) vs TanStack Query's multiple hooks
- **Stale-While-Revalidate:** Instant UI (cached data), background refresh
- **Automatic Revalidation:** On window focus, network reconnect, interval
- **Bundle Size:** 5KB vs TanStack Query 15KB (3x smaller)

### Weaknesses

- **Feature Set:** Less powerful than TanStack Query (no infinite queries, mutations complex)
- **Cache Invalidation:** Manual vs TanStack Query's query keys system
- **DevTools:** No dedicated devtools (vs TanStack Query's excellent devtools)
- **Ecosystem:** Smaller than TanStack Query (but Vercel-backed)

## Implementation Pattern

```typescript
// hooks/useUser.ts
import useSWR from "swr";

// Fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useUser(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/users/${userId}`,
    fetcher,
    {
      refreshInterval: 60000, // Refetch every 60s
      revalidateOnFocus: true, // Refetch when window focused
      revalidateOnReconnect: true, // Refetch on network reconnect
    }
  );

  return {
    user: data,
    isLoading,
    isError: error,
    mutate, // Manual revalidation
  };
}

// Component
function UserProfile({ userId }: { userId: string }) {
  const { user, isLoading } = useUser(userId);

  if (isLoading) return <div>Loading...</div>;

  return <div>{user.name}</div>;
}
```

## Optimistic Updates

```typescript
function UpdateProfile() {
  const { data, mutate } = useSWR(`/api/users/me`, fetcher);

  async function updateName(newName: string) {
    // Optimistically update UI
    mutate({ ...data, name: newName }, false); // false = don't revalidate yet

    // Send to server
    await fetch(`/api/users/me`, {
      method: "PATCH",
      body: JSON.stringify({ name: newName }),
    });

    // Revalidate to sync
    mutate();
  }

  return <button onClick={() => updateName("Alice")}>Update</button>;
}
```

## Global Configuration

```typescript
// app/providers.tsx
import { SWRConfig } from "swr";

<SWRConfig
  value={{
    fetcher,
    refreshInterval: 60000,
    revalidateOnFocus: true,
    onError: (error) => {
      console.error("SWR Error:", error);
    },
  }}
>
  <App />
</SWRConfig>;
```

## SWR vs TanStack Query

| Aspect               | SWR       | TanStack Query |
| -------------------- | --------- | -------------- |
| **Bundle Size**      | 5KB ✅    | 15KB           |
| **API Complexity**   | Simple ✅ | Feature-rich   |
| **DevTools**         | No        | Yes ✅         |
| **Infinite Queries** | Manual    | Built-in ✅    |
| **Mutations**        | Basic     | Advanced ✅    |
| **Ecosystem**        | Vercel    | Larger ✅      |

## Alternatives

| Alternative                 | When to Choose Instead                                                |
| --------------------------- | --------------------------------------------------------------------- |
| **TanStack Query**          | Need advanced features (infinite scroll, complex mutations, devtools) |
| **React Server Components** | Next.js App Router server-side data fetching                          |
| **Native fetch + useState** | Simple single fetch (no caching needed)                               |

## References

- [SWR Official Docs](https://swr.vercel.app/)
- [SWR vs React Query](https://blog.logrocket.com/react-query-vs-swr/)
- [SWR with Next.js](https://nextjs.org/docs/pages/building-your-application/data-fetching/client-side#client-side-data-fetching-with-swr)
