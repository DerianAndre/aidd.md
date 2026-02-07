---
name: shadcn/ui
category: frontend
last_updated: 2026-01-14
maturity: stable
---

# shadcn/ui

## Overview

Copy-and-paste component collection built on Radix UI primitives and styled with Tailwind CSS. Not a traditional npm library—you own the code. Industry standard for Next.js projects in 2026.

## Key Metrics

- **Bundle Size:** Minimal (components copied to your project)
- **DX:** Full code ownership, no version lock-in, accessible by default
- **Customization:** Infinite (modify source directly)
- **Maturity:** 2+ years, production-grade, massive adoption (2026 industry standard)
- **Cost:** Free, open-source

## Use Cases

| Scenario                           | Fit Score (1-10) | Rationale                                                    |
| ---------------------------------- | ---------------- | ------------------------------------------------------------ |
| Next.js projects (App Router)      | 10               | Industry standard, Tailwind + Radix best practices           |
| Full design control needed         | 10               | Copy-paste = modify anything (vs npm dependency constraints) |
| Accessible components required     | 10               | Built on Radix UI (WAI-ARIA compliant primitives)            |
| Need traditional component library | 3                | Use Material UI/Chakra (npm install, updates)                |
| Non-Tailwind projects              | 5                | Requires Tailwind CSS (can adapt but loses benefits)         |

## Trade-offs

### Strengths

- **Code Ownership:** Copy components to `components/ui/`, modify freely
- **No Version Lock-in:** Update selectively (vs breaking changes in MUI v5→v6)
- **Accessibility-First:** Radix UI primitives = keyboard nav, ARIA labels, screen reader support
- **Tailwind Integration:** Consistent design tokens, responsive utilities

### Weaknesses

- **Manual Updates:** No npm update (copy new versions manually)
- **Setup Required:** Initialize with CLI, configure Tailwind/Radix
- **Learning Curve:** Requires Tailwind knowledge (vs MUI's Material Design familiarity)
- **Not a Library:** Can't `import { Button } from 'shadcn-ui'` (intentional design)

## Implementation Pattern

```bash
# Initialize shadcn/ui in Next.js project
npx shadcn-ui@latest init

# Add specific components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
```

```typescript
// components/ui/button.tsx (copied to your project)
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

## shadcn/ui vs Traditional Libraries

| Aspect             | shadcn/ui          | Material UI     | Chakra UI       |
| ------------------ | ------------------ | --------------- | --------------- |
| **Distribution**   | Copy-paste ✅      | npm install     | npm install     |
| **Code Ownership** | Full ✅            | No (black box)  | No (black box)  |
| **Updates**        | Manual (selective) | npm update      | npm update      |
| **Customization**  | Infinite ✅        | Theme overrides | Theme overrides |
| **Bundle Size**    | Minimal ✅         | ~300KB          | ~150KB          |
| **Accessibility**  | Radix ✅           | Good            | Excellent ✅    |

## Alternatives

| Alternative     | When to Choose Instead                                                            |
| --------------- | --------------------------------------------------------------------------------- |
| **Material UI** | Need Google Material Design, prefer npm dependency, large component set           |
| **Chakra UI**   | Want npm library with similar accessibility, prefer component props over Tailwind |
| **Headless UI** | Just need unstyled primitives for custom Tailwind components                      |

## References

- [shadcn/ui Official Docs](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Why shadcn/ui is Different](https://ui.shadcn.com/docs)
