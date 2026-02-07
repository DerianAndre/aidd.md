---
description: 🎨 WCAG and Tailwind audit. Ensures accessibility, pixel-perfect design and mobile-first approach. Commands /visual-audit, /pixel-perfect
---

# Workflow: Design (WCAG + Tailwind Audit)

> **Purpose:** Complete WCAG 2.1 AA accessibility and Tailwind CSS visual design audit

## Invocation

| Type | Items |
|------|-------|
| **Skills** | verification-before-completion |
| **Specialized** | frontend-design |
| **MCPs** | Context7, WebSearch |

---

## Audit Scope

- **Accessibility:** WCAG 2.1 Level AA compliance
- **Visual Design:** Tailwind CSS best practices, mobile-first
- **Component Quality:** Semantic HTML, ARIA, keyboard navigation
- **Performance:** Bundle size, lazy loading, image optimization

---

## Step 1: WCAG 2.1 Accessibility Audit

**Indicator**: `[aidd.md] Workflow - design (WCAG 2.1 Accessibility Audit)`

### Automated Testing

```bash
# Install axe-core
npm install --save-dev @axe-core/react vitest-axe

# Run accessibility tests
npm run test -- --grep "accessibility"
```

**Test example:**

```typescript
import { axe, toHaveNoViolations } from "vitest-axe";
expect.extend(toHaveNoViolations);

it("has no accessibility violations", async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

### Manual Checks (Checklist)

**Activate skill:** `interface-artisan`

**Consult:** `skills/interface-artisan/references/accessibility-checklist.md`

#### 1. Semantic HTML

- [ ] Buttons are `<button>`, not `<div onClick>`
- [ ] Links are `<a href>`, not `<span onClick>`
- [ ] Forms use `<form>`, `<label>`, `<input>`
- [ ] Landmarks: `<nav>`, `<main>`, `<aside>`, `<footer>`

#### 2. ARIA Labels

- [ ] Icons have `aria-label`
- [ ] Form inputs have associated `<label>` or `aria-label`
- [ ] Dynamic content uses `aria-live`
- [ ] Modal dialogs have `role="dialog"` + `aria-modal="true"`

**Example audit:**

```tsx
// ❌ BAD: No label, not semantic
<div className="button" onClick={handleClick}>
  <XIcon />
</div>

// ✅ GOOD: Semantic button with aria-label
<button aria-label="Close modal" onClick={handleClose}>
  <XIcon />
</button>
```

#### 3. Keyboard Navigation

- [ ] All interactive elements keyboard-accessible (Tab, Enter, Space)
- [ ] Focus visible (no `outline: none` without alternative)
- [ ] Modal focus trap (can't Tab outside)
- [ ] Escape closes modals/dropdowns

**Test manually:**

```
1. Unplug mouse
2. Navigate entire app using only keyboard
3. Verify all actions possible
```

#### 4. Color Contrast

**Tool:** Chrome DevTools → Inspect → Accessibility

- [ ] Normal text: ≥4.5:1 ratio
- [ ] Large text (18px+): ≥3:1 ratio
- [ ] UI components (borders, icons): ≥3:1 ratio

**Check programmatically:**

```bash
# Install pa11y
npm install -g pa11y

# Audit page
pa11y http://localhost:3000 --standard WCAG2AA
```

---

## Step 2: Tailwind CSS Best Practices

**Indicator**: `[aidd.md] Workflow - design (Tailwind CSS Best Practices)`

### Utility-First Review

**Verify:**

- [ ] Components use Tailwind utilities (not custom CSS)
- [ ] Responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- [ ] Mobile-first approach (base = mobile, `md:` = tablet+)
- [ ] Design tokens for colors, spacing (no hardcoded values)

**Example review:**

```tsx
// ❌ BAD: Hardcoded colors, desktop-first
<div className="w-800px bg-#3B82F6 lg:w-400px">

// ✅ GOOD: Tailwind utilities, mobile-first
<div className="
  w-full           /* Mobile: full width */
  bg-blue-600      /* Design token */
  md:w-3/4         /* Tablet: 75% width */
  lg:w-1/2         /* Desktop: 50% width */
">
```

---

### Component Extraction (DRY)

**Rule:** If utilities repeated >3 times, extract to component

```tsx
// ❌ BAD: Repeated utilities
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Submit
</button>
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Cancel
</button>

// ✅ GOOD: Reusable Button component
const Button = ({ children, ...props }) => (
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" {...props}>
    {children}
  </button>
);
```

---

### Dark Mode Support

- [ ] All components support dark mode (`dark:` prefix)
- [ ] Color variables use semantic names (`bg-background`, not `bg-white`)
- [ ] Toggle mechanism implemented

**Example:**

```tsx
<div
  className="
  bg-white dark:bg-gray-900
  text-gray-900 dark:text-white
"
>
  Content
</div>
```

---

## Step 3: Responsive Design Audit

**Indicator**: `[aidd.md] Workflow - design (Responsive Design Audit)`

### Mobile-First Verification

**Breakpoints (Tailwind defaults):**

- `sm`: 640px (small tablets)
- `md`: 768px (tablets)
- `lg`: 1024px (laptops)
- `xl`: 1280px (desktops)
- `2xl`: 1536px (large desktops)

**Test all breakpoints:**

```bash
# Chrome DevTools → Device Toolbar
# Test: iPhone SE (375px), iPad (768px), Desktop (1920px)
```

### Touch Targets

- [ ] All buttons/links ≥44×44px (WCAG 2.1 Level AA)
- [ ] Spacing between targets ≥8px

```tsx
// ✅ GOOD: Adequate tap target
<button className="min-h-[44px] min-w-[44px] px-4 py-3">Tap me</button>
```

---

## Step 4: Visual Design Review

**Indicator**: `[aidd.md] Workflow - design (Visual Design Review)`

### Typography

- [ ] Font hierarchy clear (h1 > h2 > h3 > body)
- [ ] Line height: 1.5-1.8 for body text
- [ ] Max line width: ~65-75 characters for readability

**Tailwind classes:**

```tsx
<h1 className="text-4xl font-bold leading-tight">Heading</h1>
<p className="text-base leading-relaxed max-w-prose">
  Body text with optimal line length
</p>
```

### Spacing & Alignment

- [ ] Consistent spacing (use Tailwind scale: 4, 8, 16, 24, 32px)
- [ ] Proper alignment (items-center, justify-between)
- [ ] Visual hierarchy (larger spacing between sections)

### Color Palette

- [ ] Using design system colors (blue-600, not custom hex)
- [ ] Semantic color usage (red for errors, green for success)
- [ ] Sufficient contrast (run automated checks)

---

## Step 5: Performance Audit

**Indicator**: `[aidd.md] Workflow - design (Performance Audit)`

### Bundle Size

```bash
# Analyze bundle
npm run build
npx vite-bundle-visualizer

# Target: <200KB (gzipped)
```

**Optimizations:**

- [ ] Code splitting with `React.lazy()`
- [ ] Tree-shaking enabled
- [ ] Unused Tailwind utilities purged

### Image Optimization

- [ ] Images in modern formats (WebP, AVIF)
- [ ] Lazy loading: `loading="lazy"`
- [ ] Responsive images: `srcset` or Next.js `<Image>`

```tsx
// ✅ GOOD: Optimized image
import Image from "next/image";

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>;
```

---

## Step 6: Pixel-Perfect Review

**Indicator**: `[aidd.md] Workflow - design (Pixel-Perfect Review)`

### Compare with Design Mockup

**Tools:**

- Figma Dev Mode
- PixelParallel (Chrome extension)
- Overlay design on live site

**Check:**

- [ ] Font sizes match (+/- 1px acceptable)
- [ ] Spacing matches (use browser DevTools measure tool)
- [ ] Colors match (use eyedropper to compare hex values)
- [ ] Border radius, shadows match

---

## Step 7: Component Storybook Review

**Indicator**: `[aidd.md] Workflow - design (Component Storybook Review)`

**Verify all components have:**

- [ ] Storybook stories (`.stories.tsx`)
- [ ] All variants documented (primary, secondary, disabled)
- [ ] Interactive controls (Args)
- [ ] Accessibility addon enabled

**Run Storybook:**

```bash
npm run storybook
```

**Check Accessibility addon:**

- Storybook → Accessibility panel
- Review violations and warnings

---

## Blocking Criteria (NO SHIP)

❌ **CRITICAL - Block deployment:**

1. **Accessibility:**

   - WCAG Level A violations (missing alt text, keyboard inaccessible)
   - Color contrast <3:1 on critical text

2. **Performance:**

   - Bundle size >500KB (gzipped)
   - Lighthouse Performance score <50

3. **Responsive:**
   - Broken layout on mobile (<768px)
   - Horizontal scrolling on any breakpoint

⚠️ **HIGH - Fix Before Next Release:**

- WCAG Level AA violations (contrast <4.5:1, missing ARIA)
- Missing dark mode support
- Touch targets <44px

---

## Automation (CI/CD)

```yaml
# .github/workflows/design-audit.yml
name: Design Audit

on: [pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npm run test:a11y

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npm run preview &
      - uses: treosh/lighthouse-ci-action@v10
        with:
          urls: http://localhost:4173
          budgetPath: .lighthouserc.json
```

**Lighthouse budget (.lighthouserc.json):**

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

---

## Skills & References

- **Skill:** `interface-artisan` - Component generation, WCAG audit
- **Reference:** `skills/interface-artisan/references/accessibility-checklist.md`
- **Tools:**
  - [axe DevTools](https://www.deque.com/axe/devtools/)
  - [Lighthouse](https://developers.google.com/web/tools/lighthouse)
  - [WAVE](https://wave.webaim.org/)
