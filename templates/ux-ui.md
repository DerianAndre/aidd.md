# UX/UI Design — Semiotics-Driven Interface Engineering

> Functional minimalism. Cognitive efficiency over decoration.

**Effort Tier**: 1 (HIGH)
**AIDD Skill**: `skills/design-architect/SKILL.md`

---

## Preconditions

- User requirements and target audience defined
- Existing design system inventory (if any)
- Accessibility requirements confirmed (WCAG 2.1 AA minimum)

## Sub-Agent Roles

| Role | Focus |
|------|-------|
| **Design Architect** | Design system, tokens, component hierarchy, visual language |
| **UX Researcher** | User flows, information architecture, cognitive load analysis |
| **Accessibility Specialist** | WCAG compliance, assistive technology, inclusive design |

## Design Philosophy

### Semiotics-Based UI
Signs and symbols carry cultural meaning. Interface elements communicate through learned visual language:
- Icons must be universally recognizable or paired with text labels
- Color associations are cultural (red != danger everywhere)
- Spatial relationships convey hierarchy (left-to-right reading cultures: top-left = primary)

### Evolutionary Psychology Applied to UX
Leverage cognitive patterns for intuitive interfaces:
- **Recognition over recall**: show options, don't require memory
- **Loss aversion**: frame destructive actions with consequence clarity
- **Chunking**: group related items (7+/-2 rule for short-term memory)
- **Progressive disclosure**: reveal complexity gradually
- **Fitts's Law**: important targets are large and close
- **Hick's Law**: fewer choices = faster decisions

### Functional Minimalism
Every element earns its place. If removing an element doesn't reduce understanding, remove it.

## Process

### Step 1 — User Flow Mapping
- Entry → Action → Outcome for each feature
- Identify decision points and potential confusion
- Map error states and recovery paths

### Step 2 — Information Architecture
- Content hierarchy (primary, secondary, tertiary)
- Navigation structure (breadth vs depth trade-off)
- Search vs browse patterns

### Step 3 — Design Tokens
- Colors: OKLCH color space (perceptually uniform)
- Spacing scale: 4px base (4, 8, 12, 16, 24, 32, 48, 64)
- Typography scale: modular (1.125-1.333 ratio)
- Border radius: consistent scale
- Shadows: elevation system (0dp, 1dp, 2dp, 4dp, 8dp, 16dp)
- Motion: duration scale (100ms, 200ms, 300ms, 500ms)

### Step 4 — Component Specification
For each component define:
- Variants (primary, secondary, ghost, destructive)
- States (default, hover, focus, active, disabled, loading, error)
- Sizes (sm, md, lg)
- Props interface
- Composition rules (what can nest inside what)

### Step 5 — Accessibility Review
- **Contrast**: >=4.5:1 text, >=3:1 large text and UI components
- **Keyboard**: all interactive elements focusable and operable
- **Screen reader**: ARIA labels, roles, live regions
- **Focus**: visible indicators, logical tab order
- **Color**: never sole state indicator
- **Motion**: respect prefers-reduced-motion
- **Touch**: targets >=44x44px

### Step 6 — Interaction Patterns
- Hover: subtle feedback (opacity, color shift)
- Focus: visible ring (2px offset, high contrast)
- Active: pressed state (scale or color change)
- Transitions: 150-200ms for micro-interactions, 300ms for layout changes

## Component Hierarchy

```
Radix UI (headless, accessible primitives)
  -> shadcn/ui (styled Radix with Tailwind)
       -> Custom components (project-specific)
```

## Quality Gates

- [ ] WCAG 2.1 AA all criteria met
- [ ] Keyboard navigable (all interactive elements)
- [ ] Screen reader compatible (test with NVDA/VoiceOver)
- [ ] Design tokens documented and consistent
- [ ] All component states defined
- [ ] prefers-reduced-motion respected
- [ ] Touch targets >=44x44px

## Anti-Patterns

- Decoration without function
- Color as only state indicator
- Removing focus outlines without replacement
- Inaccessible custom controls (use Radix primitives)
- Inconsistent spacing (use token scale)
- z-index chaos (use stacking context)
- Skeuomorphism without functional benefit
- Overriding browser defaults without good reason

---

## Cross-References

- **Design workflow**: `workflows/design.md`
- **Design Architect skill**: `skills/design-architect/SKILL.md`
- **Interface Artisan skill**: `skills/interface-artisan/SKILL.md`
- **Interface rules**: `rules/interfaces.md`
- **Frontend rules**: `rules/frontend.md`
- **Accessibility checklist**: `skills/interface-artisan/references/accessibility-checklist.md`
