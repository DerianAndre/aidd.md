---
name: Debounce & Throttle
category: pattern
last_updated: 2026-01-15
maturity: stable
---

# Debounce & Throttle

## Overview

Control the frequency of function execution. **Debouncing** ensures a function is only called after a delay of inactivity. **Throttling** limits a function to being called at most once every given time interval.

## Key Metrics

- **Performance:** Reduces CPU and Memory usage by limiting expensive operations (DOM updates, API calls).
- **UX:** Prevents "stutter" in search inputs and jitter in scroll/resize listeners.
- **Implementations:** Lodash, Underscore, or native implementations.

## Use Cases

| Scenario                     | Fit Pattern           | Rationale                                                              |
| ---------------------------- | --------------------- | ---------------------------------------------------------------------- |
| Search Autocomplete          | **Debounce**          | Only trigger API call after the user finishes typing                   |
| Window Resize/Scroll         | **Throttle**          | Update layout periodically without lagging the main thread             |
| Button Double-Click (Submit) | **Debounce/Throttle** | Prevent accidental multiple form submissions                           |
| Mouse Position Tracking      | **Throttle**          | Update visuals at a fixed 60fps instead of every single movement event |

## Trade-offs

### Strengths

- **Efficiency:** Drastically reduces event-driven overhead.
- **Cost:** Lowers server costs by reducing unnecessary API requests.

### Weaknesses

- **Latency:** Debouncing introduces a delay before the action happens.
- **Complexity:** Choosing the wrong "wait" time (e.g., too long search debounce) can frustrate users.

## Implementation Pattern

```typescript
// Simple Debounce
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Simple Throttle
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
```

## Comparisons

| Aspect       | Debounce                   | Throttle                      |
| ------------ | -------------------------- | ----------------------------- |
| **Logic**    | Delay execution after stop | Execute periodically          |
| **Best for** | Text Inputs ✅             | Continuous Events (Scroll) ✅ |
| **UX Feel**  | "Wait for me"              | "Slow down"                   |

## References

- [Lodash Debounce](https://lodash.com/docs/4.17.15#debounce)
- [FreeCodeCamp: Debounce vs Throttle](https://www.freecodecamp.org/news/debounce-and-throttle-explained-by-gaming/)
- [MDN: Window scroll event](https://developer.mozilla.org/en-US/docs/Web/API/Document/scroll_event)
