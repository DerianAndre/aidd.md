---
name: Zod
category: tooling
last_updated: 2026-01-14
maturity: stable
---

# Zod

## Overview

TypeScript-first schema validation library with static type inference. Define schema once, get both runtime validation and TypeScript types. Essential for validating external data (API requests, forms, env vars).

## Key Metrics

- **Bundle Size:** ~8KB (gzipped)
- **Type Inference:** Automatic TypeScript types from schemas
- **Performance:** Fast validation (no reflection, code generation)
- **DX:** Excellent error messages, composable schemas, great with tRPC/React Hook Form
- **Maturity:** v3+ (5+ years), production-grade, massive adoption
- **Cost:** Free, open-source

## Use Cases

| Scenario                          | Fit Score (1-10) | Rationale                                     |
| --------------------------------- | ---------------- | --------------------------------------------- |
| API request validation            | 10               | Validate + type-safe in one definition        |
| Form validation (React Hook Form) | 10               | Native integration, great error messages      |
| Environment variables             | 9                | Parse/validate process.env at startup         |
| tRPC/Server Actions               | 10               | Type-safe input validation                    |
| Simple type checking only         | 4                | Use TypeScript (no runtime validation needed) |

## Trade-offs

### Strengths

- **Type Inference:** Define schema → get TypeScript type automatically
- **Runtime Safety:** Catch invalid data at runtime (API, forms, external sources)
- **Composability:** Reuse schemas, extend, merge, refine
- **Error Messages:** Detailed, actionable validation errors

### Weaknesses

- **Bundle Size:** ~8KB added to client (minimize with tree-shaking)
- **Learning Curve:** Schema syntax different from TypeScript types
- **Performance:** Slower than raw type guards (but rarely a bottleneck)
- **Alternatives Exist:** Yup, Joi (Zod more TypeScript-native)

## Implementation Pattern

```typescript
// schemas/user.ts
import { z } from "zod";

// Define schema
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(50),
  age: z.number().int().positive().optional(),
  role: z.enum(["admin", "user", "guest"]).default("user"),
});

// Infer TypeScript type automatically
export type CreateUserInput = z.infer<typeof createUserSchema>;
// Equivalent to:
// type CreateUserInput = {
//   email: string;
//   name: string;
//   age?: number;
//   role: 'admin' | 'user' | 'guest';
// }

// Validate at runtime
function createUser(data: unknown) {
  // Parse (throws error if invalid)
  const validated = createUserSchema.parse(data);
  // `validated` is now type CreateUserInput

  // Or safeParse (returns result object)
  const result = createUserSchema.safeParse(data);
  if (!result.success) {
    console.error(result.error.issues); // Detailed errors
    return;
  }

  const user = result.data; // Type-safe
}
```

## Composable Schemas

```typescript
// Base schemas
const emailSchema = z.string().email();
const passwordSchema = z.string().min(8).max(100);

// Compose
const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Extend
const registerSchema = loginSchema
  .extend({
    name: z.string().min(2),
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
```

## Environment Variable Validation

```typescript
// env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()),
});

// Parse at startup (crashes if env vars invalid)
export const env = envSchema.parse(process.env);

// Usage (auto-completion!)
console.log(env.DATABASE_URL); // Typed as string
console.log(env.PORT); // Typed as number (transformed)
```

## React Hook Form Integration

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema), // Zod validation
  });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}

      <input {...register("password")} type="password" />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Sign Up</button>
    </form>
  );
}
```

## Zod vs Alternatives

| Aspect             | Zod                      | Yup    | Joi              |
| ------------------ | ------------------------ | ------ | ---------------- |
| **Type Inference** | Automatic ✅             | Manual | No (JS-first)    |
| **Bundle Size**    | ~8KB ✅                  | ~15KB  | ~150KB (Node.js) |
| **DX**             | Excellent ✅             | Good   | Good             |
| **Ecosystem**      | tRPC, React Hook Form ✅ | Formik | Hapi.js          |

## Alternatives

| Alternative           | When to Choose Instead                         |
| --------------------- | ---------------------------------------------- |
| **TypeScript Only**   | No runtime validation needed (internal types)  |
| **Yup**               | Existing Formik integration, prefer Yup syntax |
| **Ajv (JSON Schema)** | Need JSON Schema compatibility                 |

## References

- [Zod Official Docs](https://zod.dev/)
- [Zod vs Yup vs Joi](https://blog.logrocket.com/comparing-schema-validation-libraries-zod-vs-yup/)
- [React Hook Form + Zod](https://react-hook-form.com/get-started#SchemaValidation)
