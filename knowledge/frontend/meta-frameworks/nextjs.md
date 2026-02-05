---
name: Next.js
category: frontend
last_updated: 2026-01-14
maturity: stable
---

# Next.js

## Overview

Industry-standard React meta-framework with React Server Components, App Router, and Vercel integration. Optimized for complex web applications with dynamic content and server-side rendering.

## Key Metrics

- **Performance:** LCP 1-2s with RSC (vs 2-3s SPA), Partial Prerendering (PPR) for hybrid static/dynamic
- **Bundle Size:** Variable (Server Components reduce client JS significantly)
- **DX:** Largest ecosystem, Vercel deployment, Image/Font optimization
- **Maturity:** v15-16+ (2026), production-grade, backed by Vercel
- **Cost:** Vercel (premium) or self-hosted (standard cloud costs)

## Use Cases

| Scenario                | Fit Score (1-10) | Rationale                                             |
| ----------------------- | ---------------- | ----------------------------------------------------- |
| Complex SaaS dashboards | 10               | RSC + Server Actions = ideal for data-heavy apps      |
| E-commerce platforms    | 9                | Product pages (static) + cart/checkout (dynamic)      |
| Social media apps       | 9                | Feed (server) + interactions (client components)      |
| Marketing sites         | 5                | Overkill for static content (use Astro instead)       |
| Real-time analytics     | 7                | Good but SolidStart better for high-frequency updates |

## Trade-offs

### Strengths

- **React Server Components:** Move data fetching to server, reduce client bundle
- **Ecosystem:** Massive library support, UI component libraries (shadcn, MUI)
- **Image/Font Optimization:** Built-in next/image, next/font
- **Partial Prerendering (PPR):** Hybrid static shell + dynamic content streaming

### Weaknesses

- **Complexity:** App Router learning curve, "magic" abstractions
- **Vendor Lock-in Risk:** Vercel-optimized features (though self-hostable)
- **Over-engineering:** Too heavy for simple content sites
- **Churn:** Rapid API changes (Pages Router → App Router transition)

## Alternatives

| Alternative    | When to Choose Instead                                      |
| -------------- | ----------------------------------------------------------- |
| **Astro**      | Static content, blogs, marketing sites (zero JS by default) |
| **Remix**      | Form-heavy SaaS, prefer web standards over RSC magic        |
| **SolidStart** | Real-time dashboards, need granular reactivity              |

## References

- [Next.js 15 RC](https://nextjs.org/blog/next-15-rc)
- [Next.js 16 Announcement](https://nextjs.org/blog/next-16)
- [Is Next.js Still Best for 2026?](https://www.ailoitte.com/blog/nextjs-2026-review/)
- [NextJS vs Astro vs Remix Comparison](https://bitkidd.dev/posts/nextjs-vs-remix-vs-sveltekit-vs-astro)
