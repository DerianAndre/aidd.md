# Knowledge — Routing Index

> Quick reference for the Technology Knowledge Base (TKB). Evidence-based technology entries organized by domain for context-aware recommendations.

---

## Category Index

| Category | Path | Entries | Description |
|----------|------|---------|-------------|
| **Runtimes** | [runtimes/](runtimes/) | 3 | JavaScript/TypeScript execution environments (Node.js, Bun, Deno) |
| **Frontend** | [frontend/](frontend/) | 27 | UI frameworks, meta-frameworks, patterns, CSS, and component libraries |
| **Backend** | [backend/](backend/) | 11 | Server architecture, communication protocols, and frameworks |
| **Data** | [data/](data/) | 12 | Databases, ORMs, and caching layers |
| **Testing** | [testing/](testing/) | 8 | Unit, E2E, component, mocking, and testing patterns |
| **Infrastructure** | [infrastructure/](infrastructure/) | 10 | Containers, orchestration, observability, and desktop runtimes |
| **Security** | [security/](security/) | 8 | Authentication, dependency scanning, and standards |
| **Tooling** | [tooling/](tooling/) | 17 | Build tools, linting, formatting, git hooks, logging, and HTTP clients |
| **Patterns** | [patterns/](patterns/) | 9 | Architecture patterns, algorithms, DDD, CQRS, and more |

**Total Entries**: 105

---

## Subcategory Breakdown

### Frontend
| Subcategory | Path | Contents |
|-------------|------|----------|
| Meta-Frameworks | frontend/meta-frameworks/ | Astro, Next.js, Remix, SolidStart, Expo |
| Patterns | frontend/patterns/ | Zustand, TanStack Query, SWR, React Hook Form, Formik, Redux Toolkit, Jotai, Islands, RSC, Server Actions |
| UI Libraries | frontend/ui-libraries/ | shadcn/ui, Radix UI, Headless UI, HeroUI, MUI, Chakra UI, Mantine, Ant Design, daisyUI, React Aria |
| CSS | frontend/css/ | Tailwind CSS |

### Backend
| Subcategory | Path | Contents |
|-------------|------|----------|
| Architecture | backend/architecture/ | Microservices, Modular Monolith, Monolith |
| Communication | backend/communication/ | WebSockets, gRPC, REST, GraphQL, tRPC |
| Frameworks | backend/frameworks/ | NestJS, Fastify, Hono |

### Data
| Subcategory | Path | Contents |
|-------------|------|----------|
| Databases | data/databases/ | PostgreSQL, MongoDB, SQLite, Neon, PlanetScale, Turso, Supabase |
| ORMs | data/orms/ | Prisma, Drizzle, TypeORM |
| Caching | data/caching/ | Redis, Valkey |

### Testing
| Subcategory | Path | Contents |
|-------------|------|----------|
| Unit | testing/unit/ | Vitest, Jest |
| E2E | testing/e2e/ | Playwright, Cypress |
| Component | testing/component/ | React Testing Library |
| Mocking | testing/mocking/ | MSW |
| Patterns | testing/patterns/ | Contract Testing (Pact), Accessibility Testing |

### Infrastructure
| Subcategory | Path | Contents |
|-------------|------|----------|
| Containers | infrastructure/containers/ | Docker, Podman |
| Orchestration | infrastructure/orchestration/ | Kubernetes, AWS Lambda, Serverless Framework, Cloudflare Workers |
| Observability | infrastructure/observability/ | OpenTelemetry, HyperDX |
| Desktop | infrastructure/desktop/ | Tauri, Electron |

### Security
| Subcategory | Path | Contents |
|-------------|------|----------|
| Authentication | security/authentication/ | Auth.js, Lucia, Clerk, Better Auth |
| Dependency Scanning | security/dependency-scanning/ | Socket.dev, Snyk |
| Standards | security/standards/ | OWASP 2026 |

### Tooling
| Subcategory | Path | Contents |
|-------------|------|----------|
| Build | tooling/build/ | Vite |
| Formatting | tooling/formatting/ | Prettier |
| Git Hooks | tooling/git-hooks/ | Husky, Commitlint |
| HTTP Clients | tooling/http-clients/ | Axios, Ky, Fetch API |
| Linting | tooling/linting/ | Biome, ESLint |
| Logging | tooling/logging/ | Winston, Pino |
| Monorepos | tooling/monorepos/ | Turborepo, Nx |
| Runtime | tooling/runtime/ | WebAssembly |
| UI Development | tooling/ui-development/ | Storybook |
| Validation | tooling/validation/ | Zod |
| Versioning | tooling/versioning/ | Semantic Release |

### Patterns
| Subcategory | Path | Contents |
|-------------|------|----------|
| Architecture | patterns/ | DDD, CQRS, Event-Driven Architecture, Repository Pattern |
| Algorithms | patterns/algorithms/ | Debounce/Throttle, Memoization |

---

## Usage

The TKB is queried by the orchestrator via `aidd_query_tkb` and `aidd_get_tkb_entry` MCP tools, or directly by reading entries. Each entry follows a standardized schema with frontmatter (name, category, maturity) and sections for metrics, use cases, trade-offs, alternatives, and references.

See [workflows/technology-selection.md](../workflows/technology-selection.md) for the structured selection process.
