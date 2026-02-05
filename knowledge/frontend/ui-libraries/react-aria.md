---
name: React Aria
category: frontend
last_updated: 2026-01-15
maturity: stable
---

# React Aria

## Overview

A library of React hooks that provides accessible UI primitives. Unlike typical component libraries, it provides no styling, focusing entirely on accessibility, behavior, and logic.

## Key Metrics

- **Organization:** Adobe Spectrum Team
- **Approach:** Headless Hooks
- **Coverage:** 40+ UI patterns (selects, date pickers, comboboxes)
- **Maturity:** Highly mature, used as the foundation for HeroUI and Adobe Spectrum
- **Accessibility:** Industry-leading (WAI-ARIA compliance)

## Use Cases

| Scenario                                   | Fit Score (1-10) | Rationale                                            |
| ------------------------------------------ | ---------------- | ---------------------------------------------------- |
| Building a bespoke corporate design system | 10               | Handles all difficult a11y/behavior logic            |
| Highly custom, interactive widgets         | 10               | Provides behavior hooks (useButton, useSelect)       |
| Performance-sensitive apps                 | 9                | No bloated CSS or unused components                  |
| Rapid prototyping                          | 4                | Requires significant CSS work to make it look usable |

## Trade-offs

### Strengths

- **Accessibility:** Handles complex keyboard interactions, screen reader announcements, and focus management.
- **Full Creative Control:** Since it has no styles, you can make the components look like anything.
- **Modular:** Pull only what you need.

### Weaknesses

- **Development Time:** Higher effort than using pre-styled libraries like MUI.
- **Complexity:** Learning curve for understanding hook-based primitive composition.

## Implementation Pattern

```tsx
import { useButton } from "@react-aria/button";
import { useObjectRef } from "@react-aria/utils";

function MyButton(props) {
  let ref = useObjectRef(props.buttonRef);
  let { buttonProps } = useButton(props, ref);

  return (
    <button {...buttonProps} ref={ref} className="custom-btn">
      {props.children}
    </button>
  );
}
```

## Comparisons

| Aspect            | React Aria       | Radix UI   | Headless UI |
| ----------------- | ---------------- | ---------- | ----------- |
| **Pattern**       | Hooks ✅         | Components | Components  |
| **Accessibility** | Best in class ✅ | Excellent  | Good        |
| **Logic Only**    | Yes ✅           | Yes        | Mixed       |

## References

- [React Aria Official](https://react-spectrum.adobe.com/react-aria/)
- [Adobe Spectrum](https://spectrum.adobe.com/)
- [Accessibility Primitives](https://react-spectrum.adobe.com/react-aria/accessibility.html)
