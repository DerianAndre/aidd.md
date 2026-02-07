---
name: Redux Toolkit (RTK)
category: pattern
last_updated: 2026-01-14
maturity: stable
---

# Redux Toolkit (RTK)

## Overview

Official Redux modernization with simplified API, built-in middleware, and Redux DevTools integration. Enterprise standard for predictable state management. Alternative to Zustand/Jotai for large-scale applications.

## Key Metrics

- **Bundle Size:** ~12KB (vs Redux core ~5KB + middleware)
- **DX:** Simplified Redux with `createSlice`, `createAsyncThunk`, Immer built-in
- **Tooling:** Redux DevTools (time-travel debugging)
- **Maturity:** 5+ years (Redux 10+ years), production-grade
- **Cost:** Free, open-source

## Use Cases

| Scenario                        | Fit Score (1-10) | Rationale                                               |
| ------------------------------- | ---------------- | ------------------------------------------------------- |
| Enterprise apps (complex state) | 10               | Predictable, debuggable, time-travel, team coordination |
| Need time-travel debugging      | 10               | Redux DevTools = inspect every action, state change     |
| Large teams (>10 engineers)     | 9                | Single source of truth, clear action contracts          |
| Simple apps (<5 components)     | 4                | Use Zustand (simpler API, smaller bundle)               |
| Performance-critical            | 7                | Fine-grained updates better with Jotai/Zustand          |

## Trade-offs

### Strengths

- **Predictable:** Single source of truth, unidirectional data flow
- **DevTools:** Time-travel debugging, action replay, state inspection
- **Middleware:** Built-in async (RTK Query), logger, persistence
- **Scalable:** Clear patterns for large teams

### Weaknesses

- **Boilerplate:** More setup vs Zustand (though RTK reduces vs vanilla Redux)
- **Learning Curve:** Slices, reducers, actions, selectors
- **Bundle Size:** 12KB (vs Zustand 3KB, Jotai 3KB)
- **Performance:** Global store = potential over-rendering (vs atomic state)

## Implementation Pattern

```bash
npm install @reduxjs/toolkit react-redux
```

```typescript
// store/userSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  current: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  current: null,
  loading: false,
  error: null,
};

export const fetchUser = createAsyncThunk(
  "user/fetchUser",
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logout: (state) => {
      state.current = null;
    },
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.current) {
        Object.assign(state.current, action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.current = action.payload;
        state.loading = false;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.error = action.error.message || "Failed to fetch user";
        state.loading = false;
      });
  },
});

export const { logout, updateProfile } = userSlice.actions;
export default userSlice.reducer;

// store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```typescript
// app/providers.tsx
"use client";
import { Provider } from "react-redux";
import { store } from "@/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

// components/UserProfile.tsx
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { fetchUser, logout } from "@/store/userSlice";

export function UserProfile({ userId }: { userId: string }) {
  const dispatch = useDispatch();
  const { current, loading } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    dispatch(fetchUser(userId));
  }, [userId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{current?.name}</h1>
      <button onClick={() => dispatch(logout())}>Logout</button>
    </div>
  );
}
```

## Redux Toolkit vs Alternatives

| Aspect             | RTK          | Zustand      | Jotai        |
| ------------------ | ------------ | ------------ | ------------ |
| **Bundle Size**    | 12KB         | 3KB ✅       | 3KB ✅       |
| **DevTools**       | Excellent ✅ | Basic        | Basic        |
| **Learning Curve** | High         | Low ✅       | Low ✅       |
| **Enterprise**     | Best ✅      | Good         | Good         |
| **Performance**    | Good         | Excellent ✅ | Excellent ✅ |

## Alternatives

| Alternative      | When to Choose Instead                                   |
| ---------------- | -------------------------------------------------------- |
| **Zustand**      | Simple state, smaller bundle, want minimal boilerplate   |
| **Jotai**        | Atomic state, fine-grained updates, performance-critical |
| **Server State** | Use TanStack Query/SWR for server data (not Redux)       |

## References

- [Redux Toolkit Official Docs](https://redux-toolkit.js.org/)
- [Redux vs Zustand vs Jotai](https://index.dev/r/redux-vs-zustand-vs-jotai-2026)
- [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/)
