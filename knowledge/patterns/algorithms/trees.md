---
name: Trees (DOM, AST)
category: pattern
last_updated: 2026-01-15
maturity: stable
---

# Trees (DOM, AST)

## Overview

Hierarchical data structures consisting of nodes connected by edges. They are foundational for web development because both the UI (DOM) and the code files (AST) are represented as trees.

## Key Metrics

- **Hierarchy:** Parent/Child relationships.
- **Traversal:** Depth-First Search (DFS) and Breadth-First Search (BFS).
- **Recursion:** The natural way to process tree structures.

## Use Cases

| Scenario                   | Fit Score (1-10) | Rationale                                                |
| -------------------------- | ---------------- | -------------------------------------------------------- |
| UI Rendering (DOM)         | 10               | Naturally maps to nested components/HTML tags            |
| File Systems               | 10               | Directories and files are classic tree structures        |
| Code Compilers (AST)       | 10               | Tools like Babel and ESLint parse code into syntax trees |
| Org Charts / Nested Menus  | 10               | Recursive data that can be infinite in depth             |
| Relational Data with Loops | 2                | Use Graphs; Trees cannot have cycles                     |

## Trade-offs

### Strengths

- **Structure:** Perfectly captures hierarchical ownership.
- **Search Efficiency:** Balanced trees (like AVL) provide O(log n) searches.
- **Modularity:** Sub-trees can be processed independently (e.g., React sub-trees).

### Weaknesses

- **Complexity:** Traversal logic (recursion) can be harder to debug than simple loops.
- **Unbalanced Trees:** Without balancing, trees can degrade to O(n) performance (effectively a linked list).

## Implementation Pattern

```typescript
interface TreeNode {
  value: string;
  children: TreeNode[];
}

// Depth-First Search (Recursive)
function traverseDFS(node: TreeNode) {
  console.log(node.value);
  node.children.forEach((child) => traverseDFS(child));
}

// Breadth-First Search (Iterative)
function traverseBFS(root: TreeNode) {
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift()!;
    console.log(node.value);
    queue.push(...node.children);
  }
}
```

## Comparisons

| Aspect        | Tree              | Graph              | Array  |
| ------------- | ----------------- | ------------------ | ------ |
| **Linkage**   | One Parent        | Multiple Parents   | Linear |
| **Cycles**    | No cycles ✅      | Can have cycles    | No     |
| **Traversal** | Recursive DFS/BFS | Complex (Dijkstra) | Loop   |

## References

- [MDN: The DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)
- [AST Explorer](https://astexplorer.net/)
- [Algorithms: Tree Traversal](https://en.wikipedia.org/wiki/Tree_traversal)
