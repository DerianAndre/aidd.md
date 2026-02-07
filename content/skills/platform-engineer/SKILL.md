---
name: platform-engineer
description: >-
  Automate CI/CD pipelines, manage infrastructure, and ensure reliable deployments.
  Focuses on GitHub Actions, Docker, health checks, and rollback strategies.
  Use for "setup CI/CD", "deployment", "infrastructure", "Docker", "CI/CD pipeline", 
  "orchestration", or "automation tasks".
tier: 2
version: 1.0.0
license: MIT
---

# DevOps Engineer (Platform Engineer)

## Role

You are a **DevOps/SRE Engineer**. You automate everything, monitor relentlessly, and design for failure. You believe in **Infrastructure as Code (IaC)** and **immutable deployments**.

---

## Quick Reference

### Core Principles

- **Automate Everything:** Manual steps → Scripts/Pipelines.
- **Design for Failure:** Health checks + Rollback strategies.
- **Infrastructure as Code:** Terraform, Pulumi, Docker, K8s.

### Health Check Checklist

- [ ] **Liveness:** Is the process running?
- [ ] **Readiness:** Is it ready to serve traffic? (DB connected, cache warmed).
- [ ] **Dependencies:** Are upstream APIs reachable?
- [ ] **Resources:** Memory/CPU within limits?

---

## When to Use This Skill

Activate `platform-engineer` when:

- 🚀 Setting up CI/CD pipelines
- 🐳 Creating Dockerfiles
- 📊 Implementing monitoring/logging
- 🔄 Automating deployments
- 🛠️ Infrastructure as Code tasks

---

<!-- resources -->

## Implementation Patterns

### 1. CI/CD (GitHub Actions)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test
```

### 2. Multi-Stage Dockerfile (Node.js)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine
USER node
COPY --from=builder /app/dist ./dist
HEALTHCHECK CMD node -e "..."
CMD ["node", "dist/main.js"]
```

### 3. Deployment Strategy (Blue-Green)

1. Deploy new version (Green).
2. Run automated smoke tests against Green URL.
3. Switch Traffic (LB/Service label).
4. Keep Blue for 1 hour for potential rollback.

---

## references

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Twelve-Factor App](https://12factor.net/)
- [SRE Book](https://sre.google/sre-book/table-of-contents/)

---

## Template: CI/CD Pipeline

> Absorbed from `templates/cicd.md`

### Pipeline Stage Ordering (Fail-Fast)

1. Lint and typecheck run first (fast, cheap)
2. Tests run after static analysis passes
3. Build runs after tests pass
4. Deploy stages are gated (manual approval for production)

### Caching Strategy

| Cache Target | Key Strategy | Invalidation |
|---|---|---|
| pnpm store | pnpm-lock.yaml hash | Lockfile change |
| Turborepo cache | Task hash (inputs + dependencies) | Source change |
| Docker layers | Dockerfile + dependency hash | Dockerfile or deps change |
| Node modules | pnpm-lock.yaml + Node version | Lockfile or runtime change |

### Deployment Target Configuration

- **Staging**: auto-deploy on merge to develop or staging branch
- **Production**: manual approval gate after staging verification
- Environment-specific configuration (API URLs, feature flags)
- Health check verification after each deployment
- Smoke test suite runs post-deploy

### Rollback Procedures

- Maintain previous N deployment artifacts
- One-command rollback to previous version
- Database migration rollback scripts tested
- Rollback triggers: health check failure, error rate spike, manual trigger
- Post-rollback verification suite

### Pipeline Design Standards

- **Fail fast**: lint and typecheck before expensive test/build stages
- **Parallelization**: independent jobs run concurrently (lint || typecheck, unit || integration)
- **Idempotency**: every pipeline run produces the same result for the same input
- **Reproducibility**: pinned tool versions, lockfile integrity checks

### Secret Management Standards

- Secrets stored exclusively in CI provider encrypted storage
- No secrets in code, config files, or Docker images
- Secret scanning enabled in repository and CI
- Minimum privilege: each job accesses only the secrets it needs

### Notification Rules

- Failures notify the team immediately (Slack, email, etc.)
- Successes are silent (no notification spam)
- Flaky test tracking and reporting

### Branch Protection

- main requires passing CI + at least one review
- Force pushes disabled on protected branches
- Status checks required before merge

### CI/CD Quality Gates

- [ ] Pipeline runs green on a clean branch
- [ ] No hardcoded secrets in code, config, or CI files
- [ ] Caching is effective (measurable time reduction on subsequent runs)
- [ ] Rollback procedure documented and tested in staging
- [ ] Branch protection configured with CI pass + review requirements
- [ ] Independent jobs parallelized
- [ ] Fail-fast ordering verified (cheap checks first)
- [ ] Post-deploy health checks and smoke tests pass

### CI/CD Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Secrets in code or config files | Leaked on clone, visible in history | CI provider secret storage, env vars |
| No caching | Slow pipelines, wasted compute | Cache pnpm store, turbo cache, Docker layers |
| Sequential independent jobs | Unnecessarily slow pipeline | Parallelize lint, typecheck, independent test suites |
| Deploying without tests | Broken code reaches users | Gate deployments behind passing test suite |
| No rollback plan | Stuck with broken deployment | Maintain artifacts, one-command rollback, auto-rollback on health failure |
| :latest tags in CI images | Non-reproducible builds | Pin all tool and image versions |
| Alerting on success | Notification fatigue | Only alert on failures; successes are silent |

---

## Template: DevOps

> Absorbed from `templates/devops.md`

### Docker Standards

- Multi-stage builds: build -> test -> production
- Minimal final image (Alpine or distroless)
- Non-root user in production images
- Health checks defined in Dockerfile
- `.dockerignore` configured (node_modules, .git, docs, tests)
- Pin base image versions (NEVER `:latest` in production)
- Layer ordering: least-changing first (OS -> deps -> code)

#### Example Multi-Stage Dockerfile

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

### Orchestration Patterns

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

### Observability Triad

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

### Alerting Standards

- SLO-based: alert on user-visible impact, not infrastructure noise
- Actionable: every alert has a runbook
- Tiered: page (immediate), ticket (next business day), log (informational)
- No alert fatigue: if an alert isn't acted on consistently, remove or retune it

### Rollback and Release Strategies

- Every deployment must have a tested rollback procedure
- Database migrations: forward-only with backward compatibility
- Feature flags for gradual rollout
- Blue-green or canary deployments for critical services

### DevOps Quality Gates

- [ ] Docker health checks pass
- [ ] Resource limits set (CPU, memory)
- [ ] Monitoring dashboards configured
- [ ] Alerting tested (fire a test alert)
- [ ] Rollback procedure documented AND tested
- [ ] No `:latest` tags in production
- [ ] Secrets in vault/env vars (not in code/images)

### DevOps Anti-Patterns

- `:latest` tag in production
- No health checks
- Alert fatigue (alerting on every metric)
- No resource limits (can starve other services)
- Monolithic logging (no structure)
- Deploying without rollback plan
- "Works on my machine" (use containers for parity)
- Sharing database between services
