---
name: Fetch API
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# Fetch API

## Overview

Native browser HTTP client (also in Node.js v18+, Bun, Deno). Promise-based standard for network requests. Zero bundle overhead, web standards-based. Baseline for Axios/Ky comparison.

## Key Metrics

- **Bundle Size:** 0KB (native browser + Node.js v18+)
- **Standards:** WHATWG Fetch Standard (cross-runtime)
- **DX:** Promise-based, Request/Response objects, streaming support
- **Maturity:** 10+ years (browsers), 3+ years (Node.js)
- **Cost:** Free, built-in

## Use Cases

| Scenario                                       | Fit Score (1-10) | Rationale                                              |
| ---------------------------------------------- | ---------------- | ------------------------------------------------------ |
| Bundle size critical                           | 10               | 0KB native (vs Axios 13KB, Ky 4KB)                     |
| Simple HTTP requests                           | 10               | No library needed for basic GET/POST                   |
| Modern runtimes (Node 18+, Bun, Deno)          | 10               | Consistent API across platforms                        |
| Need advanced features (retries, interceptors) | 5                | Use Ky or Axios (Fetch requires manual implementation) |
| Node.js <18                                    | 3                | Use Axios or node-fetch polyfill                       |

## Trade-offs

### Strengths

- **Zero Bundle:** Native = no npm install, no bundle overhead
- **Standard:** WHATWG spec = works everywhere (browsers, Node, Bun, Deno)
- **Streaming:** ReadableStream for large responses
- **Modern:** Async/await, AbortController built-in

### Weaknesses

- **Manual Error Handling:** HTTP 4xx/5xx don't throw (must check `response.ok`)
- **Manual JSON:** Must call `response.json()` (vs Axios auto-parse)
- **No Retries:** Manual implementation required (vs Ky built-in)
- **No Interceptors:** No global request/response transformations (vs Axios)

## Implementation Pattern

```typescript
// Basic usage
async function getUsers() {
  const response = await fetch("/api/users");

  // Manual error check (4xx/5xx don't throw)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Manual JSON parsing
  const users = await response.json();
  return users;
}

// POST with JSON body
async function createUser(userData: CreateUserDto) {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) throw new Error("Failed to create user");
  return response.json();
}

// Request cancellation with AbortController
const controller = new AbortController();
const signal = controller.signal;

fetch("/api/data", { signal })
  .then((res) => res.json())
  .catch((err) => {
    if (err.name === "AbortError") {
      console.log("Request cancelled");
    }
  });

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);
```

## Fetch vs Alternatives

| Aspect             | Fetch API | Axios   | Ky          |
| ------------------ | --------- | ------- | ----------- |
| **Bundle Size**    | 0KB ✅    | 13KB    | 4KB         |
| **Auto JSON**      | No        | Yes ✅  | Yes ✅      |
| **Error Handling** | Manual    | Auto ✅ | Auto ✅     |
| **Interceptors**   | No        | Yes ✅  | Hooks       |
| **Retries**        | Manual    | Manual  | Built-in ✅ |

## Alternatives

| Alternative | When to Choose Instead                                               |
| ----------- | -------------------------------------------------------------------- |
| **Ky**      | Want Fetch enhancements (retries, auto JSON) with small bundle (4KB) |
| **Axios**   | Need powerful interceptors, existing codebase, feature-rich          |
| **ofetch**  | Nuxt/Nitro projects (auto JSON, retry logic)                         |

## References

- [MDN Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Fetch in Node.js v18+](https://nodejs.org/dist/latest-v18.x/docs/api/globals.html#fetch)
- [WHATWG Fetch Standard](https://fetch.spec.whatwg.org/)
