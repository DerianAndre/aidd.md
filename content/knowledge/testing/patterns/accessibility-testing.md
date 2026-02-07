---
name: Accessibility Testing (a11y)
category: testing
last_updated: 2026-01-14
maturity: stable
---

# Accessibility Testing (a11y)

## Overview

Automated testing for WCAG 2.2 AA compliance using tools like axe-core, Playwright, and Lighthouse. Ensures usability for users with disabilities (screen readers, keyboard navigation, color contrast).

## Key Metrics

- **Coverage:** WCAG 2.2 Level AA (legal requirement in many jurisdictions)
- **Automation:** 30-40% of a11y issues detectable via automation (rest requires manual)
- **Performance:** <1s to scan page with axe-core
- **DX:** Playwright/Vitest integration, CI/CD blocking
- **Maturity:** 10+ years (axe-core), production-standard

## Use Cases

| Scenario                   | Fit Score (1-10) | Rationale                                     |
| -------------------------- | ---------------- | --------------------------------------------- |
| Public-facing websites     | 10               | Legal requirement (ADA, WCAG compliance)      |
| Government/education sites | 10               | Mandatory WCAG 2.2 AA compliance              |
| B2B SaaS products          | 9                | Increasingly required by enterprise contracts |
| Internal tools             | 7                | Good practice but not legally mandated        |
| Prototypes/MVPs            | 5                | Defer until product-market fit                |

## Trade-offs

### Strengths

- **Legal Compliance:** Avoid lawsuits (ADA Title III)
- **Inclusive:** 15% of population has disabilities (larger market)
- **SEO Benefit:** Semantic HTML helps search engines
- **Automation:** axe-core catches 30-40% of issues automatically

### Weaknesses

- **Not Complete:** 60-70% of a11y issues require manual testing
- **False Positives:** Some checks need human verification (e.g., alt text quality)
- **Learning Curve:** Requires understanding WCAG principles
- **Performance Impact:** Minimal (<1s scan time)

## Implementation Pattern (Playwright + axe-core)

```typescript
// tests/a11y.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Homepage should be accessible", async ({ page }) => {
  await page.goto("https://example.com");

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test("Check specific component", async ({ page }) => {
  await page.goto("/dashboard");

  const scanResults = await new AxeBuilder({ page })
    .include("#user-profile") // Test specific component
    .analyze();

  expect(scanResults.violations).toEqual([]);
});
```

## Manual Testing Checklist

- [ ] **Keyboard Navigation:** Tab through entire page (no mouse)
- [ ] **Screen Reader:** Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] **Color Contrast:** 4.5:1 for normal text, 3:1 for large text
- [ ] **Zoom:** Test at 200% zoom (no horizontal scroll)
- [ ] **Alt Text:** Images have descriptive alt text (not generic)
- [ ] **Forms:** Labels associated with inputs, error messages clear

## Automation Tools

| Tool                 | Use Case                                       |
| -------------------- | ---------------------------------------------- |
| **axe-core**         | Most comprehensive automated checker           |
| **Lighthouse**       | Google's accessibility audit (Chrome DevTools) |
| **Playwright + axe** | CI/CD integration for automated testing        |
| **WAVE**             | Browser extension for manual testing           |

## Alternatives

| Alternative                     | When to Choose Instead                        |
| ------------------------------- | --------------------------------------------- |
| **Manual Testing**              | Need full WCAG coverage (automation = 30-40%) |
| **Paid Services (TPGi, Deque)** | Enterprise compliance, need certification     |

## References

- [Automating Accessibility Testing (2026)](https://www.browserstack.com/guide/automate-accessibility-testing)
- [axe-core Official Docs](https://www.deque.com/axe/core-documentation/)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
