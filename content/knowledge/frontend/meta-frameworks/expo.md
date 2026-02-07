---
name: Expo (React Native)
category: frontend
last_updated: 2026-01-14
maturity: stable
---

# Expo (React Native)

## Overview

Managed workflow for React Native enabling iOS/Android development with JavaScript/TypeScript. Over-the-air updates, simplified native module integration, and unified toolchain.

## Key Metrics

- **Performance:** Near-native (Hermes engine, New Architecture)
- **DX:** Expo Go app for instant preview, EAS Build for CI/CD
- **Code Sharing:** 80-95% shared code between web and mobile
- **Maturity:** 8+ years, production-grade (used by companies like Microsoft, AWS)
- **Cost:** Free tier (EAS Build paid for teams)

## Use Cases

| Scenario                                  | Fit Score (1-10) | Rationale                                    |
| ----------------------------------------- | ---------------- | -------------------------------------------- |
| Cross-platform mobile apps                | 10               | Single codebase for iOS + Android            |
| Web + mobile code sharing                 | 9                | Monorepo with shared packages (@corp/ui)     |
| Rapid prototyping                         | 10               | Expo Go app = instant preview on phone       |
| Heavy native integrations (AR, Bluetooth) | 7                | Custom native modules require Config Plugins |
| Performance-critical (games)              | 5                | Better with native (Swift/Kotlin) or Unity   |

## Trade-offs

### Strengths

- **OTA Updates:** Push updates without App Store review (non-native code)
- **Development Builds:** Custom native modules without ejecting
- **EAS Build:** Cloud CI/CD for iOS/Android builds
- **Managed Workflow:** Simplified certificates, push notifications

### Weaknesses

- **Bundle Size:** Larger than native apps (~30MB baseline)
- **Performance:** Slight overhead vs pure native (mitigated in 2026)
- **Native Modules:** Some iOS/Android libraries require config plugins
- **Vendor:** Expo-specific features (though React Native underneath)

## Implementation Pattern (Monorepo)

```
apps/
├── mobile/          # Expo app
│   └── app.json
├── web/             # Next.js app
packages/
├── ui/              # Shared components (React Native Web)
├── db/              # Shared data layer
└── tsconfig/        # Shared TypeScript config
```

**Code Sharing:**

- UI components use React Native primitives (View, Text)
- React Native Web compiles to web (Next.js imports @corp/ui)
- ~80-95% code shared

## Alternatives

| Alternative               | When to Choose Instead                      |
| ------------------------- | ------------------------------------------- |
| **Native (Swift/Kotlin)** | Need max performance, heavy device APIs     |
| **Flutter**               | Prefer Dart, need pixel-perfect custom UI   |
| **Bare React Native**     | Don't want Expo abstractions (rare in 2026) |

## References

- [Why Expo is Gaining Popularity](https://www.bitcot.com/why-expodev-is-gaining-popularity-among-react-native-developers/)
- [Expo vs Bare React Native](https://www.reddit.com/r/reactnative/comments/1q57wxx/i_have_asked_my_senior_that_we_should_shift_from/)
- [Expo Official Docs](https://docs.expo.dev/)
