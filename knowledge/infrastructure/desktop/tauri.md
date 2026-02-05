---
name: Tauri
category: infrastructure
last_updated: 2026-01-14
maturity: emerging
---

# Tauri

## Overview

Lightweight desktop app framework using system WebView + Rust backend. 96% smaller bundles than Electron, 58% less memory. Security-first with granular permissions.

## Key Metrics

- **Bundle Size:** <5MB (vs Electron ~150MB)
- **Memory:** ~100MB baseline (vs Electron ~300MB)
- **Startup Time:** <0.5s (vs Electron ~2s)
- **Security:** ACL permissions (restrict filesystem, network access)
- **DX:** Frontend-agnostic (React, Vue, Svelte, Vanilla JS)
- **Maturity:** v2.0+ (2026), production-ready, growing adoption

## Use Cases

| Scenario                                            | Fit Score (1-10) | Rationale                                  |
| --------------------------------------------------- | ---------------- | ------------------------------------------ |
| Lightweight desktop tools                           | 10               | <5MB installer, instant startup            |
| Security-critical apps (wallets, password managers) | 10               | ACL permissions, Rust memory safety        |
| Resource-constrained environments                   | 10               | 58% less memory than Electron              |
| Cross-platform consistency critical                 | 6                | WebView rendering differs (Safari vs Edge) |
| Teams without Rust experience                       | 6                | Requires Rust for system APIs              |

## Trade-offs

### Strengths

- **Size:** 96% smaller than Electron (<5MB vs ~150MB)
- **Performance:** Native WebView = instant startup, lower memory
- **Security:** Sandboxed, ACL permissions (vs Electron's full Node.js access)
- **Modern:** Built on Rust (memory-safe, fast)

### Weaknesses

- **Rendering Inconsistencies:** WebView2 (Windows), WebKit (macOS) differ
- **Rust Required:** System APIs require Rust (vs Electron's Node.js)
- **Ecosystem:** Smaller than Electron (fewer plugins, less Stack Overflow)
- **Debugging:** Rust stack traces harder than Node.js

## Implementation Pattern

```rust
// src-tauri/src/main.rs
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path)
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_file])
        .run(tauri::generate_context!())
}
```

```typescript
// Frontend (any framework)
import { invoke } from "@tauri-apps/api/tauri";

const content = await invoke("read_file", { path: "/file.txt" });
```

## Alternatives

| Alternative           | When to Choose Instead                                          |
| --------------------- | --------------------------------------------------------------- |
| **Electron**          | Need identical rendering across OSes, larger team knows Node.js |
| **Native (Swift/C#)** | Platform-specific features, max performance                     |

## References

- [Tauri vs Electron Benchmark](https://www.reddit.com/r/programming/comments/1jwjw7b/tauri_vs_electron_benchmark_58_less_memory_96/)
- [Tauri vs Electron Guide](https://raftlabs.medium.com/tauri-vs-electron-a-practical-guide-to-picking-the-right-framework-5df80e360f26)
- [Tauri Official Docs](https://tauri.app/)
