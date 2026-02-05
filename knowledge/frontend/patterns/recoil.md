---
name: Recoil
category: frontend
last_updated: 2026-01-15
maturity: legacy
---

# Recoil

## Overview

A state management library for React that provides an atomic approach. Originally developed by Facebook, it introduced the concepts of **Atoms** (state) and **Selectors** (derived state).

## Key Metrics

- **Paradigm:** Atomic State
- **Key Concepts:** Atoms, Selectors, Suspend/Wait
- **Maturity:** Reached stable features but development has slowed significantly in favor of Jotai or Zustand (2026).
- **Status:** Considered "legacy-mature" in 2026.

## Use Cases

| Scenario                         | Fit Score (1-10) | Rationale                                                     |
| -------------------------------- | ---------------- | ------------------------------------------------------------- |
| High-performance interactive UIs | 10               | Atomic updates prevent massive re-renders                     |
| Complex derived state            | 9                | Selectors are very powerful for dependency tracking           |
| New projects in 2026             | 3                | Jotai provides a similar pattern with better maintenance/size |
| Inheriting Meta repositories     | 10               | Still standard in many internal/legacy Facebook projects      |

## Trade-offs

### Strengths

- **Fine-grained Reactivity:** Only components subscribed to a specific atom re-render.
- **Asynchronous Selectors:** Built-in support for processing data fetching through the state tree.

### Weaknesses

- **Development Activity:** High inactivity in recent years (vs Jotai's rapid evolution).
- **Complexity:** Higher boilerplate than Zustand.
- **Bundle Size:** Heavier than Jotai (~20KB vs ~3KB).

## Implementation Pattern

```tsx
import { atom, selector, useRecoilState, useRecoilValue } from "recoil";

// Atom
const textState = atom({
  key: "textState",
  default: "",
});

// Selector (Derived State)
const charCountState = selector({
  key: "charCountState",
  get: ({ get }) => {
    const text = get(textState);
    return text.length;
  },
});

function CharacterCounter() {
  const [text, setText] = useRecoilState(textState);
  const count = useRecoilValue(charCountState);

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p>Count: {count}</p>
    </div>
  );
}
```

## Comparisons

| Aspect      | Recoil   | Jotai     | Zustand   |
| ----------- | -------- | --------- | --------- |
| **Pattern** | Atomic   | Atomic    | Store     |
| **Size**    | ~20KB    | ~3KB ✅   | ~3KB ✅   |
| **Active**  | ❌ (Low) | ✅ (High) | ✅ (High) |

## References

- [Recoil Official Site](https://recoiljs.org/)
- [Jotai (Modern Alternative)](https://jotai.org/)
- [Atomic State Management Guide](https://frontendmastery.com/posts/the-atomic-state-management-pattern/)
