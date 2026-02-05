---
name: Jotai
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# Jot ai

## Overview

Primitive and flexible atomic state management for React. Bottom-up approach with independent atoms enabling fine-grained reactivity. Minimal bundle (~3KB) alternative to Redux/Zustand.

## Key Metrics

- **Bundle Size:** ~3KB (vs Redux 12KB, Recoil 21KB)
- **Performance:** Fine-grained updates (only subscribed components re-render)
- **DX:** Simple API, TypeScript-first, minimal boilerplate
- **Maturity:** 4+ years, production-ready, rapid adoption in 2026
- **Cost:** Free, open-source

## Use Cases

| Scenario                        | Fit Score (1-10) | Rationale                                          |
| ------------------------------- | ---------------- | -------------------------------------------------- |
| Performance-critical apps       | 10               | Atomic updates = minimal re-renders                |
| TypeScript projects             | 10               | Type-safe atoms, atomic operations                 |
| Next.js projects                | 9                | Popular in Next.js ecosystem, integration examples |
| Need simple global state        | 9                | Easier than Redux, more structured than Zustand    |
| Enterprise with strict patterns | 7                | Use Redux Toolkit (debugging tools, opinionated)   |

## Trade-offs

### Strengths

- **Lightweight:** 3KB bundle (vs Redux 12KB)
- **Fine-Grained:** Only components using changed atoms re-render
- **Atomic:** Bottom-up composition (vs Redux top-down)
- **TypeScript-First:** Strong typing, type inference

### Weaknesses

- **DevTools:** Basic (vs Redux DevTools time-travel)
- **Learning Curve:** Atomic pattern unfamiliar vs Redux slices
- **Ecosystem:** Smaller than Redux (though growing)
- **Documentation:** Less comprehensive than Redux

## Implementation Pattern

```bash
npm install jotai
```

```typescript
// store/atoms.ts
import { atom } from "jotai";

// Primitive atom
export const userAtom = atom<User | null>(null);

// Derived atom (computed)
export const userNameAtom = atom((get) => get(userAtom)?.name ?? "Guest");

// Write-only atom (action)
export const logoutAtom = atom(
  null, // no read
  (get, set) => {
    set(userAtom, null);
  }
);

// Async atom
export const fetchUserAtom = atom(async (get) => {
  const response = await fetch("/api/user");
  return response.json();
});

// Atom with read and write
export const countAtom = atom(0);
export const incrementAtom = atom(
  (get) => get(countAtom),
  (get, set) => set(countAtom, get(countAtom) + 1)
);
```

```typescript
// app/providers.tsx
"use client";
import { Provider } from "jotai";

export function Providers({ children }: { children: React.NodeNode }) {
  return <Provider>{children}</Provider>;
}

// components/UserProfile.tsx
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { userAtom, userNameAtom, logoutAtom } from "@/store/atoms";

export function UserProfile() {
  const [user, setUser] = useAtom(userAtom); // Read + write
  const userName = useAtomValue(userNameAtom); // Read-only
  const logout = useSetAtom(logoutAtom); // Write-only

  return (
    <div>
      <h1>{userName}</h1>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

// Only this component re-renders when userAtom changes
// (vs Redux where entire branch may re-render)
```

## Jotai vs Alternatives

| Aspect          | Jotai        | Zustand    | Redux Toolkit |
| --------------- | ------------ | ---------- | ------------- |
| **Bundle Size** | 3KB ✅       | 3KB ✅     | 12KB          |
| **Pattern**     | Atomic ✅    | Store      | Store         |
| **Re-renders**  | Minimal ✅   | Minimal ✅ | Good          |
| **DevTools**    | Basic        | Basic      | Excellent ✅  |
| **TypeScript**  | Excellent ✅ | Good       | Excellent ✅  |

## Alternatives

| Alternative       | When to Choose Instead                                    |
| ----------------- | --------------------------------------------------------- |
| **Zustand**       | Want more familiar store pattern (vs atomic)              |
| **Redux Toolkit** | Enterprise, need DevTools, time-travel debugging          |
| **Recoil**        | Similar atomic pattern (though Recoil development slowed) |

## References

- [Jotai Official Docs](https://jotai.org/)
- [Jotai vs Zustand vs Redux](https://index.dev/r/jotai-vs-zustand-vs-redux-2026)
- [Jotai v2 Release](https://jotai.org/docs/introduction)
