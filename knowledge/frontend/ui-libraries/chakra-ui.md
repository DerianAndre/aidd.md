---
name: Chakra UI
category: frontend
last_updated: 2026-01-14
maturity: stable
---

# Chakra UI

## Overview

Accessible React component library with simple, modular, and customizable components. Built-in dark mode, responsive design, and excellent developer experience. Alternative to Material UI without design system constraints.

## Key Metrics

- **Bundle Size:** ~150KB (vs MUI 300KB)
- **Components:** 50+ accessible UI elements
- **DX:** Intuitive prop-based styling, excellent TypeScript support
- **Accessibility:** WAI-ARIA compliant by default
- **Maturity:** 5+ years, production-grade, strong community
- **Cost:** Free, open-source

## Use Cases

| Scenario                         | Fit Score (1-10) | Rationale                                                |
| -------------------------------- | ---------------- | -------------------------------------------------------- |
| Accessibility-first applications | 10               | WAI-ARIA compliance built-in (keyboard nav, ARIA labels) |
| Dark mode required               | 10               | Native dark mode support via useColorMode hook           |
| Rapid prototyping                | 9                | Simple prop-based API (no Tailwind knowledge needed)     |
| Custom brand design              | 9                | Not opinionated like Material Design (easy theming)      |
| Bundle size critical             | 7                | 150KB (lighter than MUI, heavier than shadcn/ui)         |

## Trade-offs

### Strengths

- **Accessibility:** Keyboard navigation, screen reader support, focus management
- **Dark Mode:** Built-in with `useColorMode` hook
- **Simple API:** Props instead of Tailwind classes (`<Button size="lg" colorScheme="blue" />`)
- **Responsive:** `display={{ base: 'none', md: 'block' }}` (mobile-first)

### Weaknesses

- **Bundle Size:** 150KB (vs shadcn/ui minimal copy-paste)
- **Learning Curve:** Chakra-specific props (vs standard CSS or Tailwind)
- **Customization Limits:** Theme-based (vs shadcn/ui full code ownership)
- **Breaking Changes:** Major versions require migration (v2→v3)

## Implementation Pattern

```bash
npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion
```

```typescript
// app/providers.tsx
"use client";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  colors: {
    brand: {
      50: "#e3f2fd",
      500: "#2196f3",
      900: "#0d47a1",
    },
  },
  fonts: {
    heading: "Inter, sans-serif",
    body: "Inter, sans-serif",
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>;
}
```

```typescript
// components/LoginForm.tsx
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  useColorMode,
} from "@chakra-ui/react";

export function LoginForm() {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Box maxW="md" mx="auto" mt={8} p={6} borderRadius="lg" boxShadow="xl">
      <Stack spacing={4}>
        <FormControl>
          <FormLabel>Email</FormLabel>
          <Input type="email" placeholder="you@example.com" />
        </FormControl>

        <FormControl>
          <FormLabel>Password</FormLabel>
          <Input type="password" />
        </FormControl>

        <Button colorScheme="brand" size="lg" width="full">
          Sign In
        </Button>

        <Button onClick={toggleColorMode} variant="ghost">
          Toggle {colorMode === "light" ? "Dark" : "Light"} Mode
        </Button>
      </Stack>
    </Box>
  );
}
```

## Chakra UI vs Alternatives

| Aspect            | Chakra UI       | MUI            | shadcn/ui         |
| ----------------- | --------------- | -------------- | ----------------- |
| **Accessibility** | Excellent ✅    | Good           | Excellent ✅      |
| **Dark Mode**     | Built-in ✅     | Manual theming | Manual (Tailwind) |
| **API**           | Props ✅ (easy) | Props + sx     | Tailwind classes  |
| **Bundle Size**   | ~150KB          | ~300KB         | Minimal ✅        |
| **Customization** | Theme-based     | Theme-based    | Full code ✅      |

## Alternatives

| Alternative             | When to Choose Instead                                         |
| ----------------------- | -------------------------------------------------------------- |
| **shadcn/ui**           | Need code ownership, Tailwind CSS, minimal bundle size         |
| **Material UI**         | Want Material Design, need 100+ components, enterprise support |
| **Radix UI + Tailwind** | Want headless primitives with custom Tailwind styling          |

## References

- [Chakra UI Official Docs](https://chakra-ui.com/)
- [Chakra UI vs MUI](https://chakra-ui.com/getting-started/comparison)
- [Accessibility Best Practices](https://chakra-ui.com/docs/styled-system/accessibility)
