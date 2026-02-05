---
name: Vite
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# Vite

## Overview

Next-generation frontend build tool leveraging native ES modules for instant hot module replacement (HMR). Powers Vitest, Astro, SolidStart, and modern frameworks. Alternative to Webpack with <1s dev server startup.

## Key Metrics

- **Dev Server Startup:** <1s (vs Webpack ~10s)
- **HMR:** <100ms updates (vs Webpack ~1s)
- **Build Speed:** 10-100x faster than Webpack (esbuild-based)
- **DX:** Zero-config for modern frameworks, plugin ecosystem
- **Maturity:** v5+ (5+ years), production-grade, powers major frameworks
- **Cost:** Free, open-source

## Use Cases

| Scenario                               | Fit Score (1-10) | Rationale                                                |
| -------------------------------------- | ---------------- | -------------------------------------------------------- |
| Modern frameworks (React, Vue, Svelte) | 10               | Instant HMR, native ESM, TypeScript support              |
| Greenfield projects                    | 10               | Default choice for new apps (Astro, SolidStart use Vite) |
| Monorepos                              | 9                | Fast parallel builds, shared config across packages      |
| Legacy Webpack projects                | 6                | Migration effort required (plugins may not port)         |
| IE11 support required                  | 3                | Vite targets modern browsers (use Webpack for legacy)    |

## Trade-offs

### Strengths

- **Speed:** <1s dev server (native ESM, no bundling in dev)
- **HMR:** <100ms updates (vs Webpack ~1s)
- **Zero Config:** TypeScript, JSX, CSS modules work out of the box
- **Plugin Ecosystem:** Rollup-compatible plugins (large ecosystem)

### Weaknesses

- **Legacy Browser Support:** Targets ES2015+ (no IE11 without polyfills)
- **Plugin Migration:** Webpack plugins don't work (Rollup plugins do)
- **Production Build:** Uses Rollup (different from dev esbuild)
- **Ecosystem:** Smaller than Webpack (though growing fast)

## Implementation Pattern

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true, // Auto-open browser
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": "/src", // Path alias
    },
  },
});
```

## Project Setup

```bash
# Create new project
npm create vite@latest my-app -- --template react-ts

# Dev server (instant startup)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Plugin Example

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    visualizer(), // Bundle size analysis
  ],
});
```

## Vite vs Webpack vs esbuild

| Aspect                 | Vite      | Webpack    | esbuild              |
| ---------------------- | --------- | ---------- | -------------------- |
| **Dev Server Startup** | <1s ✅    | ~10s       | N/A (no dev server)  |
| **HMR Speed**          | <100ms ✅ | ~1s        | N/A                  |
| **Production Build**   | Rollup    | Webpack    | esbuild ✅ (fastest) |
| **Plugin Ecosystem**   | Growing   | Largest ✅ | Smallest             |
| **Legacy Browser**     | Limited   | Full ✅    | Limited              |

## Why Vite is Fast

1. **Native ESM in Dev:** No bundling during development (browser fetches modules directly)
2. **esbuild Pre-Bundling:** Dependencies pre-bundled with esbuild (10-100x faster than Webpack)
3. **On-Demand Compilation:** Only compile files when requested by browser
4. **Rollup for Production:** Optimized tree-shaking and code-splitting

## Frameworks Using Vite

| Framework      | Why Vite                                           |
| -------------- | -------------------------------------------------- |
| **Vitest**     | Native Vite integration (transforms, config reuse) |
| **Astro**      | Instant HMR for content-focused sites              |
| **SolidStart** | Speed matches SolidJS reactivity performance       |
| **SvelteKit**  | Fast dev experience for Svelte components          |

## Alternatives

| Alternative   | When to Choose Instead                                                           |
| ------------- | -------------------------------------------------------------------------------- |
| **Webpack**   | Legacy browser support (IE11), massive plugin ecosystem, existing Webpack config |
| **Turbopack** | Next.js 13+ (Vercel's Rust-based Webpack replacement)                            |
| **esbuild**   | Just need build speed (no dev server, HMR)                                       |

## References

- [Vite Official Docs](https://vitejs.dev/)
- [Why Vite is Fast](https://vitejs.dev/guide/why.html)
- [Vite vs Webpack Performance](https://dev.to/somedood/a-comparison-of-modern-javascript-tooling-6fh)
