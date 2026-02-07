---
name: Islands Architecture
category: pattern
last_updated: 2026-01-14
maturity: emerging
---

# Islands Architecture

## Overview

Frontend pattern shipping minimal JavaScript—static HTML with isolated interactive "islands." Pioneered by Astro, adopted by Fresh (Deno), Qwik. Optimizes for content-heavy sites.

## Key Metrics

- **Performance:** 0KB baseline JS (opt-in per island)
- **Lighthouse Score:** 100/100 achievable on content sites
- **Complexity:** Requires rethinking interactivity boundaries
- **DX:** Framework-agnostic (mix React, Vue, Svelte islands)
- **Maturity:** 3+ years (Astro v1.0 in 2022), production-ready

## Use Cases

| Scenario                 | Fit Score (1-10) | Rationale                                                  |
| ------------------------ | ---------------- | ---------------------------------------------------------- |
| Marketing sites, blogs   | 10               | Content static, minimal interactivity (header nav, search) |
| Documentation sites      | 10               | Code examples static, only theme toggle interactive        |
| E-commerce product pages | 9                | Product info static, "Add to Cart" button is island        |
| SaaS dashboards          | 3                | Too interactive, better with RSC/Remix                     |
| Real-time apps           | 2                | Islands pattern conflicts with pervasive reactivity        |

## Trade-offs

### Strengths

- **Performance:** Zero JS by default = instant page loads
- **SEO:** Pure HTML = perfect for search engines
- **Framework Agnostic:** Use React island + Svelte island in same page
- **Progressive Enhancement:** Site works without JavaScript

### Weaknesses

- **Interactivity Boundaries:** Hard to share state between islands
- **Learning Curve:** Requires paradigm shift from SPA thinking
- **Complex State:** Not ideal for apps with shared client state
- **Ecosystem:** Smaller than Next.js/React

## Implementation Pattern (Astro)

```astro
---
// Static content (no JS shipped)
const products = await getProducts();
---

<h1>Products</h1>
{products.map(p => <ProductCard product={p} />)}

<!-- Island: Interactive component (ships JS) -->
<ShoppingCart client:load />
<SearchBar client:idle />
```

**Hydration Strategies:**

- `client:load` - Load JS immediately
- `client:idle` - Load when browser idle
- `client:visible` - Load when scrolled into view
- `client:only` - Never server-render (maps component)

## Alternatives

| Alternative                 | When to Choose Instead                       |
| --------------------------- | -------------------------------------------- |
| **React Server Components** | App-like behavior, complex client/server mix |
| **Traditional SPA**         | Highly interactive (Google Docs, Figma)      |
| **Static Site Generator**   | Zero interactivity (no islands needed)       |

## References

- [Islands Architecture Explanation](https://jasonformat.com/islands-architecture/)
- [Astro Islands Guide](https://docs.astro.build/en/concepts/islands/)
- [Astro vs Remix vs SolidStart](https://bejamas.com/compare/astro-vs-remix-vs-solidstart)
