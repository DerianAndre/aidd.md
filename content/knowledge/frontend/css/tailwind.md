---
name: Tailwind CSS
category: frontend
last_updated: 2026-02-18
maturity: stable
---

# Tailwind CSS

## Overview

Utility-first CSS framework enabling rapid UI development through composable, single-purpose classes. Industry standard for modern web projects in 2026 (v4 released). Alternative to component frameworks like Bootstrap.

## Key Metrics

- **Bundle Size:** ~10KB (with JIT + PurgeCSS for production)
- **DX:** Faster development (no CSS file switching), design consistency
- **Performance:** Optimized builds (only generates used classes)
- **Maturity:** 7+ years, production-grade, millions of npm downloads/month
- **Cost:** Free, open-source (Note: Tailwind Labs faced challenges in 2026 with AI tools)

## Use Cases

| Scenario                                  | Fit Score (1-10) | Rationale                                                            |
| ----------------------------------------- | ---------------- | -------------------------------------------------------------------- |
| Modern web projects (React, Vue, Next.js) | 10               | Industry standard, framework-agnostic, rapid prototyping             |
| Custom brand design systems               | 10               | Fully customizable via CSS `@theme` directive (colors, spacing, fonts) |
| Responsive design required                | 10               | Built-in responsive variants (`sm:`, `md:`, `lg:`, `xl:`)            |
| Need pre-built components                 | 6                | Use shadcn/ui, Headless UI, or DaisyUI on top of Tailwind            |
| Legacy projects (Bootstrap, custom CSS)   | 5                | Migration effort, team learning curve                                |

## Trade-offs

### Strengths

- **Rapid Development:** Style elements inline (no CSS file switching)
- **Design Consistency:** Pre-defined scale for spacing, colors, typography
- **Zero Bloat:** PurgeCSS removes unused classes (small production bundles)
- **Responsive Made Easy:** `md:grid lg:hidden` = mobile-first utilities

### Weaknesses

- **HTML Verbosity:** Long class strings (`class="flex items-center justify-between px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"`)
- **Learning Curve:** Must memorize utility class names (vs traditional CSS properties)
- **Not Semantic:** Class names describe style, not meaning (screen readers unaffected)
- **Customization Required:** Default theme may not match brand (needs config)

## Implementation Pattern

```bash
# Install Tailwind CSS v4
npm install tailwindcss @tailwindcss/vite
```

```css
/* app.css — CSS-only configuration (NO tailwind.config.js in v4) */
@import "tailwindcss";

@theme {
  --color-brand-50: oklch(0.97 0.02 205);
  --color-brand-500: oklch(0.65 0.15 205);
  --color-brand-900: oklch(0.30 0.08 205);
  --spacing-128: 32rem;
}
```

```tsx
// Component example
export function Button({ children, variant = "primary" }: ButtonProps) {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors";
  const variantClasses = {
    primary: "bg-brand-500 text-white hover:bg-brand-600",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    ghost: "bg-transparent hover:bg-gray-100",
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  );
}
```

## Tailwind CSS v4 (2025+)

**Breaking changes from v3:**

- **No `tailwind.config.js`** — all configuration via CSS `@theme` directive
- **No `content` arrays** — automatic content detection
- **No PostCSS plugin** — use `@tailwindcss/vite`, `@tailwindcss/postcss`, or `@tailwindcss/cli`
- **OKLCH colors** — modern color space replaces hex/rgb defaults

**New features:**

- Rust-based compiler (10x+ faster builds)
- Native CSS variables for all theme values
- CSS-first configuration via `@theme` directive
- First-party Vite plugin (`@tailwindcss/vite`)
- Automatic content detection (no `content` array needed)

## Tailwind vs Traditional CSS

| Aspect                | Tailwind CSS               | Traditional CSS             |
| --------------------- | -------------------------- | --------------------------- |
| **Development Speed** | Fast ✅ (inline utilities) | Slower (separate CSS files) |
| **Bundle Size**       | Small ✅ (PurgeCSS)        | Large (unused CSS)          |
| **Customization**     | Config-based ✅            | Manual (write everything)   |
| **Learning Curve**    | Moderate (utility names)   | Low (standard CSS)          |
| **Reusability**       | Component abstraction      | CSS classes                 |

## Alternatives

| Alternative                       | When to Choose Instead                                        |
| --------------------------------- | ------------------------------------------------------------- |
| **Bootstrap**                     | Need pre-built components, familiar with Bootstrap ecosystem  |
| **Vanilla CSS**                   | Small project, prefer writing custom CSS, no framework needed |
| **CSS-in-JS (styled-components)** | React-only, prefer component-scoped styles                    |

## References

- [Tailwind CSS Official Docs](https://tailwindcss.com/)
- [Tailwind v4 Release Notes](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind Labs 2026 Challenges](https://workspace.hr/ai-continues-to-disrupt-the-web-development-industry/)
