---
name: Formik
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# Formik

## Overview

Structured React form library using controlled components. Comprehensive solution with extensive documentation and Yup validation. Mature alternative to React Hook Form with more explicit state control.

## Key Metrics

- **Bundle Size:** ~15KB (vs React Hook Form 9KB)
- **DX:** Intuitive API, extensive docs, large community
- **Validation:** Yup integration, field-level, schema-based
- **Maturity:** 7+ years, production-grade, battle-tested
- **Cost:** Free, open-source

## Use Cases

| Scenario                    | Fit Score (1-10) | Rationale                                   |
| --------------------------- | ---------------- | ------------------------------------------- |
| Existing Formik codebases   | 10               | No migration needed, team familiar with API |
| Complex nested forms        | 9                | FieldArray, nested object handling          |
| Need explicit state control | 9                | Controlled components = visible form state  |
| Performance-critical forms  | 6                | Use React Hook Form (fewer re-renders)      |
| TypeScript + Zod projects   | 7                | React Hook Form better Zod integration      |

## Trade-offs

### Strengths

- **Explicit State:** Controlled components = visible form values
- **Mature Ecosystem:** Large community, tutorials, UI library integrations
- **FieldArray:** Robust dynamic field handling
- **Yup Validation:** Schema-based validation (similar to Zod)

### Weaknesses

- **Performance:** Re-renders on every keystroke (vs React Hook Form uncontrolled)
- **Bundle Size:** 15KB (vs React Hook Form 9KB)
- **React 19 Impact:** Native forms may reduce need for Formik
- **Slower Development:** Controlled pattern = more boilerplate

## Implementation Pattern

```bash
npm install formik yup
```

```typescript
// components/LoginForm.tsx
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

const loginSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(8, "Too short").required("Required"),
});

export function LoginForm() {
  return (
    <Formik
      initialValues={{ email: "", password: "" }}
      validationSchema={loginSchema}
      onSubmit={async (values, { setSubmitting }) => {
        await fetch("/api/login", {
          method: "POST",
          body: JSON.stringify(values),
        });
        setSubmitting(false);
      }}
    >
      {({ isSubmitting }) => (
        <Form>
          <div>
            <label htmlFor="email">Email</label>
            <Field name="email" type="email" />
            <ErrorMessage name="email" component="div" />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <Field name="password" type="password" />
            <ErrorMessage name="password" component="div" />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Login"}
          </button>
        </Form>
      )}
    </Formik>
  );
}
```

## Formik vs React Hook Form

| Aspect            | Formik                  | React Hook Form |
| ----------------- | ----------------------- | --------------- |
| **Performance**   | Re-renders on keystroke | Minimal ✅      |
| **Bundle Size**   | 15KB                    | 9KB ✅          |
| **API**           | Controlled components   | Uncontrolled ✅ |
| **State Control** | Explicit ✅             | Implicit        |
| **Ecosystem**     | Large ✅                | Growing         |

## Alternatives

| Alternative         | When to Choose Instead                                 |
| ------------------- | ------------------------------------------------------ |
| **React Hook Form** | Need performance, smaller bundle, TypeScript + Zod     |
| **React 19 Forms**  | Simple forms, native `useActionState` + Server Actions |
| **Zod + Native**    | Very simple forms, want minimal dependencies           |

## References

- [Formik Official Docs](https://formik.org/)
- [Formik + Yup Validation](https://formik.org/docs/guides/validation)
- [Formik vs React Hook Form](https://dhiwise.com/post/comparing-react-hook-form-vs-formik)
