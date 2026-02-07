---
name: React Server Components (RSC)
category: pattern
last_updated: 2026-01-14
maturity: emerging
---

# React Server Components (RSC)

## Overview

React architecture rendering components on the server, streaming HTML to client. Reduces client bundle size by moving data fetching and non-interactive logic server-side.

## Key Metrics

- **Bundle Size Reduction:** 30-50% smaller client JS (server components excluded)
- **Data Fetching:** Direct database access from components (no API layer)
- **Complexity:** Paradigm shift (server vs client components)
- **DX:** Colocation of data fetching with UI
- **Maturity:** Production-ready in Next.js 13+ (App Router)

## Use Cases

| Scenario                      | Fit Score (1-10) | Rationale                                       |
| ----------------------------- | ---------------- | ----------------------------------------------- |
| Data-heavy dashboards         | 10               | Fetch data server-side, stream to client        |
| E-commerce (product listings) | 9                | Server components for products, client for cart |
| Marketing sites               | 6                | Astro simpler (RSC overkill for static content) |
| Real-time collaboration       | 7                | Good but requires careful client/server split   |
| Highly interactive UIs        | 6                | Most components become client components anyway |

## Trade-offs

### Strengths

- **Bundle Size:** Move logic to server = smaller client JS
- **Data Fetching:** Direct DB access (no API layer for internal use)
- **Security:** Sensitive logic runs server-side only
- **Streaming:** Partial UI renders as data arrives (PPR)

### Weaknesses

- **Complexity:** Mental model shift (when to use 'use client')
- **Debugging:** Server components harder to inspect than client
- **Ecosystem:** Some React libraries don't work with RSC
- **Network Dependency:** Requires server roundtrip (vs pure SPA)

## Server vs Client Component Rules

| Capability                   | Server Component       | Client Component    |
| ---------------------------- | ---------------------- | ------------------- |
| **Fetch data**               | ✅ Direct DB access    | ❌ Fetch from API   |
| **useState/useEffect**       | ❌ Server has no state | ✅ Full React hooks |
| **onClick handlers**         | ❌ No interactivity    | ✅ Event handlers   |
| **Import 'use client' libs** | ❌ Server-only         | ✅ Client libraries |

## Implementation Pattern (Next.js)

```tsx
// app/products/page.tsx (Server Component)
async function ProductsPage() {
  // Direct DB access (no API route needed)
  const products = await db.query.products.findMany();

  return (
    <div>
      <ProductList products={products} /> {/* Server */}
      <AddToCartButton /> {/* Client Component */}
    </div>
  );
}

// components/AddToCartButton.tsx
("use client"); // Marks as client component

export function AddToCartButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Add {count}</button>;
}
```

## Alternatives

| Alternative                 | When to Choose Instead                 |
| --------------------------- | -------------------------------------- |
| **Traditional SPA**         | Highly interactive, offline-first apps |
| **Islands Architecture**    | Content-first, minimal interactivity   |
| **Remix (Loaders/Actions)** | Prefer web standards over RSC paradigm |

## References

- [React Server Components Explained](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)
- [Next.js App Router (RSC)](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Exploring Next.js 15 and Server Actions](https://dev.to/brayancodes/exploring-nextjs-15-and-server-actions-features-and-best-practices-1393)
