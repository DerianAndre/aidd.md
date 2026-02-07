# Frontend Development Rules

> **Activation:** Projects containing React, Vue, Angular, Tailwind, or frontend patterns

---

## Accessibility: WCAG 2.1 Level AA (Mandatory)

### Semantic HTML

```tsx
// ❌ BAD: Div Soup
<div onClick={handleClick}>Click me</div>

// ✅ GOOD: Semantic Elements
<button onClick={handleClick}>Click me</button>
```

### ARIA Labels (Required for Interactive Elements)

```tsx
// Icons without text
<button aria-label="Close modal">
  <XIcon />
</button>

// Form inputs
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-required="true" />

// Dynamic state
<button aria-expanded={isOpen} aria-controls="menu-panel">
  Menu
</button>
```

### Keyboard Navigation

- **Focus Management:** Every interactive element must be keyboard-accessible
- **Focus Indicators:** NEVER use `outline: none` without a custom focus ring

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

### Color Contrast

- **Text:** ≥4.5:1 for normal text, ≥3:1 for large text (18px+ or 14px+ bold)
- **UI Components:** ≥3:1 for borders, icons, focus indicators
- **Tool:** Use browser DevTools or [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## Component Design Patterns

### Composition > Configuration

```tsx
// ❌ BAD: Props explosion
<Card
  title="User Profile"
  subtitle="john@example.com"
  imageUrl="/avatar.jpg"
  showBadge
  badgeText="Pro"
  actionText="Edit"
  onAction={handleEdit}
/>

// ✅ GOOD: Composable slots
<Card>
  <Card.Image src="/avatar.jpg" alt="John Doe" />
  <Card.Header>
    <Card.Title>User Profile</Card.Title>
    <Card.Subtitle>john@example.com</Card.Subtitle>
    <Card.Badge>Pro</Card.Badge>
  </Card.Header>
  <Card.Actions>
    <Button onClick={handleEdit}>Edit</Button>
  </Card.Actions>
</Card>
```

### TypeScript Strictness

```tsx
// ✅ Required: Explicit types for props
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger'; // Never 'string'
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export const Button: React.FC<ButtonProps> = ({ ... }) => { ... };
```

---

## Styling: Tailwind CSS Best Practices

### Utility-First (Preferred)

```tsx
// ✅ Inline utilities for one-off components
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-900">Title</h2>
  <button className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
    Action
  </button>
</div>
```

### Extracting Components (When >3 Usages)

```tsx
// ✅ Reusable component with variants
const cardStyles = {
  base: "p-4 rounded-lg shadow-md",
  variants: {
    default: "bg-white",
    dark: "bg-gray-800 text-white",
    outlined: "bg-transparent border-2 border-gray-300",
  },
};

<Card variant="dark">Content</Card>;
```

### Responsive Design (Mobile-First)

```tsx
// ✅ Always start with mobile, scale up
<div className="
  flex flex-col          /* Mobile: Stack vertically */
  md:flex-row            /* Tablet+: Horizontal layout */
  gap-4 md:gap-6         /* Adjust spacing for larger screens */
  p-4 md:p-8             /* More padding on desktop */
">
```

### Dark Mode Support

```tsx
// ✅ Use Tailwind's dark: variant
<div className="bg-white dark:bg-gray-900">
  <h1 className="text-gray-900 dark:text-white">Title</h1>
</div>
```

---

## Performance Optimization

### Code Splitting

```tsx
// ✅ Lazy load heavy components
import { lazy, Suspense } from "react";

const HeavyChart = lazy(() => import("./HeavyChart"));

<Suspense fallback={<Spinner />}>
  <HeavyChart data={data} />
</Suspense>;
```

### Image Optimization

```tsx
// ✅ Use Next.js Image or responsive images
import Image from "next/image";

<Image
  src="/hero.jpg"
  alt="Description"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>;
```

### Memoization

```tsx
import { useMemo, useCallback } from "react";

// ✅ Memoize expensive computations
const sortedData = useMemo(
  () => data.sort((a, b) => a.score - b.score),
  [data]
);

// ✅ Stabilize callbacks passed to children
const handleClick = useCallback(() => {
  console.log("Clicked item:", itemId);
}, [itemId]);
```

---

## Testing Standards

### Testing Library Philosophy

- **Query Priorities:**
  1. `getByRole` (preferred - accessibility-focused)
  2. `getByLabelText` (forms)
  3. `getByText` (user-visible text)
  4. `getByTestId` (last resort)

```tsx
// ✅ GOOD: Role-based queries
render(<LoginForm />);
const emailInput = screen.getByRole("textbox", { name: /email/i });
const submitButton = screen.getByRole("button", { name: /sign in/i });

// ❌ AVOID: Test IDs for everything
const emailInput = screen.getByTestId("email-input");
```

### Component Test Structure

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

describe("Button", () => {
  it("renders with correct text", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: /click me/i })
    ).toBeInTheDocument();
  });

  it("calls onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is keyboard accessible", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    const button = screen.getByRole("button");
    button.focus();
    fireEvent.keyDown(button, { key: "Enter" });

    expect(handleClick).toHaveBeenCalled();
  });
});
```

---

## State Management

### Local State (useState)

```tsx
// ✅ For component-specific UI state
const [isOpen, setIsOpen] = useState(false);
```

### Global State (Context API)

```tsx
// ✅ For app-wide data (theme, auth, locale)
const ThemeContext = createContext<"light" | "dark">("light");

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};
```

### Complex State (Zustand/Jotai)

```tsx
// ✅ For complex client state (shopping cart, filters, etc.)
import { create } from "zustand";

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
}));
```

---

## Common Anti-Patterns to Avoid

### 1. Prop Drilling

```tsx
// ❌ BAD: Passing props through 5 levels
<GrandParent user={user}>
  <Parent user={user}>
    <Child user={user}>
      <GrandChild user={user} />

// ✅ GOOD: Use Context or state management
const user = useUser(); // Hook from Context
```

### 2. Inline Functions in JSX (When Causing Re-renders)

```tsx
// ⚠️ CAUTION: Creates new function on every render
<Button onClick={() => handleClick(id)}>Click</Button>;

// ✅ BETTER: Use useCallback if this Button is memoized
const onClick = useCallback(() => handleClick(id), [id]);
<Button onClick={onClick}>Click</Button>;
```

### 3. Key Prop Misuse

```tsx
// ❌ BAD: Index as key (breaks when list reorders)
{
  items.map((item, index) => <Item key={index} {...item} />);
}

// ✅ GOOD: Stable unique identifier
{
  items.map((item) => <Item key={item.id} {...item} />);
}
```

---

**Enforcement:** Use `/design` workflow for accessibility audits and `/test` for component testing.

---

## Template: Frontend Development

> Absorbed from `templates/frontend.md`

### Multi-Perspective Analysis

Think from ALL 4 perspectives simultaneously when building UI:

| Role | Focus |
|------|-------|
| **Frontend Engineer** | Structure, data flow, state management, TypeScript types |
| **UX/UI Lead** | Design tokens, spacing, colors (OKLCH), visual hierarchy, consistency |
| **Copywriter** | Labels, error messages, placeholders, microcopy, i18n readiness |
| **Motion Designer** | Transitions, loading animations, skeleton states, micro-interactions |

### Component Architecture — Atomic Design

Structure components following the atomic design hierarchy:

```
atoms → molecules → organisms → templates → pages
```

- One component per file
- Props interface with TypeScript strict types
- Export descriptor for handle topology (if applicable)

### Mandatory States Checklist

Every interactive component MUST implement ALL of these states:

- [ ] **Default** — Normal resting state
- [ ] **Hover** — Visual feedback on pointer hover
- [ ] **Focus** — Visible indicator (never removed, high-contrast)
- [ ] **Active/Pressed** — Feedback during interaction
- [ ] **Disabled** — Visually distinct + `aria-disabled`
- [ ] **Loading** — Skeleton or spinner + `aria-busy`
- [ ] **Empty** — Helpful message + action CTA
- [ ] **Error** — Descriptive message + recovery action
- [ ] **Success** — Confirmation + next step

### Responsive Design Checklist

- Mobile-first approach (always start mobile, scale up)
- Test at breakpoints: **320px**, **768px**, **1024px**, **1440px**
- Fluid typography and spacing where appropriate
- No horizontal scroll at any breakpoint
- Touch targets >= 44x44px on mobile

### i18n Readiness

- All user-facing strings in locale files (i18next)
- Support interpolation for dynamic values
- Handle plural forms
- RTL consideration for future locales
- No hardcoded strings in components

### Quality Gates

- [ ] All states implemented (default, hover, focus, active, disabled, loading, empty, error, success)
- [ ] WCAG 2.1 AA compliant
- [ ] Responsive at all breakpoints (320/768/1024/1440)
- [ ] No hardcoded strings (all in i18n)
- [ ] TypeScript strict (no `any`)
- [ ] Design tokens used (no hardcoded colors/spacing)
- [ ] Keyboard navigable
- [ ] Screen reader tested

**Last Updated:** 2026-02-06
