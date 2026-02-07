---
name: TanStack Query (React Query)
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# TanStack Query (React Query)

## Overview

Asynchronous state management for server data (API calls). Handles caching, background refetch, stale data, and optimistic updates. Essential for client-side data fetching in React apps.

## Key Metrics

- **Bundle Size:** ~15KB (gzipped)
- **Caching:** Intelligent cache invalidation, background refetch
- **DX:** DevTools, automatic retry, request deduplication
- **Performance:** Reduces redundant API calls, improves UX with stale-while-revalidate
- **Maturity:** 5+ years (React Query → TanStack Query), production-grade

## Use Cases

| Scenario                        | Fit Score (1-10) | Rationale                                            |
| ------------------------------- | ---------------- | ---------------------------------------------------- |
| SPAs fetching API data          | 10               | Cache, background refetch, stale-while-revalidate    |
| Infinite scroll / pagination    | 10               | Built-in `useInfiniteQuery` hook                     |
| Real-time data (polling)        | 9                | Auto-refetch on interval or window focus             |
| Server Components (Next.js RSC) | 3                | RSC handles server data (Query for client-side only) |
| Static sites (no dynamic data)  | 2                | No API calls = no need                               |

## Trade-offs

### Strengths

- **Caching:** Automatic caching with configurable stale times
- **Background Refetch:** Updates data without blocking UI
- **Optimistic Updates:** Update UI before server response
- **DevTools:** Inspect cache, queries, mutations in real-time

### Weaknesses

- **Client-Side Only:** Not needed in RSC/Server Components
- **Learning Curve:** Query keys, cache invalidation patterns
- **Bundle Size:** ~15KB (though small, adds up in micro-frontends)
- **Overkill:** Simple apps with few API calls don't need it

## Implementation Pattern

```typescript
// queries/useUsers.ts
import { useQuery } from "@tanstack/react-query";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Component
function UserList() {
  const { data, isLoading, error } = useUsers();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: (newUser) =>
    fetch("/api/users", {
      method: "POST",
      body: JSON.stringify(newUser),
    }),
  onMutate: async (newUser) => {
    // Optimistically update UI
    await queryClient.cancelQueries({ queryKey: ["users"] });
    const previous = queryClient.getQueryData(["users"]);

    queryClient.setQueryData(["users"], (old) => [...old, newUser]);

    return { previous }; // Rollback data
  },
  onError: (err, newUser, context) => {
    // Rollback on error
    queryClient.setQueryData(["users"], context.previous);
  },
});
```

## Alternatives

| Alternative                 | When to Choose Instead                         |
| --------------------------- | ---------------------------------------------- |
| **React Server Components** | Server-side data fetching (Next.js App Router) |
| **SWR**                     | Similar features, prefer Vercel ecosystem      |
| **Zustand/Context**         | Client-side ephemeral state (not server data)  |
| **Native fetch + useState** | Simple app with 1-2 API calls                  |

## References

- [TanStack Query Official Docs](https://tanstack.com/query/latest)
- [React State Management (2025)](https://www.developerway.com/posts/react-state-management-2025)
- [TanStack Query vs SWR](https://blog.logrocket.com/react-query-vs-swr/)
