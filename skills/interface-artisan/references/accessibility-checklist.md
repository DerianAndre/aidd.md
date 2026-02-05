# React Accessibility (A11y) Checklist

> **Purpose:** Ensure WCAG 2.1 Level AA compliance for React components

---

## 🎯 Interactive Elements

### Roles & Semantics

- [ ] **Correct ARIA role:** Does the element have the appropriate `role` attribute?

  - `role="button"` for clickable non-button elements
  - `role="dialog"` for modals/popups
  - `role="navigation"` for nav menus
  - `role="alert"` for important messages

- [ ] **Semantic HTML first:** Prefer native elements over ARIA
  - ✅ Use `<button>` instead of `<div role="button">`
  - ✅ Use `<nav>` instead of `<div role="navigation">`

### Labeling

- [ ] **Every form input has a label:**

  - `<label htmlFor="email">` + `<input id="email" />`
  - OR `aria-label="Email address"`
  - OR `aria-labelledby="email-label"`

- [ ] **Icon buttons have text alternatives:**

  ```tsx
  <button aria-label="Close modal">
    <XIcon />
  </button>
  ```

- [ ] **Links describe their purpose:**

  ```tsx
  {
    /* ❌ BAD */
  }
  <a href="/article">Click here</a>;

  {
    /* ✅ GOOD */
  }
  <a href="/article">Read the full article about accessibility</a>;
  ```

---

## ⌨️ Keyboard Navigation

### Focus Management

- [ ] **Visible focus indicators:** Never use `outline: none` without alternative

  ```css
  /* ❌ BAD */
  button:focus {
    outline: none;
  }

  /* ✅ GOOD */
  button:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
  }
  ```

- [ ] **Logical tab order:** `tabIndex` follows visual flow

  - Default (0): Natural DOM order
  - Avoid positive `tabIndex` values (breaks natural flow)
  - Use `-1` for programmatically focusable elements

- [ ] **Focus trapping in modals:** User cannot tab outside modal while open

  ```tsx
  import { useRef, useEffect } from "react";
  import FocusTrap from "focus-trap-react";

  const Modal = ({ isOpen, children }) => {
    if (!isOpen) return null;

    return (
      <FocusTrap>
        <div role="dialog" aria-modal="true">
          {children}
        </div>
      </FocusTrap>
    );
  };
  ```

### Keyboard Interactions

- [ ] **Enter/Space activate buttons:**

  ```tsx
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };
  ```

- [ ] **Escape closes dialogs/dropdowns:**

  ```tsx
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);
  ```

- [ ] **Arrow keys navigate menus/lists** (if applicable)

---

## 🔊 Dynamic State Communication

### ARIA States

- [ ] **`aria-expanded`:** For collapsible elements

  ```tsx
  <button aria-expanded={isOpen} aria-controls="menu-panel">
    Menu
  </button>
  <div id="menu-panel">{/* ... */}</div>
  ```

- [ ] **`aria-checked`:** For custom checkboxes/toggles

  ```tsx
  <div role="checkbox" aria-checked={isChecked} tabIndex={0}>
    {isChecked ? <CheckIcon /> : <UncheckIcon />}
  </div>
  ```

- [ ] **`aria-disabled`:** Communicate disabled state
  ```tsx
  <button aria-disabled={isLoading} disabled={isLoading}>
    {isLoading ? "Loading..." : "Submit"}
  </button>
  ```

### Live Regions

- [ ] **`aria-live`:** For dynamic content updates

  ```tsx
  {
    /* Polite: Waits for user pause */
  }
  <div aria-live="polite" aria-atomic="true">
    {successMessage}
  </div>;

  {
    /* Assertive: Interrupts immediately */
  }
  <div role="alert" aria-live="assertive">
    {errorMessage}
  </div>;
  ```

---

##🖼️ Images & Media

### Alt Text

- [ ] **Informative images have descriptive alt text:**

  ```tsx
  <img src="chart.png" alt="Bar chart showing 40% increase in sales" />
  ```

- [ ] **Decorative images use empty alt:**

  ```tsx
  <img src="divider.png" alt="" />
  ```

- [ ] **Complex images have long descriptions:**
  ```tsx
  <img
    src="diagram.png"
    alt="System architecture diagram"
    aria-describedby="diagram-description"
  />
  <div id="diagram-description" className="sr-only">
    Detailed description of the diagram...
  </div>
  ```

### Video & Audio

- [ ] **Captions for videos:** `<track kind="captions">`
- [ ] **Transcripts for audio content**

---

## 🎨 Color & Contrast

### Contrast Ratios (WCAG AA)

- [ ] **Normal text:** ≥4.5:1 ratio
- [ ] **Large text (18px+ or 14px+ bold):** ≥3:1 ratio
- [ ] **UI components (borders, icons):** ≥3:1 ratio

**Tool:** Chrome DevTools → Inspect → Accessibility tab

### Color Independence

- [ ] **Information not conveyed by color alone:**

  ```tsx
  {
    /* ❌ BAD: Only color indicates error */
  }
  <input className="border-red-500" />;

  {
    /* ✅ GOOD: Icon + text + color */
  }
  <div>
    <input className="border-red-500" aria-invalid="true" />
    <span role="alert">
      <ErrorIcon /> Email is required
    </span>
  </div>;
  ```

---

## 📱 Responsive & Mobile

- [ ] **Touch targets ≥44×44px** (WCAG 2.1 Level AAA: ≥48×48px)
- [ ] **Zoom up to 200%** without horizontal scrolling
- [ ] **Screen reader compatibility** on iOS (VoiceOver) and Android (TalkBack)

---

## 🧪 Testing

### Automated Tools

```bash
# Install axe-core for Vitest
npm install --save-dev @axe-core/react vitest-axe
```

```tsx
import { axe, toHaveNoViolations } from "vitest-axe";
expect.extend(toHaveNoViolations);

it("has no accessibility violations", async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing

- [ ] **Keyboard-only navigation:** Unplug mouse, navigate entire UI
- [ ] **Screen reader test:** Use NVDA (Windows), VoiceOver (Mac), or JAWS
- [ ] **Zoom test:** Browser zoom to 200%, check layout
- [ ] **Color blind simulation:** Chrome DevTools → Rendering → Emulate vision deficiencies

---

## ✅ Pre-deployment Checklist

- [ ] All interactive elements keyboard-accessible
- [ ] All images have appropriate alt text
- [ ] Color contrast ratios meet WCAG AA
- [ ] Forms have labels and error messages
- [ ] Modals trap focus and close on Escape
- [ ] Dynamic content uses `aria-live`
- [ ] No accessibility violations from automated tests

---

## 🔗 Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [MDN ARIA Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [React Accessibility Docs](https://react.dev/learn/accessibility)
