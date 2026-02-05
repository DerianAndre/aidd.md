---
name: Ky
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# Ky

## Overview

Lightweight (~4KB) HTTP client built as Fetch API wrapper. Modern alternative to Axios with retry logic, hooks, and automatic JSON parsing. Cross-platform (Node.js, Bun, Deno, browsers).

## Key Metrics

- **Bundle Size:** ~4KB (vs Axios 13KB, Fetch 0KB)
- **Features:** Retry logic, hooks (request/response), timeout, built-in error handling
- **DX:** Clean API, TypeScript-first, automatic JSON
- **Maturity:** 5+ years, production-ready
- **Cost:** Free, open-source

## Use Cases

| Scenario                              | Fit Score (1-10) | Rationale                                          |
| ------------------------------------- | ---------------- | -------------------------------------------------- |
| Modern projects (bundle size matters) | 10               | 4KB vs Axios 13KB, Fetch enhancements              |
| Need retry logic                      | 10               | Built-in exponential backoff retries               |
| TypeScript projects                   | 9                | First-class TypeScript support                     |
| Simple requests (no interceptors)     | 9                | Ky has hooks (vs Axios interceptors more powerful) |
| Legacy Node.js (<18)                  | 6                | Use Axios (Ky requires Fetch support)              |

## Trade-offs

### Strengths

- **Lightweight:** 4KB (3x smaller than Axios)
- **Modern:** Built on Fetch API (native browser standard)
- **Retries:** Exponential backoff built-in
- **Hooks:** Request/response hooks (similar to interceptors)

### Weaknesses

- **Fewer Features:** No progress tracking, request cancellation simpler
- **Smaller Ecosystem:** Newer than Axios (fewer plugins)
- **Hooks vs Interceptors:** Less powerful than Axios interceptors
- **Requires Fetch:** Node.js v18+ or browser (vs Axios works everywhere)

## Implementation Pattern

```bash
npm install ky
```

```typescript
// lib/api.ts
import ky from "ky";

export const api = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  retry: {
    limit: 3,
    methods: ["get", "put", "post"],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        const token = localStorage.getItem("token");
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          window.location.href = "/login";
        }
      },
    ],
  },
});

// Usage (automatic JSON parsing)
export async function getUsers() {
  return api.get("users").json<User[]>();
}

export async function createUser(userData: CreateUserDto) {
  return api.post("users", { json: userData }).json<User>();
}

// Error handling
try {
  const user = await api.get("users/123").json();
} catch (error) {
  if (error instanceof HTTPError) {
    console.error(`HTTP ${error.response.status}: ${error.message}`);
  }
}
```

## Ky vs Alternatives

| Aspect          | Ky             | Axios           | Fetch API |
| --------------- | -------------- | --------------- | --------- |
| **Bundle Size** | 4KB ✅         | 13KB            | 0KB ✅    |
| **Retries**     | Built-in ✅    | Manual          | Manual    |
| **Auto JSON**   | Yes ✅         | Yes ✅          | No        |
| **Hooks**       | Yes ✅         | Interceptors ✅ | No        |
| **TypeScript**  | First-class ✅ | Good            | Basic     |

## Alternatives

| Alternative   | When to Choose Instead                                     |
| ------------- | ---------------------------------------------------------- |
| **Fetch API** | Zero bundle overhead, simple requests, no retries needed   |
| **Axios**     | Need powerful interceptors, existing codebase, Node.js <18 |
| **ofetch**    | Nuxt/Nitro projects (same author as Ky)                    |

## References

- [Ky Official Docs](https://github.com/sindresorhus/ky)
- [Ky vs Axios](https://dev.to/ky-vs-axios-2026)
- [Modern HTTP Clients 2026](https://medium.com/modern-http-clients-comparison)
