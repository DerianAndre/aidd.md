---
name: DaisyUI
category: frontend
last_updated: 2026-01-15
maturity: stable
---

# DaisyUI

## Overview

The most popular component library for Tailwind CSS. Unlike shadcn/ui which provides React components, DaisyUI provides pure CSS component classes that work across all frameworks (React, Vue, Svelte, HTML).

## Key Metrics

- **Core Technology:** Tailwind CSS
- **Component Style:** Semantic classes (e.g., `btn`, `card`, `modal`)
- **Size:** Adds negligible overhead to Tailwind builds
- **Theming:** Built-in theme generator (20+ themes included)
- **Maturity:** Stable, extremely high adoption (2026 industry standard)

## Use Cases

| Scenario                     | Fit Score (1-10) | Rationale                                             |
| ---------------------------- | ---------------- | ----------------------------------------------------- |
| Pure Tailwind projects       | 10               | Simplifies long utility strings into semantic classes |
| Multi-framework teams        | 10               | CSS-only components work in React, Vue, Svelte, etc.  |
| Speed-critical landing pages | 9                | No JS runtime for the components themselves           |
| Highly custom React logic    | 7                | You must handle state (open/close) yourself in React  |

## Trade-offs

### Strengths

- **Speed:** No JS runtime means no Hydration overhead for just "looking like a button".
- **Clean HTML:** Replaces 12 Tailwind classes with 1 semantic class.
- **Theming:** Powerful theme switching with simple data-attributes.

### Weaknesses

- **State Logic:** Unlike Radix/HeadlessUI, it doesn't provide the JS logic. You must add the React state to handle modals, tabs, etc.
- **Accessibility:** Since it is CSS-only, you are responsible for adding ARIA attributes (though docs provide help).

## Implementation Pattern

```html
<!-- In any framework: React, Svelte, or pure HTML -->
<button class="btn btn-primary">Hero Button</button>

<div class="card w-96 bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Shoes!</h2>
    <p>If a dog chews shoes whose shoes does he choose?</p>
    <div class="card-actions justify-end">
      <button class="btn btn-primary">Buy Now</button>
    </div>
  </div>
</div>
```

## Comparisons

| Aspect         | DaisyUI     | shadcn/ui   | Headless UI    |
| -------------- | ----------- | ----------- | -------------- |
| **Core**       | CSS Classes | React/Radix | React Behavior |
| **JS Runtime** | None ✅     | Low         | High           |
| **Logic**      | Manual      | Provided    | Provided       |

## References

- [DaisyUI Official](https://daisyui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [DaisyUI Themes](https://daisyui.com/docs/themes/)
