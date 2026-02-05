---
name: Storybook
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# Storybook

## Overview

Component development environment for building, testing, and documenting UI components in isolation. Supports React, Vue, Svelte, Angular. Essential for design systems and component libraries.

## Key Metrics

- **DX:** Visual component explorer, hot reload, addons ecosystem
- **Framework Support:** React, Vue, Svelte, Angular, Web Components
- **Testing Integration:** Visual regression (Chromatic), interaction tests, a11y
- **Maturity:** 10+ years, production-grade, industry standard
- **Cost:** Free (Storybook), paid tiers for Chromatic (visual testing)

## Use Cases

| Scenario                             | Fit Score (1-10) | Rationale                                             |
| ------------------------------------ | ---------------- | ----------------------------------------------------- |
| Component libraries (design systems) | 10               | Industry standard for documenting reusable components |
| UI development in isolation          | 10               | Build components without running full app             |
| Visual regression testing            | 9                | Chromatic integration catches UI bugs                 |
| Teams >5 engineers                   | 9                | Shared component catalog prevents duplication         |
| Simple apps (<10 components)         | 4                | Overhead not justified (build in-app)                 |

## Trade-offs

### Strengths

- **Isolation:** Develop components without app dependencies
- **Documentation:** Auto-generated component docs (props, controls)
- **Testing:** Visual regression, interaction tests, a11y checks
- **Collaboration:** Designers/PMs can browse components without dev setup

### Weaknesses

- **Setup Overhead:** Initial config, stories maintenance
- **Build Time:** Storybook build adds CI time (5-10 minutes)
- **Story Maintenance:** Stories can drift from real usage if not maintained
- **Bundle Size:** Not used in production (dev-only overhead)

## Implementation Pattern

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"], // Auto-generate docs
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost"],
    },
    size: {
      control: "radio",
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// Story: Primary Button
export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Click me",
  },
};

// Story: Loading State
export const Loading: Story = {
  args: {
    variant: "primary",
    isLoading: true,
    children: "Loading...",
  },
};

// Story: With Icon
export const WithIcon: Story = {
  args: {
    variant: "primary",
    icon: <IconCheck />,
    children: "Submit",
  },
};
```

## Storybook Configuration

```typescript
// .storybook/main.ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials", // Controls, docs, actions
    "@storybook/addon-a11y", // Accessibility checks
    "@storybook/addon-interactions", // Interaction testing
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
```

## Interaction Testing

```typescript
// Button.stories.tsx
import { within, userEvent } from "@storybook/testing-library";
import { expect } from "@storybook/jest";

export const ClickHandler: Story = {
  args: {
    children: "Click me",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");

    // Simulate click
    await userEvent.click(button);

    // Assert
    await expect(button).toHaveFocus();
  },
};
```

## Visual Regression Testing (Chromatic)

```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on: [push, pull_request]

jobs:
  visual-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - uses: chromaui/action@v1
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: build-storybook
```

## Storybook vs Alternatives

| Aspect             | Storybook         | Plain HTML/CSS  | Component Docs (TSDoc) |
| ------------------ | ----------------- | --------------- | ---------------------- |
| **Visual Preview** | Yes ✅            | Manual          | No                     |
| **Interactivity**  | Controls ✅       | Manual JSFiddle | No                     |
| **Documentation**  | Auto-generated ✅ | Manual          | Markdown               |
| **Visual Testing** | Chromatic ✅      | Manual QA       | No                     |
| **Setup Overhead** | High              | Low ✅          | Low ✅                 |

## When Storybook Wins

| Scenario               | Why Storybook Wins                      |
| ---------------------- | --------------------------------------- |
| **Design System**      | Component catalog with visual preview   |
| **Team Collaboration** | Non-devs browse components without code |
| **Visual Regression**  | Catch UI bugs before production         |
| **Component Library**  | Publish to npm with usage examples      |

## Alternatives

| Alternative            | When to Choose Instead                            |
| ---------------------- | ------------------------------------------------- |
| **In-App Development** | Small component count (<10), solo developer       |
| **Histoire**           | Vue-focused alternative (Vite-native)             |
| **Ladle**              | Lightweight Storybook alternative (faster builds) |

## References

- [Storybook Official Docs](https://storybook.js.org/)
- [Storybook Interaction Testing](https://storybook.js.org/docs/react/writing-tests/interaction-testing)
- [Chromatic Visual Testing](https://www.chromatic.com/)
