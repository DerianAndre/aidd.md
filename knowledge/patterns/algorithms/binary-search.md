---
name: Binary Search
category: pattern
last_updated: 2026-01-15
maturity: stable
---

# Binary Search

## Overview

An efficient algorithm for finding an item from a sorted list of items. It works by repeatedly dividing in half the portion of the list that could contain the item, until you've narrowed down the possible locations to just one.

## Key Metrics

- **Time Complexity:** O(log n) ✅
- **Space Complexity:** O(1) (iterative) or O(log n) (recursive)
- **Constraint:** Requirement for **Sorted Data**.

## Use Cases

| Scenario                 | Fit Score (1-10) | Rationale                                                             |
| ------------------------ | ---------------- | --------------------------------------------------------------------- |
| Search in sorted array   | 10               | Exponentially faster than linear search (O(n))                        |
| Autocomplete Suggestions | 9                | Quickly jumping to prefixes in a sorted dictionary                    |
| Database Indexing        | 10               | B-Trees use binary search logic for fast lookups                      |
| Unsorted Data            | 0                | MUST sort first; Linear search is better for one-off unsorted lookups |

## Trade-offs

### Strengths

- **Extreme Speed:** Searching 1,000,000 items takes ~20 steps (log2 1,000,000 ≈ 19.9).
- **Low Memory:** Doesn't require extra data structures beyond the original list.

### Weaknesses

- **Sorted Requirement:** The cost of sorting O(n log n) often outweighs the search benefit if you only search once.
- **Array-based:** Doesn't work well on Linked Lists because of lack of random access.

## Implementation Pattern

```typescript
function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (arr[mid] === target) return mid;

    if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1; // Not found
}
```

## Comparisons

| Aspect               | Binary Search  | Linear Search        |
| -------------------- | -------------- | -------------------- |
| **Data**             | Sorted ✅      | Any Data             |
| **Complexity**       | O(log n) ✅    | O(n)                 |
| **Speed (1M items)** | ~20 operations | 1,000,000 operations |

## References

- [Khan Academy: Binary Search](https://www.khanacademy.org/computing/computer-science/algorithms/binary-search/a/binary-search)
- [MDN: Array.prototype.indexOf()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf)
- [Big O Cheat Sheet](https://www.bigocheatsheet.com/)
