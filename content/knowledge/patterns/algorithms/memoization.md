---
name: Memoization
category: pattern
last_updated: 2026-01-15
maturity: stable
---

# Memoization

## Overview

An optimization technique used primarily to speed up computer programs by storing the results of expensive function calls and returning the cached result when the same inputs occur again.

## Key Metrics

- **Performance:** Reduces time complexity for recursive tasks (e.g., Fibonacci, Dynamic Programming).
- **React Optimization:** Primary use case in frontend via `useMemo` and `useCallback`.
- **Memory Cost:** Trades Space (Memory) for Time (Speed).

## Use Cases

| Scenario                   | Fit Score (1-10) | Rationale                                                      |
| -------------------------- | ---------------- | -------------------------------------------------------------- |
| Expensive UI Calculations  | 10               | Avoid recalculating on every re-render in React                |
| Recursive Algorithms       | 10               | Transforms O(2^n) to O(n) in DP problems                       |
| Large List Transformations | 9                | Filter/Sort large datasets only when raw data changes          |
| Fetching Static Data       | 8                | Simple in-memory cache for API responses                       |
| Frequent, Changing Inputs  | 2                | If inputs always change, caching adds overhead with no benefit |

## Trade-offs

### Strengths

- **Speed:** Drastically improves performance of repetitive tasks.
- **Consistency:** Returns identical objects in React to prevent downstream re-renders.

### Weaknesses

- **Memory Consumption:** Storing every result can lead to memory leaks if not cleared (LRU cache recommended).
- **Overhead:** Validating if the input matches the cache takes time.

## Implementation Pattern

```typescript
// Generic Memoization Wrapper
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// React Example
import { useMemo } from "react";

function ProductList({ products, filter }) {
  // Only re-calculates if products or filter changes
  const filteredProducts = useMemo(() => {
    return products.filter((p) => p.name.includes(filter));
  }, [products, filter]);

  return (
    <div>
      {filteredProducts.map((p) => (
        <span key={p.id}>{p.name}</span>
      ))}
    </div>
  );
}
```

## Comparisons

| Aspect       | Memoization               | Direct Execution                |
| ------------ | ------------------------- | ------------------------------- |
| **Time**     | Fast (after 1st call) ✅  | Constant (Slow for heavy tasks) |
| **Space**    | Cache Usage               | Zero Cache ✅                   |
| **Best For** | Re-calculation protection | One-off tasks                   |

## References

- [React useMemo Docs](https://react.dev/reference/react/useMemo)
- [Memoization in JavaScript](https://www.freecodecamp.org/news/memoization-in-javascript-and-react/)
- [Dynamic Programming Concepts](https://en.wikipedia.org/wiki/Dynamic_programming)
