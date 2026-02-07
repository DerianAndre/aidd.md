---
name: Headless UI
category: frontend
last_updated: 2026-01-14
maturity: stable
---

# Headless UI

## Overview

Unstyled, accessible UI components for Tailwind CSS. Official Tailwind Labs library with React and Vue support. Simpler alternative to Radix UI with fewer components but tighter Tailwind integration.

## Key Metrics

- **Components:** 15+ (Dialog, Menu, Listbox, Combobox, etc.)
- **Accessibility:** WAI-ARIA compliant, keyboard navigation
- **Frameworks:** React, Vue (separate packages)
- **Maturity:** 5+ years, official Tailwind Labs
- **Cost:** Free, open-source

## Use Cases

| Scenario                    | Fit Score (1-10) | Rationale                      |
| --------------------------- | ---------------- | ------------------------------ |
| Tailwind CSS projects       | 10               | Official Tailwind Labs library |
| Need simpler API than Radix | 9                | Fewer components, easier API   |
| React or Vue projects       | 10               | Official support for both      |
| Need 30+ components         | 7                | Use Radix UI (more primitives) |
| Want pre-styled components  | 4                | Use Chakra/Material UI         |

## Trade-offs

### Strengths

- **Tailwind Integration:** Official Tailwind Labs, designed for TW
- **Simple API:** Easier than Radix UI
- **Accessibility:** Keyboard nav, focus management, ARIA
- **React + Vue:** Both officially supported

### Weaknesses

- **Fewer Components:** 15+ vs Radix 30+
- **Tailwind Required:** Not ideal for non-Tailwind projects
- **Less Flexible:** Simpler = less customization vs Radix
- **No Styles:** Must write Tailwind classes

## Implementation Pattern

```bash
npm install @headlessui/react
```

```typescript
// components/Dropdown.tsx
import { Menu } from "@headlessui/react";

export function Dropdown() {
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="px-4 py-2 bg-blue-500 text-white rounded">
        Options
      </Menu.Button>

      <Menu.Items className="absolute mt-2 w-48 bg-white rounded-lg shadow-lg">
        <Menu.Item>
          {({ active }) => (
            <a
              href="/account"
              className={`block px-4 py-2 ${
                active ? "bg-blue-500 text-white" : "text-gray-900"
              }`}
            >
              Account settings
            </a>
          )}
        </Menu.Item>

        <Menu.Item>
          {({ active }) => (
            <button
              className={`block w-full text-left px-4 py-2 ${
                active ? "bg-blue-500 text-white" : "text-gray-900"
              }`}
            >
              Sign out
            </button>
          )}
        </Menu.Item>
      </Menu.Items>
    </Menu>
  );
}
```

## Headless UI vs Alternatives

| Aspect          | Headless UI    | Radix UI   | shadcn/ui       |
| --------------- | -------------- | ---------- | --------------- |
| **Components**  | 15+            | 30+ ✅     | 40+ ✅          |
| **API**         | Simple ✅      | Complex    | Copy-paste      |
| **Tailwind**    | Official ✅    | Compatible | Built-in ✅     |
| **Frameworks**  | React + Vue ✅ | React      | React           |
| **Flexibility** | Moderate       | High ✅    | Full control ✅ |

## Alternatives

| Alternative   | When to Choose Instead                           |
| ------------- | ------------------------------------------------ |
| **Radix UI**  | Need more components (30+), React-only           |
| **shadcn/ui** | Want copy-paste code ownership, Radix + Tailwind |
| **Chakra UI** | Want styled components with Tailwind-like props  |

## References

- [Headless UI Official Docs](https://headlessui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Headless UI vs Radix UI](https://headlessui.com/react/menu#comparison-with-radix-ui)
