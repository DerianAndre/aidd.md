---
name: HeroUI (formerly NextUI)
category: frontend
last_updated: 2026-01-15
maturity: stable
---

# HeroUI (NextUI)

## Overview

A modern React UI library built on top of Tailwind CSS and React Aria. Known for its exceptional aesthetics, smooth animations (Framer Motion), and great accessibility.

## Key Metrics

- **Foundations:** Tailwind CSS + React Aria + Framer Motion
- **Aesthetics:** High-polish, glassy effects, modern look
- **Accessibility:** High (via React Aria)
- **Maturity:** Stable v2.x (rebranded to HeroUI in late 2024-2025)
- **Bundle Size:** Moderate, heavily dependent on Tailwind

## Use Cases

| Scenario                         | Fit Score (1-10) | Rationale                                             |
| -------------------------------- | ---------------- | ----------------------------------------------------- |
| SaaS landing pages               | 10               | Extremely "wow" visual factor and animations          |
| Consumer-facing dashboards       | 10               | Elegant design defaults                               |
| Accessibility-critical apps      | 9                | Inherits logic from Adobe's React Aria                |
| Next.js projects                 | 9                | Highly optimized for Next.js patterns                 |
| Performance-sensitive mobile web | 7                | Heavy use of Framer Motion can impact low-end devices |

## Trade-offs

### Strengths

- **Beautiful Defaults:** Likely the most "premium" looking open-source library.
- **Accessibility:** Does not sacrifice usability for looks.
- **Tailwind Integration:** Works seamlessly with existing Tailwind configs.

### Weaknesses

- **Animation Overhead:** Framer Motion dependency adds complexity and bundle weight.
- **Opinionated Styling:** Deeply modern/glassy aesthetic might not fit every brand.
- **New Name:** Rebranding from NextUI to HeroUI caused some naming confusion in early 2025.

## Implementation Pattern

```tsx
import { HeroUIProvider, Button } from "@heroui/react";

function App() {
  return (
    <HeroUIProvider>
      <Button
        color="primary"
        variant="shadow"
        onPress={() => console.log("clicked")}
      >
        Hero Action
      </Button>
    </HeroUIProvider>
  );
}
```

## Comparisons

| Aspect         | HeroUI        | shadcn/ui      | MUI      |
| -------------- | ------------- | -------------- | -------- |
| **Core**       | React Aria    | Radix UI       | Custom   |
| **Styling**    | Tailwind      | Tailwind       | Emotion  |
| **Animations** | Framer Motion | CSS/Transition | Internal |

## References

- [HeroUI Official Site](https://heroui.com/)
- [React Aria](https://react-spectrum.adobe.com/react-aria/)
- [Tailwind CSS](https://tailwindcss.com/)
