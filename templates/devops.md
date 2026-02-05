# DevOps — Infrastructure, Containers & Observability

> Build once, deploy anywhere. Monitor everything that matters.

**Effort Tier**: 2 (STANDARD)
**AIDD Skill**: `skills/platform-engineer/SKILL.md` (infrastructure)

---

## Preconditions

- Application ready for deployment
- Infrastructure requirements defined
- Target environments identified (dev, staging, production)

## Sub-Agent Roles

| Role | Focus |
|------|-------|
| **Platform Engineer** | CI/CD, containers, orchestration, deployment |
| **Site Reliability Engineer** | Monitoring, alerting, SLOs, incident response |

## Process

### Step 1 — Containerization

#### Docker Standards
- Multi-stage builds: build → test → production
- Minimal final image (Alpine or distroless)
- Non-root user in production images
- Health checks defined in Dockerfile
- `.dockerignore` configured (node_modules, .git, docs, tests)
- Pin base image versions (NEVER `:latest` in production)
- Layer ordering: least-changing first (OS → deps → code)

#### Example Multi-Stage
```dockerfile
# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Production stage
FROM node:22-alpine AS production
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app
WORKDIR /app
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/node_modules ./node_modules
USER app
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:3000/health || exit 1
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Step 2 — Orchestration

#### Docker Compose (Development)
- Service definitions for all components
- Volume mounts for live reload
- Network isolation
- Environment variable files (.env)

#### Kubernetes (Production)
- Resource limits AND requests defined
- Liveness and readiness probes
- Horizontal Pod Autoscaler
- Secrets via K8s Secrets or external vault
- Network policies for pod-to-pod communication
- Rolling updates with maxUnavailable/maxSurge

### Step 3 — Monitoring (Observability Triad)

#### Logs
- Structured JSON format
- Correlation IDs across services
- No PII in logs
- Centralized collection (ELK, Loki, CloudWatch)
- Log levels: error, warn, info, debug (configurable per environment)

#### Metrics
- **RED Method** (services): Rate, Errors, Duration
- **USE Method** (resources): Utilization, Saturation, Errors
- Key metrics: request rate, error rate, p50/p95/p99 latency
- Business metrics: signups, conversions, active users
- Prometheus for collection, Grafana for dashboards

#### Traces
- Distributed tracing (OpenTelemetry)
- Request flow visualization across services
- Latency breakdown per service/operation
- Error propagation tracking

### Step 4 — Alerting
- SLO-based: alert on user-visible impact, not infrastructure noise
- Actionable: every alert has a runbook
- Tiered: page (immediate), ticket (next business day), log (informational)
- No alert fatigue: if an alert isn't acted on consistently, remove or retune it

### Step 5 — Rollback
- Every deployment must have a tested rollback procedure
- Database migrations: forward-only with backward compatibility
- Feature flags for gradual rollout
- Blue-green or canary deployments for critical services

## Quality Gates

- [ ] Docker health checks pass
- [ ] Resource limits set (CPU, memory)
- [ ] Monitoring dashboards configured
- [ ] Alerting tested (fire a test alert)
- [ ] Rollback procedure documented AND tested
- [ ] No `:latest` tags in production
- [ ] Secrets in vault/env vars (not in code/images)

## Anti-Patterns

- `:latest` tag in production
- No health checks
- Alert fatigue (alerting on every metric)
- No resource limits (can starve other services)
- Monolithic logging (no structure)
- Deploying without rollback plan
- "Works on my machine" (use containers for parity)
- Sharing database between services

---

## Cross-References

- **Platform Engineer skill**: `skills/platform-engineer/SKILL.md`
- **Security rules**: `rules/security.md`
- **Docker knowledge**: `knowledge/infrastructure/containers/docker.md`
- **Kubernetes knowledge**: `knowledge/infrastructure/orchestration/kubernetes.md`
- **OpenTelemetry knowledge**: `knowledge/infrastructure/observability/opentelemetry.md`
- **Global rules**: `rules/global.md`
