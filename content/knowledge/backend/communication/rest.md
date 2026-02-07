---
name: REST (RESTful APIs)
category: backend
last_updated: 2026-01-14
maturity: stable
---

# REST (RESTful APIs)

## Overview

Architectural style for networked applications using HTTP methods (GET, POST, PUT, DELETE) on resources. Industry standard for web APIs, simpler than gRPC for public-facing services.

## Key Metrics

- **Simplicity:** Easy to understand (HTTP verbs + URLs)
- **Tooling:** Universal (cURL, Postman, browser DevTools)
- **Performance:** JSON serialization slower than Protocol Buffers (gRPC)
- **DX:** Human-readable (JSON), wide language support
- **Maturity:** 20+ years, industry standard

## Use Cases

| Scenario                          | Fit Score (1-10) | Rationale                                            |
| --------------------------------- | ---------------- | ---------------------------------------------------- |
| Public APIs (external developers) | 10               | Human-readable, no special tooling needed            |
| CRUD operations                   | 10               | Natural mapping (GET /users, POST /users)            |
| Web clients (browsers)            | 10               | Native Fetch API, no protobuf compilation            |
| Internal microservices            | 7                | Works but gRPC more efficient for service-to-service |
| Real-time communication           | 3                | Use WebSockets or SSE instead                        |

## Trade-offs

### Strengths

- **Universal:** Every language, framework, browser supports HTTP
- **Human-Readable:** JSON responses inspectable in browser/Postman
- **Cacheable:** HTTP caching (CDN, browser) built-in
- **Stateless:** Each request independent (scalable)

### Weaknesses

- **Performance:** JSON slower than binary (gRPC protobuf)
- **Type Safety:** No contract enforcement (vs gRPC schema)
- **Over-Fetching:** Can't request specific fields (vs GraphQL)
- **Versioning:** Manual (/v1, /v2 routes) vs gRPC backward compatibility

## Best Practices

| Practice                     | Rationale                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------- |
| **Use HTTP verbs correctly** | GET (read), POST (create), PUT (update), DELETE (delete)                        |
| **Plural nouns**             | `/users` not `/user`                                                            |
| **Nested resources**         | `/users/123/posts` (user's posts)                                               |
| **Status codes**             | 200 (OK), 201 (Created), 400 (Bad Request), 404 (Not Found), 500 (Server Error) |
| **Pagination**               | `?page=2&limit=20` or cursor-based                                              |
| **Versioning**               | `/v1/users` or `Accept: application/vnd.api.v1+json`                            |

## Alternatives

| Alternative    | When to Choose Instead                                         |
| -------------- | -------------------------------------------------------------- |
| **gRPC**       | Internal microservices, need type safety, performance critical |
| **GraphQL**    | Frontend needs flexible queries, avoid over-fetching           |
| **WebSockets** | Real-time bidirectional communication                          |

## References

- [REST API Design Best Practices](https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/)
- [RESTful API Design (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
