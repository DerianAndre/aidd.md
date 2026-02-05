---
name: WebAssembly (Wasm)
category: runtime
last_updated: 2026-01-15
maturity: stable
---

# WebAssembly (Wasm)

## Overview

A binary instruction format for a stack-based virtual machine. It's designed as a portable compilation target for programming languages, enabling high-performance applications on the web at near-native speed.

## Key Metrics

- **Performance:** Within 10-20% of native speed in many cases
- **Compatibility:** All modern browsers, Node.js, Bun, Deno
- **Languages:** Compilation targets for Rust, C/C++, C#, Go, and AssemblyScript
- **Interoperability:** Seamless interaction with JavaScript via JS APIs
- **Maturity:** Standard since 2017, pervasive in 2026

## Use Cases

| Scenario                              | Fit Score (1-10) | Rationale                                           |
| ------------------------------------- | ---------------- | --------------------------------------------------- |
| Compute-intensive tasks (Video/Audio) | 10               | Near-native speed for processing streams            |
| Porting legacy C++/Rust tools to web  | 10               | Compile core logic once, run everywhere             |
| AI/ML in browser                      | 10               | Heavy tensor calculations benefit from Wasm's speed |
| Complex physics engines/games         | 9                | Low-level memory management and fast execution      |
| Simple CRUD applications              | 1                | Massive overkill; JS is faster to write and load    |

## Trade-offs

### Strengths

- **Speed:** Drastically faster than JS for numerical and algorithmic tasks.
- **Portability:** Write once in Rust/C++ and run in any environment (Cloudflare Workers, Browsers, Edge).
- **Security:** Runs in a sandboxed environment with strict memory isolation.

### Weaknesses

- **Communication Overhead:** Crossing the "JS-Wasm bridge" can be slow for many small operations.
- **Lack of direct DOM access:** Must communicate through JS to manipulate the UI.
- **Larger Binaries:** Wasm modules can be large, impacting initial load times.

## Implementation Pattern

```typescript
// Loading a Wasm module in the browser
async function runWasm() {
  const response = await fetch("module.wasm");
  const bytes = await response.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes, {
    env: {
      imported_func: (arg: number) => console.log(arg),
    },
  });

  // Call a function exported by Wasm
  const result = instance.exports.add(5, 10);
  console.log(result); // 15
}
```

## Comparisons

| Aspect        | WebAssembly            | JavaScript              |
| ------------- | ---------------------- | ----------------------- |
| **Execution** | Binary (Fast)          | Just-in-Time (Variable) |
| **Logic**     | Lower-level (Mem mgmt) | High-level (GC)         |
| **Boot time** | Decoding needed        | Parsing needed          |

## References

- [WebAssembly.org](https://webassembly.org/)
- [MDN WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [Rust & WebAssembly](https://rustwasm.github.io/docs/book/)
