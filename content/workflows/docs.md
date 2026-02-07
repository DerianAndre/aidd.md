---
description: 📚 Synchronizes code and documentation to prevent drift. Codifies rules and technical knowledge. Includes /sync-docs and /codify-rule
---

# 📚 Workflow: Docs (Documentation Synchronization)

> **💡 Pro Tip:** For comprehensive documentation update across all artifacts, see [`/orchestrate documentation-sync`](./orchestrators/documentation-sync.md)

> **Purpose:** Keep documentation synchronized with code and codify technical knowledge

---

## 📋 Scope

- **Sync Code → Docs:** API changes, function signatures, examples
- **Codify Knowledge:** Tribal knowledge → searchable markdown
- **Validate Docs:** Links, code examples, API contracts

---

## 🔄 Step 1: Sync-Docs (Code → Documentation)

### Identify Changes

```bash
# View modified files
git diff main..HEAD --name-only

# View changes in public functions
git diff main..HEAD -- "src/**/*.ts" | grep "export"
```

**Activate skill:** `knowledge-architect`

---

### API Documentation Sync

**If OpenAPI spec changed:**

```bash
# 1. Generate OpenAPI from code (if auto-generated)
npm run generate:openapi

# 2. Compare with committed version
git diff docs/api-spec.yaml

# 3. If there are differences → update docs
```

**Check:**

- [ ] `docs/api-reference.md` reflects new endpoints
- [ ] Request/response examples updated
- [ ] Status codes documented

---

### Function Signature Changes

**If public function signature changed:**

```typescript
// Before
export function calculateDiscount(price: number, tier: string): number;

// After (breaking change)
export function calculateDiscount(
  price: number,
  tier: "bronze" | "silver" | "gold"
): number;
```

**Update:**

- [ ] JSDoc on the function
- [ ] `docs/api/functions.md` (if it exists)
- [ ] CHANGELOG.md with breaking change notice
- [ ] Migration guide (if public)

---

### Code Examples in Docs

**Validate that examples compile:**

```bash
# Extract code blocks from markdown
npx markdown-code-runner docs/**/*.md --language typescript

# If it fails → update examples
```

**Example doc update:**

```markdown
<!-- docs/guides/authentication.md -->

## Login Example

\`\`\`typescript
// ❌ OUTDATED (before change)
const user = await authService.login(email, password);

// ✅ UPDATED (after change)
const user = await authService.login({ email, password });
\`\`\`
```

---

## 🧠 Step 2: Codify-Rule (Tribal Knowledge → Markdown)

### Identify Knowledge Gaps

#### Ask the team:

- What recurring questions do new devs have?
- Which architectural decisions are not documented?
- What scripts/commands are repeatedly shared on Slack?

**Example of tribal knowledge:**

> "To deploy to staging, first run `npm run build:staging`,
> then `scp` the bundle to server-staging-01, and restart PM2.
> If it fails, rollback with `git revert` and re-deploy."

---

### Create Runbook

**Convert knowledge to structured document:**

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

---

### Codify Architectural Decisions

**Create ADR (Architecture Decision Record):**

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

## 🔍 Step 3: Validate Documentation

### Check Broken Links

```bash
# Install markdown-link-check
npm install -g markdown-link-check

# Check all docs
find docs -name "*.md" -exec markdown-link-check {} \;
```

**Fix broken links:**

- Internal links: Update to correct path
- External links: Update URL or mark as archived

---

### Verify Code Examples Compile

```bash
# Extract code blocks
npx markdown-code-extractor docs/**/*.md --output temp/

# Try to compile them
npx tsc temp/**/*.ts --noEmit

# If errors → fix examples
```

---

### Validate API Contracts

**If you have an OpenAPI spec:**

```bash
# Validate spec syntax
npm run validate:openapi docs/api-spec.yaml

# Compare spec vs running server
npx openapi-diff docs/api-spec.yaml http://localhost:3000/api-json
```

---

## 📝 Step 4: Documentation Coverage Report

### Generate Missing Docs Report

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
// ✅ Add JSDoc
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

## 🤖 Automation (CI/CD)

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

---

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

---

## 📋 Checklist for Synchronization

**Before merging, verify:**

- [ ] **API Changes:**

  - [ ] OpenAPI spec updated
  - [ ] Endpoints documented in README
  - [ ] Valid request/response examples

- [ ] **Function Changes:**

  - [ ] JSDoc updated
  - [ ] Breaking changes in CHANGELOG
  - [ ] Migration guide (if public)

- [ ] **Examples:**

  - [ ] Code examples compile
  - [ ] Examples use current APIs
  - [ ] Correct imports

- [ ] **Links:**

  - [ ] No broken links
  - [ ] Correct internal references
  - [ ] Valid external links

- [ ] **Knowledge:**
  - [ ] Important decisions documented (ADR)
  - [ ] Runbooks for new processes
  - [ ] FAQ updated

---

## 🎯 Documentation Types

### 1. README.md

- **Purpose:** Quick start, overview
- **Update when:** Project setup changes, new features

### 2. API Reference (Auto-Generated)

- **Purpose:** Complete function/class reference
- **Update when:** Code changes (automated)

### 3. Guides (Tutorials)

- **Purpose:** Step-by-step learning
- **Update when:** Workflow changes, new APIs

### 4. Runbooks (Operations)

- **Purpose:** deployment, incident response
- **Update when:** Process changes

### 5. ADRs (Decisions)

- **Purpose:** Why we chose X over Y
- **Update when:** Major architectural decision

### 6. CHANGELOG

- **Purpose:** Version history
- **Update when:** Every release (automated)

---

## 📚 Skills & References

- **Skill:** `knowledge-architect` - Documentation generation, sync strategies
- **Tools:**
  - [TypeDoc](https://typedoc.org/)
  - [markdown-link-check](https://github.com/tcort/markdown-link-check)
  - [ADR Tools](https://github.com/npryce/adr-tools)
