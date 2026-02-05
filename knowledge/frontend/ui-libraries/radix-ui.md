---
name: Radix UI
category: frontend
last_updated: 2026-01-14
maturity: stable
---

# Radix UI

## Overview

Unstyled, accessible UI primitives for building design systems. WAI-ARIA compliant components with keyboard navigation and focus management. Foundation for shadcn/ui. Headless alternative to Material UI/Chakra.

## Key Metrics

- **Components:** 30+ primitives (Dialog, Dropdown, Tooltip, etc.)
- **Accessibility:** WAI-ARIA compliant, keyboard navigation, screen reader support
- **Styling:** Zero styles (bring your own CSS/Tailwind)
- **Maturity:** 5+ years, production-ready
- **Cost:** Free, open-source

## Use Cases

| Scenario                   | Fit Score (1-10) | Rationale                                   |
| -------------------------- | ---------------- | ------------------------------------------- |
| Building design systems    | 10               | Unstyled primitives = full design control   |
| Accessibility-first        | 10               | WAI-ARIA compliant out of box               |
| Tailwind CSS projects      | 10               | Foundation for shadcn/ui (Radix + Tailwind) |
| Need pre-styled components | 4                | Use Material UI/Chakra (styled libraries)   |
| Rapid prototyping          | 6                | More setup vs styled libraries              |

## Trade-offs

### Strengths

- **Accessibility:** Keyboard nav, focus management, ARIA labels built-in
- **Unstyled:** Full design control (vs Material UI opinionated)
- **Composable:** Build complex components from primitives
- **TypeScript:** First-class TS support

### Weaknesses

- **No Styles:** Must bring own CSS/Tailwind (vs Chakra styled)
- **Learning Curve:** Understand primitive composition
- **More Setup:** vs Material UI plug-and-play
- **Verbose:** More code than styled libraries

## Implementation Pattern

```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

```typescript
// components/Dialog.tsx
import * as Dialog from "@radix-ui/react-dialog";

export function MyDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="px-4 py-2 bg-blue-500 text-white rounded">
          Open Dialog
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-xl">
          <Dialog.Title className="text-lg font-bold">
            Edit Profile
          </Dialog.Title>
          <Dialog.Description className="text-gray-600 mt-2">
            Make changes to your profile here.
          </Dialog.Description>

          <form className="mt-4">
            <input className="border px-3 py-2 rounded" placeholder="Name" />
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="px-4 py-2 bg-gray-200 rounded">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Save
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

## Radix UI vs Alternatives

| Aspect            | Radix UI               | Headless UI  | Material UI      |
| ----------------- | ---------------------- | ------------ | ---------------- |
| **Styling**       | None ✅ (full control) | None ✅      | Material Design  |
| **Accessibility** | Excellent ✅           | Excellent ✅ | Good             |
| **Components**    | 30+                    | 15+          | 100+ ✅          |
| **Framework**     | React                  | React + Vue  | React            |
| **Setup**         | Manual style           | Manual style | Plug-and-play ✅ |

## Alternatives

| Alternative     | When to Choose Instead                                  |
| --------------- | ------------------------------------------------------- |
| **Headless UI** | Tailwind official, prefer simpler API, fewer components |
| **Material UI** | Want pre-styled components, Material Design             |
| **Chakra UI**   | Want styled components with accessibility               |

## References

- [Radix UI Official Docs](https://www.radix-ui.com/)
- [Radix Primitives](https://www.radix-ui.com/primitives)
- [shadcn/ui (built on Radix)](https://ui.shadcn.com/)
