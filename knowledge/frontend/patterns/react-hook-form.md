---
name: React Hook Form
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# React Hook Form

## Overview

Performance-focused React form library using uncontrolled components and hooks. Industry standard for 2026 with minimal re-renders, excellent TypeScript/Zod integration. Alternative to Formik with better performance.

## Key Metrics

- **Bundle Size:** ~9KB (vs Formik ~15KB)
- **Re-renders:** Minimal (uncontrolled components vs Formik controlled)
- **DX:** Simple API, TypeScript/Zod integration, React Hook Form DevTools
- **Maturity:** 6+ years, production-grade, massive adoption
- **Cost:** Free, open-source

## Use Cases

| Scenario                   | Fit Score (1-10) | Rationale                                          |
| -------------------------- | ---------------- | -------------------------------------------------- |
| TypeScript + Zod projects  | 10               | Native Zod integration via `@hookform/resolvers`   |
| Performance-critical forms | 10               | Uncontrolled components = minimal re-renders       |
| Complex validation logic   | 9                | Schema-based (Zod), field-level, custom validators |
| Simple forms (<5 fields)   | 8                | Works well, but native HTML forms may suffice      |
| Existing Formik projects   | 7                | Migration effort, but performance gains worth it   |

## Trade-offs

### Strengths

- **Performance:** Uncontrolled components = no re-render on every keystroke
- **Small Bundle:** 9KB (vs Formik 15KB)
- **Zod Integration:** Type-safe validation with `zodResolver`
- **DevTools:** React Hook Form DevTools for debugging

### Weaknesses

- **Learning Curve:** `register`, `handleSubmit` patterns differ from Formik
- **Uncontrolled:** Less explicit state control (vs Formik controlled)
- **React 19 Impact:** Native form improvements may reduce need for library
- **Ecosystem:** Slightly smaller than Formik (though growing)

## Implementation Pattern

```bash
npm install react-hook-form @hookform/resolvers zod
```

```typescript
// components/SignupForm.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const signupSchema = z
  .object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupFormData) {
    await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="email">Email</label>
        <input {...register("email")} type="email" />
        {errors.email && <p>{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input {...register("password")} type="password" />
        {errors.password && <p>{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input {...register("confirmPassword")} type="password" />
        {errors.confirmPassword && <p>{errors.confirmPassword.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Sign Up"}
      </button>
    </form>
  );
}
```

## React Hook Form vs Formik

| Aspect          | React Hook Form       | Formik                  |
| --------------- | --------------------- | ----------------------- |
| **Performance** | Minimal re-renders ✅ | Re-renders on keystroke |
| **Bundle Size** | 9KB ✅                | 15KB                    |
| **Validation**  | Zod/Yup/built-in ✅   | Yup                     |
| **API**         | `register` hook       | Controlled components   |
| **TypeScript**  | Excellent ✅          | Good                    |

## Alternatives

| Alternative            | When to Choose Instead                                  |
| ---------------------- | ------------------------------------------------------- |
| **Formik**             | Prefer controlled components, existing Formik codebase  |
| **React 19 Forms**     | Simple forms, native `useActionState` + `useOptimistic` |
| **Zod + Native Forms** | Very simple forms, want minimal dependencies            |

## References

- [React Hook Form Official Docs](https://react-hook-form.com/)
- [React Hook Form + Zod](https://react-hook-form.com/get-started#SchemaValidation)
- [React Hook Form vs Formik Performance](https://namastedev.com/blog/react-hook-form-vs-formik)
