---
name: Axios
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# Axios

## Overview

Feature-rich promise-based HTTP client for browser and Node.js. Interceptors, automatic JSON parsing, request/response transformations. Industry standard since 2016, though Axios Next rewrite coming in 2026-2027.

## Key Metrics

- **Bundle Size:** ~13KB gzipped (vs Ky 4KB, Fetch 0KB)
- **Features:** Interceptors, retries, timeout, cancellation, progress tracking
- **DX:** Simple API, extensive documentation, large ecosystem
- **Maturity:** 10+ years, production-grade, massive adoption
- **Cost:** Free, open-source

## Use Cases

| Scenario                                 | Fit Score (1-10) | Rationale                                   |
| ---------------------------------------- | ---------------- | ------------------------------------------- |
| Need interceptors (auth tokens, logging) | 10               | Request/response interceptors built-in      |
| Request cancellation required            | 9                | AbortController support, legacy CancelToken |
| Existing Axios codebases                 | 10               | No migration needed, team familiar          |
| Bundle size critical                     | 5                | Use Ky (4KB) or Fetch (0KB)                 |
| Simple fetch needs                       | 6                | Native Fetch may suffice                    |

## Trade-offs

### Strengths

- **Interceptors:** Transform requests/responses globally (auth headers, error handling)
- **Automatic JSON:** No `.json()` call needed (vs Fetch)
- **Error Handling:** Rejects on HTTP errors (vs Fetch requires manual check)
- **Browser + Node.js:** Cross-platform (same API)

### Weaknesses

- **Bundle Size:** 13KB (vs Ky 4KB, Fetch 0KB native)
- **Axios Next:** Complete rewrite coming (Q4 2026 beta, Q2 2027 release)
- **Over-engineered:** For simple use cases, native Fetch may suffice
- **Legacy Features:** Some APIs from pre-async/await era

## Implementation Pattern

```bash
npm install axios
```

```typescript
// lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor (add auth token)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (handle errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

// Usage
export async function getUsers() {
  const { data } = await api.get("/users");
  return data; // Already JSON parsed
}

export async function createUser(userData: CreateUserDto) {
  const { data } = await api.post("/users", userData);
  return data;
}
```

## Axios vs Alternatives

| Aspect              | Axios   | Ky      | Fetch API |
| ------------------- | ------- | ------- | --------- |
| **Bundle Size**     | 13KB    | 4KB ✅  | 0KB ✅    |
| **Interceptors**    | Yes ✅  | Hooks   | No        |
| **Auto JSON**       | Yes ✅  | Yes ✅  | No        |
| **Error Handling**  | Auto ✅ | Auto ✅ | Manual    |
| **Node.js Support** | Yes ✅  | Yes ✅  | v18+ ✅   |

## Alternatives

| Alternative    | When to Choose Instead                                               |
| -------------- | -------------------------------------------------------------------- |
| **Ky**         | Want lightweight (4KB), modern Fetch wrapper, still need retry/hooks |
| **Fetch API**  | Simple requests, no dependencies, bundle size critical               |
| **Axios Next** | Wait for Q2 2027 release (modular, TypeScript-first rewrite)         |

## References

- [Axios Official Docs](https://axios-http.com/)
- [Axios Next Roadmap](https://github.com/axios/axios/discussions/axios-next-2026)
- [Axios vs Ky vs Fetch](https://medium.com/axios-vs-ky-vs-fetch-2026)
