---
name: product
description: Creates technical plans and Gherkin without ambiguity. Ensures the Definition of Ready. Includes /spec and /refine commands
complexity: medium
estimated_duration: 45 minutes
skills_required:
  - system-architect
  - knowledge-architect
  - contract-architect
  - data-architect
model_strategy: sequential
---

# Workflow: Product (Technical Specification & Gherkin)

> **Pro Tip:** For complete feature implementation from architecture to deployment, see [`/orchestrate full-stack-feature`](./full-stack-feature.md)

> **Purpose:** Create unambiguous technical specifications and Gherkin scenarios for Definition of Ready

## Invocation

| Type | Items |
|------|-------|
| **Skills** | brainstorming, writing-plans |
| **Specialized** | clean-ddd-hexagonal |
| **MCPs** | Context7, WebSearch |

---

## Scope

- **Spec:** Detailed technical documents for features
- **Gherkin:** BDD scenarios (Given-When-Then) for testing
- **Refine:** Iterate spec to remove ambiguities
- **Definition of Ready:** Checklist before development

---

## Step 1: Spec (Create Technical Specification)

**Indicator**: `[aidd.md] Workflow - product (Create Technical Specification)`

### Specification Template

**Activate skill:** `system-architect` or `knowledge-architect`

```markdown
# Feature Spec: [Feature Name]

## Overview

**Feature:** [One-line description]
**User Story:** As a [user type], I want [goal] so that [benefit]
**Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)
**Estimated Effort:** X story points / X days

---

## Goals & Non-Goals

### Goals

- Goal 1 (specific, measurable)
- Goal 2
- Goal 3

### Non-Goals (Out of Scope)

- What we're NOT building in this iteration
- Future enhancements

---

## Stakeholders

- **Product Owner:** @name
- **Tech Lead:** @name
- **Designer:** @name (if UI changes)
- **QA:** @name

---

## Requirements

### Functional Requirements

#### FR1: [Requirement Title]

**Description:** Detailed explanation of what the system must do

**Acceptance Criteria:**

- [ ] Criterion 1 (testable, specific)
- [ ] Criterion 2
- [ ] Criterion 3

**Example:**

> User inputs email "test@example.com" → System validates format → Shows success message

---

#### FR2: [Second Requirement]

...

### Non-Functional Requirements

#### NFR1: Performance

- **Metric:** API response time <200ms (p95)
- **Test:** Load testing with 1000 concurrent users

#### NFR2: Security

- **Requirement:** All passwords hashed with bcrypt (cost ≥12)
- **Validation:** Security audit scan

#### NFR3: Scalability

- **Requirement:** System supports 10K active users
- **Test:** Stress testing

---

## Technical Design

### Architecture Diagram

\`\`\`mermaid
C4Container
title User Authentication System

Person(user, "User")
Container(web, "Web App", "React")
Container(api, "API", "NestJS")
ContainerDb(db, "Database", "PostgreSQL")

Rel(user, web, "Uses")
Rel(web, api, "Makes requests", "HTTPS")
Rel(api, db, "Stores user data", "SQL")
\`\`\`

### Data Model

\`\`\`sql
CREATE TABLE users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
email VARCHAR(255) NOT NULL UNIQUE,
password_hash VARCHAR(255) NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

### API Design

**Endpoint:** `POST /api/auth/login`

**Request:**
\`\`\`json
{
"email": "user@example.com",
"password": "SecurePass123!"
}
\`\`\`

**Response (200 OK):**
\`\`\`json
{
"accessToken": "eyJhbGc...",
"refreshToken": "dGhpc2lz...",
"user": {
"id": "uuid",
"email": "user@example.com"
}
}
\`\`\`

**Error (401 Unauthorized):**
\`\`\`json
{
"error": "INVALID_CREDENTIALS",
"message": "Email or password incorrect"
}
\`\`\`

---

## Testing Strategy

### Unit Tests

- `AuthService.login()` - validates credentials
- `AuthService.generateTokens()` - creates JWT
- Password hashing utilities

### Integration Tests

- `POST /api/auth/login` - full login flow
- Token refresh mechanism

### E2E Tests

- User can log in via UI
- Invalid credentials show error message

---

## Implementation Plan

### Phase 1: Backend (2 days)

- [ ] Create User entity and repository
- [ ] Implement AuthService with bcrypt
- [ ] Create login/logout endpoints
- [ ] Write unit tests

### Phase 2: Frontend (1 day)

- [ ] Create LoginForm component
- [ ] Integrate with API
- [ ] Handle error states
- [ ] Add loading indicators

### Phase 3: Testing & Deploy (1 day)

- [ ] E2E tests with Playwright
- [ ] Security audit
- [ ] Deploy to staging
- [ ] User acceptance testing

---

## Risks & Mitigations

| Risk                | Probability | Impact   | Mitigation                             |
| ------------------- | ----------- | -------- | -------------------------------------- |
| Bcrypt too slow     | Medium      | High     | Use async hashing, cache results       |
| JWT token theft     | Low         | Critical | Use HttpOnly cookies, short expiration |
| DB connection fails | Low         | Medium   | Implement retry logic + health checks  |

---

## Definition of Ready Checklist

- [ ] All functional requirements defined
- [ ] Non-functional requirements specified (performance, security)
- [ ] API contracts documented (OpenAPI)
- [ ] Data model designed
- [ ] Acceptance criteria testable
- [ ] Dependencies identified
- [ ] Risks assessed
- [ ] Effort estimated

---

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
```

---

## Step 2: Gherkin (BDD Scenarios)

**Indicator**: `[aidd.md] Workflow - product (Gherkin BDD Scenarios)`

### Create Given-When-Then Scenarios

**Gherkin Format:**

```gherkin
# features/authentication/login.feature

Feature: User Login
  As a registered user
  I want to log in to the system
  So that I can access my account

  Background:
    Given the following users exist:
      | email              | password     |
      | test@example.com   | ValidPass1!  |

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter "test@example.com" in the email field
    And I enter "ValidPass1!" in the password field
    And I click the "Sign In" button
    Then I should see the dashboard page
    And I should see "Welcome back" message

  Scenario: Failed login with invalid password
    Given I am on the login page
    When I enter "test@example.com" in the email field
    And I enter "WrongPassword" in the password field
    And I click the "Sign In" button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page

  Scenario: Failed login with non-existent user
    Given I am on the login page
    When I enter "nonexistent@example.com" in the email field
    And I enter "SomePassword1!" in the password field
    And I click the "Sign In" button
    Then I should see an error message "Invalid credentials"

  Scenario: Login form validation
    Given I am on the login page
    When I enter "invalid-email" in the email field
    And I click the "Sign In" button
    Then I should see "Invalid email format" error
    And the "Sign In" button should be disabled

  Scenario Outline: Rate limiting after failed attempts
    Given I have failed to log in <attempts> times
    When I try to log in again
    Then I should see "Too many attempts. Try again in <wait_time> minutes"

    Examples:
      | attempts | wait_time |
      | 5        | 15        |
      | 10       | 30        |
```

---

### Implement Step Definitions (Cucumber/Playwright)

```typescript
// step-definitions/auth.steps.ts
import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

Given("I am on the login page", async function () {
  await this.page.goto("/login");
});

When("I enter {string} in the email field", async function (email: string) {
  await this.page.fill('input[name="email"]', email);
});

When(
  "I enter {string} in the password field",
  async function (password: string) {
    await this.page.fill('input[name="password"]', password);
  }
);

When("I click the {string} button", async function (buttonText: string) {
  await this.page.click(`button :text("${buttonText}")`);
});

Then("I should see the dashboard page", async function () {
  await expect(this.page).toHaveURL("/dashboard");
});

Then(
  "I should see an error message {string}",
  async function (message: string) {
    const error = this.page.locator('[role="alert"]');
    await expect(error).toContainText(message);
  }
);
```

---

## Step 3: Refine (Remove Ambiguities)

**Indicator**: `[aidd.md] Workflow - product (Refine Ambiguities)`

### Refinement Checklist

**Review spec with team:**

#### Common Ambiguities

**❌ Ambiguous:** "The system must be fast"
**✅ Specific:** "The API must respond in <200ms (p95) under load of 1000 concurrent users"

**❌ Ambiguous:** "Validate email"
**✅ Specific:** "Email must comply with RFC 5322, max 255 characters, reject disposable domains (temp-mail.org)"

**❌ Ambiguous:** "Handle errors appropriately"
**✅ Specific:**

```
- 400: Validation error (invalid email format, password too short)
- 401: Authentication error (invalid credentials)
- 429: Rate limit exceeded (>5 attempts in 15 min)
- 500: Server error (log to Sentry, show generic message to user)
```

---

### Questions to Ask

1. **Edge Cases:**

   - What happens if the user clicks "Submit" twice?
   - What happens if the DB is offline?
   - What happens with emails containing Unicode characters (ñ, ü)?

2. **Limits:**

   - Max password length? (e.g., 128 chars)
   - Max login attempts? (e.g., 5 in 15 min)
   - Token expiration? (e.g., access: 15min, refresh: 7 days)

3. **Dependencies:**
   - What external services do we need? (Email service, analytics)
   - What permissions/roles exist? (user, admin, super-admin)

---

## Step 4: Definition of Ready

**Indicator**: `[aidd.md] Workflow - product (Definition of Ready)`

### Complete Checklist

**Before moving to "In Progress":**

#### Requirements

- [ ] Clear user story (As a... I want... So that...)
- [ ] Specific and testable acceptance criteria
- [ ] NFRs defined (performance, security, scalability)
- [ ] Edge cases identified

#### Technical Design

- [ ] Architecture diagram created (C4 model)
- [ ] Data model designed (SQL DDL validated)
- [ ] API contracts documented (OpenAPI spec)
- [ ] Dependencies identified

#### Testing

- [ ] Gherkin scenarios written
- [ ] Unit test plan documented
- [ ] Integration test scenarios defined
- [ ] E2E test flows identified

#### Estimation & Planning

- [ ] Effort estimated (story points/days)
- [ ] Subtasks identified
- [ ] Risks documented with mitigations
- [ ] Team capacity verified

#### Stakeholder Alignment

- [ ] Product Owner approves spec
- [ ] Tech Lead approves technical design
- [ ] Designer approves mockups (if applicable)
- [ ] Security review completed (for sensitive features)

---

## Automation

### Spec Template Generator

```bash
# Script to create spec template
npx degit user/spec-template specs/new-feature.md
```

### Gherkin Validation

```bash
# Verify Gherkin syntax
npx gherkin-lint features/**/*.feature
```

### Living Documentation

```bash
# Generate HTML docs from Gherkin
npm run docs:cucumber
# Output: docs/features/index.html
```

---

## Output Examples

### Minimal Spec (Simple Feature)

```markdown
# Spec: Add Dark Mode Toggle

## User Story

As a user, I want to toggle dark mode so that I can reduce eye strain

## Acceptance Criteria

- [ ] Toggle button in header
- [ ] Preference saved to localStorage
- [ ] All components support dark mode

## Technical Design

- Add `dark` class to `<html>`
- Use Tailwind `dark:` variants

## Gherkin

\`\`\`gherkin
Scenario: User enables dark mode
When I click the dark mode toggle
Then the page background should be dark
And the preference should persist on reload
\`\`\`
```

### Comprehensive Spec (Complex Feature)

Use full template above (15+ pages)

---

## Skills & References

- **Skill:** `system-architect` - Architecture diagrams
- **Skill:** `contract-architect` - OpenAPI generation
- **Skill:** `data-architect` - Data modeling
- **Tools:**
  - [Cucumber](https://cucumber.io/)
  - [Gherkin Syntax](https://cucumber.io/docs/gherkin/reference/)
  - [BDD Best Practices](https://cucumber.io/docs/bdd/)
