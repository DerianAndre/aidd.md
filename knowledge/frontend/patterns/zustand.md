---
name: Zustand
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# Zustand

## Overview

Minimalist React state management using hooks and closures. No providers, minimal boilerplate, excellent TypeScript support. Modern alternative to Redux for client-side state.

## Key Metrics

- **Bundle Size:** ~1KB (vs Redux ~3KB + middleware)
- **Boilerplate:** Minimal (single `create` function)
- **Performance:** Fine-grained updates (vs Context re-render entire tree)
- **DX:** Simple hooks API, no Provider wrapper
- **Maturity:** 5+ years, production-ready, growing adoption

## Use Cases

| Scenario                                      | Fit Score (1-10) | Rationale                                   |
| --------------------------------------------- | ---------------- | ------------------------------------------- |
| Client-side ephemeral state (modals, filters) | 10               | Simple, fast, no Provider overhead          |
| Shared state across components                | 9                | Hooks-based, no prop drilling               |
| Complex state machines                        | 7                | Works but XState better for complex logic   |
| Server state (API data)                       | 4                | Use TanStack Query or RSC instead           |
| Global app state (auth, theme)                | 8                | Good but consider URL state for persistence |

## Trade-offs

### Strengths

- **Simplicity:** No Provider, minimal API surface
- **Performance:** Granular subscriptions (only re-render consumers)
- **DevTools:** Redux DevTools integration
- **TypeScript:** Excellent type inference

### Weaknesses

- **Not for Server State:** Use TanStack Query for API data
- **No Time Travel:** Less debugging power than Redux
- **Middleware Ecosystem:** Smaller than Redux (though core covers most needs)

## Implementation Pattern

```typescript
// store/useCartStore.ts
import { create } from "zustand";

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),
}));

// Component
function Cart() {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);

  return (
    <button onClick={() => addItem({ id: "1", name: "Product" })}>
      Add to Cart ({items.length})
    </button>
  );
}
```

## Alternatives

| Alternative        | When to Choose Instead                                   |
| ------------------ | -------------------------------------------------------- |
| **React Context**  | Simple shared state, don't need performance optimization |
| **TanStack Query** | Server state (API data, caching, background refetch)     |
| **Jotai/Recoil**   | Atomic state (more granular than Zustand stores)         |
| **Redux Toolkit**  | Need time-travel debugging, large team knows Redux       |

## References

- [Zustand Official Docs](https://zustand-demo.pmnd.rs/)
- [Zustand vs Redux Toolkit vs Context (2025)](https://www.reddit.com/r/react/comments/1neu4wc/zustand_vs_redux_toolkit_vs_context_api_in_2025/)
- [React State Management (2025)](https://www.developerway.com/posts/react-state-management-2025)
