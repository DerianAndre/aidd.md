---
name: docs
description: Comprehensive documentation sync and maintenance — keeps code and docs aligned, codifies knowledge, validates artifacts, and generates release documentation
complexity: medium
estimated_duration: 30 minutes
skills_required:
  - knowledge-architect
  - contract-architect
  - system-architect
model_strategy: parallel
---

# Documentation Sync & Maintenance

> **Purpose:** Ensure all documentation remains synchronized with code changes. Generates and updates technical documentation, API references, architecture diagrams, user guides, changelogs, and codifies tribal knowledge into searchable artifacts.

## Invocation

| Type       | Items                          |
| ---------- | ------------------------------ |
| **Skills** | verification-before-completion |
| **MCPs**   | Context7                       |

**Use when:**

- After major feature implementation
- Before release (documentation freeze)
- Post-refactoring (architecture changes)
- API contract updates
- Quarterly documentation reviews
- New developer onboarding gaps identified

---

## Scope

- **Sync Code to Docs:** API changes, function signatures, examples, architecture diagrams
- **Codify Knowledge:** Tribal knowledge, architectural decisions, runbooks to searchable markdown
- **Validate Docs:** Links, code examples, API contracts, coverage
- **Generate Release Docs:** Changelogs, release notes, migration guides

---

## Phase 1: Code Analysis (Tier 3)

**Indicator**: `[aidd.md] Workflow - docs (Code Analysis)`

**Skill:** `knowledge-architect` (Tier 3)

- **Task:** Analyze codebase for changes since last documentation update
- **Input:** Git diff, file tree, recent commits
- **Output:**
  - Changed files list
  - New functions/classes/exports
  - Deleted/renamed entities
  - Breaking changes identified

### Identify Changes

```bash
# View modified files since divergence from main
git diff main..HEAD --name-only

# View changes in public functions
git diff main..HEAD -- "src/**/*.ts" | grep "export"
```

### Function Signature Changes

If a public function signature changed, identify the before/after:

```typescript
// Before
export function calculateDiscount(price: number, tier: string): number;

// After (breaking change)
export function calculateDiscount(
  price: number,
  tier: "bronze" | "silver" | "gold"
): number;
```

**Update checklist:**

- [ ] JSDoc on the function
- [ ] `docs/api/functions.md` (if it exists)
- [ ] CHANGELOG.md with breaking change notice
- [ ] Migration guide (if public API)

---

## Phase 2: Documentation Generation (Parallel - Tier 1 + Tier 3)

**Indicator**: `[aidd.md] Workflow - docs (Documentation Generation)`

Stages 2-5 are independent and can run concurrently:

```
Phase 1 (Code Analysis)
       |
  +----+----+----+----+
  |    |    |    |    |
  S2   S3   S4   S5  S5b    (Parallel)
  |    |    |    |    |
  +----+----+----+----+
       |
Phase 3 (Changelog & Release)
```

### Stage 2: API Documentation

**Skill:** `contract-architect` (Tier 1)

- **Task:** Generate/update API reference from OpenAPI spec and code annotations
- **Input:** OpenAPI spec, JSDoc/TSDoc comments, route handlers
- **Output:**
  - `API_REFERENCE.md` - Complete endpoint documentation
  - Request/response examples
  - Authentication requirements
  - Error codes and handling

#### API Documentation Sync

**If OpenAPI spec changed:**

```bash
# 1. Generate OpenAPI from code (if auto-generated)
npm run generate:openapi

# 2. Compare with committed version
git diff docs/api-spec.yaml

# 3. If there are differences, update docs
```

**Check:**

- [ ] `docs/api-reference.md` reflects new endpoints
- [ ] Request/response examples updated
- [ ] Status codes documented

#### API Documentation Format

Use this standard format for endpoint documentation:

```markdown
## Endpoint Name

`METHOD /path/:param`

**Description:** What this endpoint does

**Authentication:** Required/Optional

**Parameters:**
| Name | Type   | Required | Description |
| ---- | ------ | -------- | ----------- |
| id   | string | Yes      | User ID     |

**Request Example:**
\`\`\`http
GET /users/123
Authorization: Bearer token
\`\`\`

**Response:**
\`\`\`json
{
"id": "123",
"name": "John Doe"
}
\`\`\`

**Error Codes:**

- `404` - User not found
- `401` - Unauthorized
```

### Stage 3: Architecture Diagrams

**Skill:** `system-architect` (Tier 1)

- **Task:** Update C4 diagrams to reflect current architecture
- **Input:** Code structure, component dependencies, infrastructure config
- **Output:**
  - `architecture.mmd` - Updated C4 diagrams (Context, Container, Component)
  - Component interaction diagrams
  - Deployment architecture
  - Data flow diagrams

### Stage 4: User Guide

**Skill:** `knowledge-architect` (Tier 3)

- **Task:** Update end-user documentation with new features
- **Input:** Feature specs, UI changes, user stories
- **Output:**
  - `USER_GUIDE.md` - Step-by-step user instructions
  - Screenshots/GIFs of new features
  - Troubleshooting section
  - FAQ updates

### Stage 5: Developer Documentation

**Skill:** `knowledge-architect` (Tier 3)

- **Task:** Update developer onboarding, setup guides, contributing docs
- **Input:** Package.json, environment config, development workflows
- **Output:**
  - `CONTRIBUTING.md` - Developer guidelines
  - `DEVELOPMENT.md` - Local setup instructions
  - Code architecture guide
  - Testing documentation

#### Code Examples in Docs

Validate that examples compile:

```bash
# Extract code blocks from markdown
npx markdown-code-runner docs/**/*.md --language typescript

# If it fails, update examples
```

**Example doc update:**

```markdown
<!-- docs/guides/authentication.md -->

## Login Example

\`\`\`typescript
// OUTDATED (before change)
const user = await authService.login(email, password);

// UPDATED (after change)
const user = await authService.login({ email, password });
\`\`\`
```

### Stage 5b: Codify Knowledge (Tribal Knowledge to Markdown)

**Skill:** `knowledge-architect` (Tier 3)

- **Task:** Convert undocumented tribal knowledge into structured, searchable artifacts
- **Input:** Team questions, undocumented decisions, shared scripts/commands

#### Identify Knowledge Gaps

Ask the team:

- What recurring questions do new devs have?
- Which architectural decisions are not documented?
- What scripts/commands are repeatedly shared on Slack?

**Example of tribal knowledge:**

> "To deploy to staging, first run `npm run build:staging`,
> then `scp` the bundle to server-staging-01, and restart PM2.
> If it fails, rollback with `git revert` and re-deploy."

#### Create Runbook

Convert knowledge to a structured document:

```markdown
<!-- docs/runbooks/deploy-staging.md -->

# Runbook: Deploy to Staging

## Prerequisites

- [ ] Access to staging server (`ssh user@staging.example.com`)
- [ ] PM2 installed on server

## Steps

### 1. Build Application

\`\`\`bash
npm run build:staging
\`\`\`

### 2. Deploy to Server

\`\`\`bash
scp -r dist/\* user@staging.example.com:/var/www/app/
\`\`\`

### 3. Restart Application

\`\`\`bash
ssh user@staging.example.com "pm2 restart app"
\`\`\`

### 4. Verify deployment

\`\`\`bash
curl https://staging.example.com/health

# Expected: {"status": "ok"}

\`\`\`

## Rollback

If deployment fails:

\`\`\`bash

# On local

git revert HEAD
npm run build:staging

# On server

ssh user@staging.example.com "pm2 restart app"
\`\`\`

## Troubleshooting

### Issue: PM2 not found

**Cause:** PM2 not installed globally
**Fix:** `npm install -g pm2`
```

#### Codify Architectural Decisions

Create ADR (Architecture Decision Record):

**Activate skill:** `system-architect`

```markdown
<!-- docs/adr/003-use-prisma-orm.md -->

# ADR-003: Use Prisma ORM for Database Access

## Status

Accepted (2026-01-14)

## Context

We need an ORM for PostgreSQL access. Team has experience with:

- TypeORM (used in old project)
- Prisma (newer, better TypeScript support)
- Sequelize (legacy)

## Decision

Use **Prisma** as our ORM.

## Consequences

### Positive

- Excellent TypeScript support (generated types)
- Schema-first approach (easy migrations)
- Good performance (prepared statements)
- Active community

### Negative

- Learning curve for team (not familiar)
- Slightly slower than raw SQL (acceptable trade-off)

### Risks

- Vendor lock-in (mitigate: use Repository pattern)
- Breaking changes in Prisma updates (pin versions)
```

---

## Phase 3: Changelog, Validation & Release Notes (Tier 3)

**Indicator**: `[aidd.md] Workflow - docs (Changelog & Validation)`

### Stage 6: Changelog Generation

**Skill:** `knowledge-architect` (Tier 3)

- **Task:** Generate changelog from Git commits and PRs
- **Input:** Git history, PR descriptions, semantic version
- **Output:**
  - `CHANGELOG.md` - Version history (Keep a Changelog format)
  - `RELEASE_NOTES.md` - User-facing release summary
  - Migration guide (if breaking changes)
  - Deprecation notices

#### Changelog Format (Keep a Changelog)

```markdown
## [VERSION] - YYYY-MM-DD

### Added

- New features

### Changed

- Changes to existing functionality

### Deprecated

- Soon-to-be removed features

### Removed

- Removed features

### Fixed

- Bug fixes

### Security

- Security fixes
```

### Stage 7: Validate Documentation

**Indicator**: `[aidd.md] Workflow - docs (Validation)`

#### Check Broken Links

```bash
# Install markdown-link-check
npm install -g markdown-link-check

# Check all docs
find docs -name "*.md" -exec markdown-link-check {} \;
```

**Fix broken links:**

- Internal links: Update to correct path
- External links: Update URL or mark as archived

#### Verify Code Examples Compile

```bash
# Extract code blocks
npx markdown-code-extractor docs/**/*.md --output temp/

# Try to compile them
npx tsc temp/**/*.ts --noEmit

# If errors, fix examples
```

#### Validate API Contracts

If you have an OpenAPI spec:

```bash
# Validate spec syntax
npm run validate:openapi docs/api-spec.yaml

# Compare spec vs running server
npx openapi-diff docs/api-spec.yaml http://localhost:3000/api-json
```

### Stage 8: Documentation Coverage Report

**Indicator**: `[aidd.md] Workflow - docs (Coverage Report)`

#### Generate Missing Docs Report

```bash
# List public exports without JSDoc
npx typedoc --validation.notDocumented --emit none src/
```

**Output example:**

```
Warning: getUserById is not documented (src/users/service.ts:45)
Warning: UserRepository has no description (src/users/repository.ts:12)
```

**Fix:**

```typescript
/**
 * Retrieves a user by their unique ID.
 *
 * @param id - The user's UUID
 * @returns User object or null if not found
 * @throws {ValidationError} If ID format is invalid
 */
export async function getUserById(id: string): Promise<User | null> {
  // ...
}
```

---

## Artifacts Produced

### API Documentation

- `docs/API_REFERENCE.md` - Complete API documentation
- `docs/api-examples/` - Request/response examples
- `docs/authentication.md` - Auth flow documentation

### Architecture

- `docs/architecture.mmd` - C4 diagrams (Context, Container, Component)
- `docs/deployment.md` - Deployment architecture
- `docs/data-flow.md` - Data flow diagrams

### User Documentation

- `docs/USER_GUIDE.md` - End-user instructions
- `docs/TROUBLESHOOTING.md` - Common issues and solutions
- `docs/FAQ.md` - Frequently asked questions

### Developer Documentation

- `CONTRIBUTING.md` - Contribution guidelines
- `DEVELOPMENT.md` - Local development setup
- `docs/ARCHITECTURE.md` - Code organization
- `docs/TESTING.md` - Testing guide

### Release Documentation

- `CHANGELOG.md` - Version history
- `RELEASE_NOTES.md` - User-facing release notes
- `docs/MIGRATION.md` - Migration guide (if applicable)

### Knowledge Artifacts

- `docs/runbooks/` - Operational runbooks
- `docs/adr/` - Architecture Decision Records

---

## Documentation Types

| Type                      | Purpose                           | Update When                         |
| ------------------------- | --------------------------------- | ----------------------------------- |
| **README.md**             | Quick start, overview             | Project setup changes, new features |
| **API Reference**         | Complete function/class reference | Code changes (automated)            |
| **Guides (Tutorials)**    | Step-by-step learning             | Workflow changes, new APIs          |
| **Runbooks (Operations)** | Deployment, incident response     | Process changes                     |
| **ADRs (Decisions)**      | Why we chose X over Y             | Major architectural decision        |
| **CHANGELOG**             | Version history                   | Every release (automated)           |

---

## Success Criteria

### Accuracy

- [ ] All new features documented
- [ ] Breaking changes highlighted
- [ ] Code examples tested and working
- [ ] Links validated (no 404s)

### Completeness

- [ ] API reference covers all endpoints
- [ ] Architecture diagrams reflect current state
- [ ] User guide includes all features
- [ ] Changelog follows semantic versioning
- [ ] No undocumented public APIs

### Quality

- [ ] No spelling/grammar errors
- [ ] Screenshots up-to-date
- [ ] Code examples use latest syntax
- [ ] Consistent formatting throughout

### Sync Validation

- [ ] All deprecated features noted
- [ ] Migration paths provided for breaking changes
- [ ] Version numbers consistent across docs
- [ ] Important decisions documented (ADR)
- [ ] Runbooks for new processes
- [ ] FAQ updated

---

## Automation (CI/CD)

### Doc Validation in CI

```yaml
# .github/workflows/docs.yml
name: Documentation

on: [pull_request]

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check broken links
        run: |
          npm install -g markdown-link-check
          find docs -name "*.md" -exec markdown-link-check {} \;

      - name: Validate code examples
        run: |
          npx markdown-code-runner docs/**/*.md --language typescript

      - name: Check OpenAPI sync
        run: |
          npm run generate:openapi
          git diff --exit-code docs/api-spec.yaml || \
            (echo "OpenAPI spec out of sync!" && exit 1)
```

### Auto-Generate Docs from Code

```json
// package.json
{
  "scripts": {
    "docs:api": "typedoc --out docs/api src/",
    "docs:openapi": "ts-node scripts/generate-openapi.ts",
    "docs:all": "npm run docs:api && npm run docs:openapi"
  }
}
```

**Run on every release:**

```yaml
# .github/workflows/release.yml
- name: Generate documentation
  run: npm run docs:all

- name: Commit updated docs
  run: |
    git config user.name "github-actions"
    git add docs/
    git commit -m "docs: auto-generate API docs" || true
    git push
```

### Automation Opportunities

- **Code Scan:** Can be automated via git hooks
- **Changelog:** Use conventional commits for auto-generation
- **API Docs:** OpenAPI spec to Markdown via Redoc/Swagger

---

## Cost Estimation

| Tier       | Stages                                                                       | Est. Tokens        | Cost                | Total      |
| ---------- | ---------------------------------------------------------------------------- | ------------------ | ------------------- | ---------- |
| **Tier 1** | 2 (API Docs, Architecture)                                                   | ~12,000            | See model-matrix.md | ~$0.10     |
| **Tier 3** | 6 (Code Scan, User Guide, Dev Docs, Codify Knowledge, Changelog, Validation) | ~18,000            | See model-matrix.md | ~$0.03     |
| **Total**  | **8 stages**                                                                 | **~30,000 tokens** | **Mixed**           | **~$0.13** |

---

## Example Execution

### Input

```
Trigger: Release v2.0.0
Changes:
- New OAuth2 authentication
- GraphQL API added
- Breaking: REST API pagination changed
- UI redesign (dashboard)
```

### Stage-by-Stage Output

**Stage 1 (Code Scan):**

```markdown
# Changes Detected

## New Files

- src/auth/oauth2.ts (OAuth implementation)
- src/graphql/schema.ts (GraphQL schema)
- src/components/Dashboard.tsx (UI redesign)

## Modified Files

- src/api/pagination.ts (BREAKING CHANGE)
- src/routes/users.ts (Auth integration)

## Breaking Changes

- REST API pagination: `page` param renamed to `cursor`
```

**Stage 2 (API Docs):**

```markdown
# API Reference v2.0.0

## Authentication

### OAuth2 Flow

\`\`\`http
POST /auth/oauth/authorize
Content-Type: application/json

{
"provider": "google",
"redirect_uri": "https://app.example.com/callback"
}
\`\`\`

## GraphQL API (New in v2.0.0)

Endpoint: `POST /graphql`

### Example Query

\`\`\`graphql
query GetUser($id: ID!) {
user(id: $id) {
name
email
}
}
\`\`\`
```

**Stage 6 (Changelog):**

```markdown
# Changelog

## [2.0.0] - 2026-01-15

### Added

- OAuth2 authentication (Google, GitHub, Microsoft)
- GraphQL API alongside REST
- New dashboard UI with real-time updates

### Changed

- **BREAKING:** REST API pagination now uses cursor-based pagination
  - Old: `?page=2&limit=10`
  - New: `?cursor=xyz&limit=10`

### Deprecated

- Basic Auth (will be removed in v3.0.0)

### Migration Guide

See [MIGRATION.md](./MIGRATION.md) for upgrading from v1.x to v2.0.0
```

---

## Documentation Standards

### Markdown Style

- **Headings:** Title case, hierarchical (H1 then H2 then H3)
- **Code blocks:** Always specify language (`typescript`, `bash`, `json`)
- **Links:** Use relative paths for internal docs
- **Lists:** Consistent bullet style (-, not *)

### Documentation Debt Prevention

- Run this workflow **before every release**
- Enforce documentation review in PR process
- Track documentation coverage metrics

---

## Skills & References

- **Skills:** `knowledge-architect`, `contract-architect`, `system-architect`
- **Tools:**
  - [TypeDoc](https://typedoc.org/)
  - [markdown-link-check](https://github.com/tcort/markdown-link-check)
  - [ADR Tools](https://github.com/npryce/adr-tools)

---

**This workflow ensures documentation never falls behind code.**
