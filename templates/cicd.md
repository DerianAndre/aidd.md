# CI/CD Pipeline --- Design and Implementation
> Automated pipeline orchestration from lint to production with fail-fast strategy and zero-secret-leak tolerance.

**Effort Tier**: 2 (STANDARD_EFFORT)
**AIDD Skill**: `skills/platform-engineer/SKILL.md` (Infrastructure Automation)

---

## Purpose

Design and implement CI/CD pipelines that enforce code quality gates, automate deployments, and maintain security boundaries. Pipelines follow the principle of failing fast on cheap checks before running expensive operations.

---

## Preconditions

- [ ] Project deployed or ready for deployment
- [ ] Infrastructure requirements known and documented
- [ ] CI provider selected (GitHub Actions, GitLab CI, etc.)
- [ ] Deployment targets identified (staging, production)
- [ ] Secret management strategy decided
- [ ] Branch protection rules agreed upon by team

---

## Sub-Agent Roles

### Platform Engineer
- Pipeline architecture and stage ordering
- Caching strategy design (pnpm store, Turborepo cache, Docker layers)
- Parallelization of independent jobs
- Deployment target configuration
- Rollback procedure implementation

### Security Engineer
- Secret management review (no hardcoded values)
- Environment variable configuration in CI provider
- Branch protection and merge requirements
- Supply chain security (dependency pinning, lockfile integrity)
- Secret scanning integration

---

## Process Steps

### Step 1: Define Pipeline Stages

Establish the pipeline flow with fail-fast ordering:

- Lint and typecheck run first (fast, cheap)
- Tests run after static analysis passes
- Build runs after tests pass
- Deploy stages are gated (manual approval for production)

### Step 2: Configure Environment Variables

- Store all secrets in the CI provider secret management
- Use environment-specific variable groups (staging, production)
- Rotate secrets on a defined schedule
- Audit secret access logs
- Never echo or log secret values

### Step 3: Implement Caching Strategy

| Cache Target | Key Strategy | Invalidation |
|---|---|---|
| pnpm store | pnpm-lock.yaml hash | Lockfile change |
| Turborepo cache | Task hash (inputs + dependencies) | Source change |
| Docker layers | Dockerfile + dependency hash | Dockerfile or deps change |
| Node modules | pnpm-lock.yaml + Node version | Lockfile or runtime change |

### Step 4: Configure Deployment Targets

- **Staging**: auto-deploy on merge to develop or staging branch
- **Production**: manual approval gate after staging verification
- Environment-specific configuration (API URLs, feature flags)
- Health check verification after each deployment
- Smoke test suite runs post-deploy

### Step 5: Set Up Rollback Procedures

- Maintain previous N deployment artifacts
- One-command rollback to previous version
- Database migration rollback scripts tested
- Rollback triggers: health check failure, error rate spike, manual trigger
- Post-rollback verification suite

### Step 6: Verify Pipeline Integrity

- Pipeline runs green end-to-end on a clean branch
- Secrets are not leaked in logs or artifacts
- Caching reduces subsequent run times measurably
- Rollback procedure tested in staging
- Branch protection enforces CI pass + review

---

## Standards

### Pipeline Design
- **Fail fast**: lint and typecheck before expensive test/build stages
- **Parallelization**: independent jobs run concurrently (lint || typecheck, unit || integration)
- **Idempotency**: every pipeline run produces the same result for the same input
- **Reproducibility**: pinned tool versions, lockfile integrity checks

### Secret Management
- Secrets stored exclusively in CI provider encrypted storage
- No secrets in code, config files, or Docker images
- Secret scanning enabled in repository and CI
- Minimum privilege: each job accesses only the secrets it needs

### Notifications
- Failures notify the team immediately (Slack, email, etc.)
- Successes are silent (no notification spam)
- Flaky test tracking and reporting

### Branch Protection
- main requires passing CI + at least one review
- Force pushes disabled on protected branches
- Status checks required before merge

---

## Quality Gates

- [ ] Pipeline runs green on a clean branch
- [ ] No hardcoded secrets in code, config, or CI files
- [ ] Caching is effective (measurable time reduction on subsequent runs)
- [ ] Rollback procedure documented and tested in staging
- [ ] Branch protection configured with CI pass + review requirements
- [ ] Independent jobs parallelized
- [ ] Fail-fast ordering verified (cheap checks first)
- [ ] Post-deploy health checks and smoke tests pass

---

## Anti-Patterns

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

## Cross-References

- **Platform Engineer skill**: `skills/platform-engineer/SKILL.md`
- **Security rules**: `rules/security.md`
- **Feature branch workflow**: `workflows/feature-branch.md`
- **Global rules**: `rules/global.md`
- **Docker knowledge**: `knowledge/infrastructure/containers/docker.md`
- **Turborepo knowledge**: `knowledge/tooling/monorepos/turborepo.md`
