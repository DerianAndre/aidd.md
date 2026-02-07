---
name: Electron
category: infrastructure
last_updated: 2026-01-14
maturity: stable
---

# Electron

## Overview

Desktop app framework bundling Chromium + Node.js. Industry standard (VS Code, Discord, Slack) but heavy bundles and security concerns drive Tauri adoption in 2026.

## Key Metrics

- **Bundle Size:** ~150MB (includes Chromium + Node.js)
- **Memory:** ~300MB baseline (vs Tauri ~100MB)
- **Startup Time:** ~2s (vs Tauri <0.5s)
- **DX:** Mature ecosystem, extensive documentation, familiar Node.js APIs
- **Maturity:** 10+ years, production-grade, massive adoption

## Use Cases

| Scenario                            | Fit Score (1-10) | Rationale                                           |
| ----------------------------------- | ---------------- | --------------------------------------------------- |
| Complex desktop IDEs (VS Code)      | 10               | Feature-rich, mature debugging, ecosystem           |
| Cross-platform consistency critical | 10               | Identical Chromium across Windows/Mac/Linux         |
| Teams familiar with Node.js         | 9                | No Rust learning curve (vs Tauri)                   |
| Resource-constrained devices        | 3                | 150MB installer, 300MB RAM too heavy                |
| Security-critical apps              | 5                | Node.js full access = attack surface (vs Tauri ACL) |

## Trade-offs

### Strengths

- **Ecosystem:** Largest (most Stack Overflow, plugins, tutorials)
- **Consistency:** Same Chromium rendering across all OSes
- **Node.js APIs:** Full filesystem, network, child processes access
- **Electron Forge/Builder:** Mature packaging, auto-updates

### Weaknesses

- **Size:** 150MB installer (vs Tauri <5MB)
- **Memory:** 300MB baseline (vs Tauri 100MB)
- **Security:** Node.js runs in renderer (attack surface)
- **Startup:** 2s cold start (vs Tauri instant)

## Implementation Pattern

```javascript
// main.js
const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true, // Enable Node.js in renderer
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(createWindow);
```

```html
<!-- index.html -->
<script>
  const fs = require("fs"); // Node.js APIs available
  const data = fs.readFileSync("file.txt", "utf8");
</script>
```

## Alternatives

| Alternative           | When to Choose Instead                           |
| --------------------- | ------------------------------------------------ |
| **Tauri**             | Need small bundles, fast startup, security-first |
| **Native (Swift/C#)** | Platform-specific features, max performance      |
| **PWA**               | Web-first, don't need desktop features           |

## References

- [Electron Official Docs](https://www.electronjs.org/docs)
- [Tauri vs Electron Benchmark](https://www.reddit.com/r/programming/comments/1jwjw7b/tauri_vs_electron_benchmark_58_less_memory_96/)
- [Tauri vs Electron Guide](https://raftlabs.medium.com/tauri-vs-electron-a-practical-guide-to-picking-the-right-framework-5df80e360f26)
