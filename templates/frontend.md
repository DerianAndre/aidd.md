# Frontend Development — Component-Driven UI Engineering

> 4 sub-agent perspectives, all states, accessibility mandatory.

**Effort Tier**: 2 (STANDARD)
**AIDD Skill**: `skills/interface-artisan/SKILL.md` + `skills/experience-engineer/SKILL.md` + `skills/design-architect/SKILL.md`

---

## Preconditions

- Design reference or requirements available
- Project stack verified (package.json checked)
- Component library identified (shadcn/ui, Radix, custom)

## Sub-Agent Roles

Think from ALL 4 perspectives simultaneously:

| Role | Focus |
|------|-------|
| **Frontend Engineer** | Structure, data flow, state management, TypeScript types |
| **UX/UI Lead** | Design tokens, spacing, colors (OKLCH), visual hierarchy, consistency |
| **Copywriter** | Labels, error messages, placeholders, microcopy, i18n readiness |
| **Motion Designer** | Transitions, loading animations, skeleton states, micro-interactions |

## Process

### Step 1 — Analyze Requirements (All Perspectives)
- Engineer: identify data/props/state needs, API integration points
- UX/UI: review design, map to design tokens, check spacing scale
- Copywriter: inventory all user-facing text, plan i18n keys
- Motion: identify animation opportunities, loading sequences

### Step 2 — Component Structure
- Atomic design: atoms → molecules → organisms → templates → pages
- One component per file
- Props interface with TypeScript strict types
- Export descriptor for handle topology (if applicable)

### Step 3 — Implementation
- Structure and layout (semantic HTML, correct ARIA roles)
- Styling via Tailwind CSS 4 + design tokens (no hardcoded values)
- State management (Zustand for global, local state for UI-only)
- Data fetching integration

### Step 4 — All States (MANDATORY)
Every interactive component MUST implement:
- Default, Hover, Focus (visible indicator), Active/Pressed
- Disabled (visually distinct + aria-disabled)
- Loading (skeleton or spinner + aria-busy)
- Empty (helpful message + action CTA)
- Error (descriptive message + recovery action)
- Success (confirmation + next step)

### Step 5 — Accessibility (WCAG 2.1 AA)
- Keyboard navigation on ALL interactive elements
- Screen reader: ARIA labels, roles, live regions for dynamic content
- Contrast >=4.5:1 (text), >=3:1 (large text, UI components)
- Focus indicators: visible, high-contrast, never removed
- Color: never sole state indicator
- Touch targets: >=44x44px on mobile

### Step 6 — Responsive Design
- Mobile-first approach
- Test at breakpoints: 320px, 768px, 1024px, 1440px
- Fluid typography and spacing where appropriate
- No horizontal scroll at any breakpoint

### Step 7 — i18n
- All user-facing strings in locale files (i18next)
- Support interpolation for dynamic values
- Handle plural forms
- RTL consideration for future locales

## Quality Gates

- [ ] All states implemented (default, hover, focus, active, disabled, loading, empty, error, success)
- [ ] WCAG 2.1 AA compliant
- [ ] Responsive at all breakpoints (320/768/1024/1440)
- [ ] No hardcoded strings (all in i18n)
- [ ] TypeScript strict (no any)
- [ ] Design tokens used (no hardcoded colors/spacing)
- [ ] Keyboard navigable
- [ ] Screen reader tested

## Anti-Patterns

- Desktop-only development (always start mobile-first)
- Missing error/empty/loading states
- Hardcoded colors or spacing values (use design tokens)
- z-index wars (use stacking context strategy)
- `!important` overrides
- Inline styles
- Removing focus outlines without replacement
- Giant monolithic components (decompose)

---

## Cross-References

- **Frontend rules**: `rules/frontend.md`
- **Interface rules**: `rules/interfaces.md`
- **Interface Artisan skill**: `skills/interface-artisan/SKILL.md`
- **Experience Engineer skill**: `skills/experience-engineer/SKILL.md`
- **Design Architect skill**: `skills/design-architect/SKILL.md`
- **Design workflow**: `workflows/design.md`
- **Accessibility checklist**: `skills/interface-artisan/references/accessibility-checklist.md`
