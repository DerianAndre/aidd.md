---
name: Material UI (MUI)
category: frontend
last_updated: 2026-01-14
maturity: stable
---

# Material UI (MUI)

## Overview

Comprehensive React component library implementing Google's Material Design. Enterprise-grade with 100+ components, advanced theming, and extensive tooling. Industry standard for enterprise applications.

## Key Metrics

- **Bundle Size:** ~300KB (full library), tree-shakeable
- **Components:** 100+ pre-built UI elements
- **DX:** Excellent documentation, TypeScript support, Material Design consistency
- **Maturity:** 10+ years, production-grade, massive ecosystem
- **Cost:** Free (Community), paid tier (MUI X for advanced data grid/date picker)

## Use Cases

| Scenario                                         | Fit Score (1-10) | Rationale                                                      |
| ------------------------------------------------ | ---------------- | -------------------------------------------------------------- |
| Enterprise applications                          | 10               | Comprehensive component set, stability, long-term support      |
| Google Material Design adherence                 | 10               | Official Material Design implementation                        |
| Need data grid, date picker (complex components) | 9                | MUI X provides advanced components (paid)                      |
| Custom brand design                              | 7                | Material Design opinionated (theming possible but constrained) |
| Bundle size critical                             | 5                | 300KB heavy (vs shadcn/ui copy-paste minimal)                  |

## Trade-offs

### Strengths

- **Comprehensive:** 100+ components (buttons, forms, tables, modals, navigation)
- **Material Design:** Consistent, familiar UI patterns (Google ecosystem)
- **Enterprise Support:** Pro/Premium tiers with advanced components
- **Tooling:** MUI System (sx prop), Material Icons, design kits

### Weaknesses

- **Bundle Size:** 300KB (vs Chakra 150KB, shadcn/ui minimal)
- **Material Design Lock-in:** Hard to deviate from opinionated design
- **Breaking Changes:** Major versions (v4→v5→v6) require migration
- **Customization Complexity:** Theme overrides can be verbose

## Implementation Pattern

```bash
npm install @mui/material @emotion/react @emotion/styled
```

```typescript
// app/page.tsx
import { Button, TextField, Card, CardContent } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
  typography: {
    fontFamily: "Inter, sans-serif",
  },
});

export default function Home() {
  return (
    <ThemeProvider theme={theme}>
      <Card sx={{ maxWidth: 400, margin: "auto", mt: 4 }}>
        <CardContent>
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            sx={{ mb: 2 }}
          />
          <Button variant="contained" color="primary" fullWidth>
            Submit
          </Button>
        </CardContent>
      </Card>
    </ThemeProvider>
  );
}
```

## MUI vs Alternatives

| Aspect            | MUI                 | shadcn/ui              | Chakra UI     |
| ----------------- | ------------------- | ---------------------- | ------------- |
| **Components**    | 100+ ✅             | 40+ (copy-paste)       | 50+           |
| **Bundle Size**   | ~300KB              | Minimal ✅             | ~150KB        |
| **Design System** | Material Design     | Custom (Tailwind)      | Custom        |
| **Customization** | Theme overrides     | Full code ownership ✅ | Props + theme |
| **Cost**          | Free + paid (MUI X) | Free ✅                | Free ✅       |

## Alternatives

| Alternative    | When to Choose Instead                                         |
| -------------- | -------------------------------------------------------------- |
| **shadcn/ui**  | Need full code ownership, Tailwind CSS, minimal bundle         |
| **Chakra UI**  | Want accessible components without Material Design constraints |
| **Ant Design** | Enterprise apps, prefer Ant Design system over Material        |

## References

- [MUI Official Docs](https://mui.com/)
- [Material Design Guidelines](https://m3.material.io/)
- [MUI vs Chakra UI vs Ant Design](https://www.builder.io/blog/react-component-libraries)
