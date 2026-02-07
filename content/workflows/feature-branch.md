---
description: 🚀 Complete flow for feature branch creation, development, and Pull Request
---

# Workflow: Feature Branch (Complete Git Workflow)

> **Purpose:** Step-by-step guide to create features using Git Flow and best practices

## Invocation

| Type | Items |
|------|-------|
| **Skills** | finishing-a-development-branch, requesting-code-review |

---

## Step 1: Create Feature Branch

**Indicator**: `[aidd.md] Workflow - feature-branch (Create Feature Branch)`

```bash
# Update main
git checkout main
git pull origin main

# Create feature branch (naming: feature/short-description)
git checkout -b feature/add-user-authentication

# Alternative with issue number
git checkout -b feature/123-user-auth
```

**Naming Conventions:**

- `feature/` - New functionality
- `fix/` - Bug fix
- `hotfix/` - Urgent production fix
- `refactor/` - Refactoring without functional changes
- `docs/` - Documentation changes only

---

## Step 2: Development

**Indicator**: `[aidd.md] Workflow - feature-branch (Development)`

### Atomic Commits

**Use Conventional Commits:**

```bash
# Formato: <type>(<scope>): <description>

# Valid examples:
git commit -m "feat(auth): implement JWT authentication"
git commit -m "fix(users): resolve duplicate email validation"
git commit -m "refactor(api): extract user service logic"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(auth): add login flow tests"
```

**Types:**

- `feat`: New feature (→ MINOR version bump)
- `fix`: Bug fix (→ PATCH version bump)
- `refactor`: Code refactor, no functional change
- `knowledge-architect`: Documentation only
- `test`: Adding/fixing tests
- `chore`: Build, dependencies, configs

### Commit Best Practices

✅ **DO:**

- 1 commit = 1 logical change
- Descriptive messages (50 chars max for title)
- Body explains "why", not "what" (if needed)

❌ **DON'T:**

- "WIP", "fix", "updates" (vague messages)
- Mix multiple unrelated changes in 1 commit
- Commit broken code

---

## Step 3: Testing Local

**Indicator**: `[aidd.md] Workflow - feature-branch (Testing Local)`

```bash
# Run tests
npm run test

# Run linter
npm run lint

# Type check
npm run type-check

# Check coverage
npm run test:coverage
```

**Pre-commit Hook (recommended):**

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm run test"
    }
  }
}
```

---

## Step 4: Sync with Main (Rebase)

**Indicator**: `[aidd.md] Workflow - feature-branch (Sync with Main)`

```bash
# Fetch latest changes
git fetch origin main

# Rebase your branch onto main
git rebase origin/main

# If there are conflicts:
# 1. Resolve conflicts in files
# 2. git add <resolved-files>
# 3. git rebase --continue

# Force push (only if you already pushed before)
git push origin feature/add-user-authentication --force-with-lease
```

**When to rebase?**

- Before creating PR
- When main has significant changes
- To maintain a linear history

---

## Step 5: Push to Remote

**Indicator**: `[aidd.md] Workflow - feature-branch (Push to Remote)`

```bash
# First time
git push -u origin feature/add-user-authentication

# Subsequent pushes
git push
```

---

## Step 6: Create Pull Request

**Indicator**: `[aidd.md] Workflow - feature-branch (Create Pull Request)`

### PR Title (follow Conventional Commits)

```
feat(auth): implement JWT authentication with refresh tokens
```

### PR Description Template

```markdown
## Description

Implements JWT-based authentication system with access and refresh tokens.

## Related Issue

Closes #123

## Changes Made

- Created `AuthService` with login/logout/refresh methods
- Added JWT middleware for protected routes
- Implemented token refresh mechanism
- Added unit tests for AuthService

## Testing

- [x] Unit tests added (coverage: 95%)
- [x] Manual testing in dev environment
- [x] Tested token expiration and refresh

## Security

- [x] No hardcoded secrets
- [x] Passwords hashed with bcrypt (cost: 12)
- [x] JWTs use secure signing algorithm (HS256)

## Screenshots (if applicable)

[Add screenshots of UI changes]

## ✅ Checklist

- [x] Tests passing
- [x] Lint passing
- [x] No security vulnerabilities
- [x] Documentation updated
- [x] Rebased on latest main
```

---

## Step 7: Code Review Process

**Indicator**: `[aidd.md] Workflow - feature-branch (Code Review Process)`

### As Author

1. **Self-review first:**

   - Read your own diff
   - Verify no debug code
   - Confirm tests pass

2. **Respond to comments:**

   - Respond to all comments
   - Make requested changes
   - Push new commits (no force-push during review)

3. **Re-request review:**
   - After making changes
   - Tag reviewer: "@reviewer changes implemented"

### As Reviewer

**Use workflow:** `/review` for full checklist

**Focus areas:**

- Architecture
- Security
- Testing
- Performance
- Code quality

---

## Step 8: Merge

**Indicator**: `[aidd.md] Workflow - feature-branch (Merge)`

### Pre-Merge Preparation

```bash
# Squash commits if there are many WIP commits
git rebase -i origin/main

# Re-run tests
npm run test

# Final rebase with main
git fetch origin main
git rebase origin/main
```

### Merge Strategy

**Option 1: Squash and Merge (recommended for features)**

- Pros: Clean history, 1 commit per feature
- Cons: Loses individual commit history

**Option 2: Rebase and Merge**

- Pros: Maintains individual commits, linear history
- Cons: More commits on main

**Option 3: Merge Commit (DO NOT USE)**

- Creates merge commits → complex history

---

## Step 9: Cleanup

**Indicator**: `[aidd.md] Workflow - feature-branch (Cleanup)`

```bash
# After merge, local cleanup
git checkout main
git pull origin main
git branch -d feature/add-user-authentication

# If not merged and you want to delete
git branch -D feature/add-user-authentication

# Delete remote branch (if it didn't delete automatically)
git push origin --delete feature/add-user-authentication
```

---

## Quick Reference

### Daily Commands

```bash
# Start new feature
git checkout main && git pull && git checkout -b feature/my-feature

# Commit changes
git add .
git commit -m "feat(scope): description"

# Push
git push -u origin feature/my-feature

# Sync with main
git fetch origin main && git rebase origin/main

# After merge
git checkout main && git pull && git branch -d feature/my-feature
```

---

## Troubleshooting

### Conflicts during Rebase

```bash
# View conflicts
git status

# After resolving
git add <files>
git rebase --continue

# Abort rebase
git rebase --abort
```

### Undo last commit (local)

```bash
# Keep changes
git reset --soft HEAD~1

# Discard changes
git reset --hard HEAD~1
```

### Recover deleted branch

```bash
# View reflog
git reflog

# Recover
git checkout -b feature/my-feature <commit-hash>
```

---

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
