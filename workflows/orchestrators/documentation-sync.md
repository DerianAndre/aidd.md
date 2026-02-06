---
name: documentation-sync
description: Comprehensive documentation update ensuring code and docs stay in sync
complexity: medium
estimated_duration: 30 minutes
skills_required:
  - knowledge-architect
  - contract-architect
  - system-architect
model_strategy: parallel
---

# Documentation Sync Orchestrator

## Purpose

Ensure all documentation remains synchronized with code changes. Generates and updates technical documentation, API references, architecture diagrams, user guides, and changelogs.

**Use when:**

- After major feature implementation
- Before release (documentation freeze)
- Post-refactoring (architecture changes)
- API contract updates
- Quarterly documentation reviews

---

## Workflow Stages

### Phase 1: Code Analysis (Tier 3)

**1. Code Scanning:** `knowledge-architect` (Tier 3)

- **Task:** Analyze codebase for changes since last documentation update
- **Input:** Git diff, file tree, recent commits
- **Output:**
  - Changed files list
  - New functions/classes/exports
  - Deleted/renamed entities
  - Breaking changes identified

### Phase 2: Documentation Generation (Parallel - Tier 1 + Tier 3)

**2. API Documentation:** `contract-architect` (Tier 1)

- **Task:** Generate/update API reference from OpenAPI spec and code annotations
- **Input:** OpenAPI spec, JSDoc/TSDoc comments, route handlers
- **Output:**
  - `API_REFERENCE.md` - Complete endpoint documentation
  - Request/response examples
  - Authentication requirements
  - Error codes and handling

**3. Architecture Diagrams:** `system-architect` (Tier 1)

- **Task:** Update C4 diagrams to reflect current architecture
- **Input:** Code structure, component dependencies, infrastructure config
- **Output:**
  - `architecture.mmd` - Updated C4 diagrams (Context, Container, Component)
  - Component interaction diagrams
  - Deployment architecture
  - Data flow diagrams

**4. User Guide:** `knowledge-architect` (Tier 3)

- **Task:** Update end-user documentation with new features
- **Input:** Feature specs, UI changes, user stories
- **Output:**
  - `USER_GUIDE.md` - Step-by-step user instructions
  - Screenshots/GIFs of new features
  - Troubleshooting section
  - FAQ updates

**5. Developer Documentation:** `knowledge-architect` (Tier 3)

- **Task:** Update developer onboarding, setup guides, contributing docs
- **Input:** Package.json, environment config, development workflows
- **Output:**
  - `CONTRIBUTING.md` - Developer guidelines
  - `DEVELOPMENT.md` - Local setup instructions
  - Code architecture guide
  - Testing documentation

### Phase 3: Changelog & Release Notes (Tier 3)

**6. Changelog Generation:** `knowledge-architect` (Tier 3)

- **Task:** Generate changelog from Git commits and PRs
- **Input:** Git history, PR descriptions, semantic version
- **Output:**
  - `CHANGELOG.md` - Version history (Keep a Changelog format)
  - `RELEASE_NOTES.md` - User-facing release summary
  - Migration guide (if breaking changes)
  - Deprecation notices

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

### Quality

- [ ] No spelling/grammar errors
- [ ] Screenshots up-to-date
- [ ] Code examples use latest syntax
- [ ] Consistent formatting throughout

### Sync Validation

- [ ] No undocumented public APIs
- [ ] All deprecated features noted
- [ ] Migration paths provided for breaking changes
- [ ] Version numbers consistent across docs

---

## Cost Estimation

| Tier | Stages | Est. Tokens | Cost | Total |
| --------- | ---------------------------------------------- | ------------------ | --------------------- | ---------- |
| **Tier 1** | 2 (API Docs, Architecture) | ~12,000 | See model-matrix.md | ~$0.10 |
| **Tier 3** | 4 (Code Scan, User Guide, Dev Docs, Changelog) | ~15,000 | See model-matrix.md | ~$0.02 |
| **Total** | **6 stages** | **~27,000 tokens** | **Mixed** | **~$0.12** |

**Note:** Stages 2-5 can run in parallel for faster execution.

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

- **Headings:** Title case, hierarchical (H1 → H2 → H3)
- **Code blocks:** Always specify language (`typescript, `bash, ```json)
- **Links:** Use relative paths for internal docs
- **Lists:** Consistent bullet style (-, not \*)

### API Documentation Format

```markdown
## Endpoint Name

`METHOD /path/:param`

**Description:** What this endpoint does

**Authentication:** Required/Optional

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | User ID |

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

### Changelog Format (Keep a Changelog)

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

---

## Notes

### Automation Opportunities

- **Code Scan:** Can be automated via git hooks
- **Changelog:** Use conventional commits for auto-generation
- **API Docs:** OpenAPI spec → Markdown via Redoc/Swagger

### Parallel Execution

Stages 2-5 are independent and can run concurrently:

```
Stage 1 (Code Scan)
       ↓
  ┌────┴────┐────┐────┐
Stage 2  Stage 3  Stage 4  Stage 5 (Parallel)
  └────┬────┘────┘────┘
       ↓
Stage 6 (Changelog)
```

### Documentation Debt Prevention

- Run this orchestrator **before every release**
- Enforce documentation review in PR process
- Track documentation coverage metrics

---

**This orchestrator ensures documentation never falls behind code.**
