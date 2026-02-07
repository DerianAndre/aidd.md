---
name: Hash Tables (Map/Set)
category: pattern
last_updated: 2026-01-15
maturity: stable
---

# Hash Tables (Map/Set)

## Overview

Data structures that map keys to values for highly efficient lookup, insertion, and deletion. In the JavaScript ecosystem, these are primarily utilized through the `Map` and `Set` objects.

## Key Metrics

- **Time Complexity:** O(1) average for Lookup, Insert, and Delete. ✅
- **Space Complexity:** O(n)
- **Engine:** Built-in optimized C++ implementations in V8/Bun.

## Use Cases

| Scenario                      | Fit Score (1-10) | Rationale                                          |
| ----------------------------- | ---------------- | -------------------------------------------------- |
| De-duplication (Unique lists) | 10               | Use `Set` to automatically handle uniqueness       |
| Key-Value Caching             | 10               | `Map` provides O(1) access to cached data          |
| Efficient "Includes" checks   | 10               | `set.has(val)` is O(1) vs `arr.includes(val)` O(n) |
| Preserving Insertion Order    | 9                | JS `Map` remembers order (unlike plain objects)    |
| Frequency Counters            | 10               | Counting occurrences of characters/words           |

## Trade-offs

### Strengths

- **Speed:** The fastest possible data structure for direct lookups.
- **Key Versatility:** `Map` objects can use objects and functions as keys (plain `{}` cannot).
- **Semantics:** Clear API (`has`, `set`, `delete`, `clear`).

### Weaknesses

- **Memory Overhead:** Uses more memory than a raw array.
- **Serialization:** `Map` and `Set` cannot be directly stringified to JSON without custom logic.

## Implementation Pattern

```typescript
// Frequency counter
function countFrequencies(arr: string[]) {
  const counts = new Map<string, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return counts;
}

// Deduplication
const uniqueItems = Array.from(new Set([1, 2, 2, 3, 4, 4, 4])); // [1, 2, 3, 4]

// Efficient Lookup vs Array
const hugeList = new Set(Array.from({ length: 1000000 }, (_, i) => i));
console.time("set");
hugeList.has(999999); // O(1) - ~0.05ms
console.timeEnd("set");
```

## Comparisons

| Aspect               | Map / Set    | Plain Object `{}` | Array `[]`     |
| -------------------- | ------------ | ----------------- | -------------- |
| **Key Types**        | Any (Obj/Fn) | String/Symbol     | Index          |
| **Lookup**           | O(1) ✅      | O(1)              | O(n)           |
| **Order**            | Preserved    | Non-guaranteed    | Preserved      |
| **Built-in methods** | Easy API     | Manual loops      | Native methods |

## References

- [MDN: Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [MDN: Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
- [V8 Hash Map Architecture](https://v8.dev/blog/hash-code)
