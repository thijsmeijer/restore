# Dependency decisions

## Runtime foundation

| Dependency | Purpose | Why not local/platform-only code |
|---|---|---|
| Expo and React Native | Managed native application runtime and EAS-compatible build model | This is the accepted mobile architecture |
| Expo Router | File-based routes, tabs, typed routes, and future deep links | Accepted by ADR 0003 |
| React Navigation theme package | Navigation theming used by Expo Router | Transitive/standard Router integration |
| Expo Splash Screen, Status Bar, System UI, and Font | Native shell presentation and the required native peer for symbol rendering | Platform configuration requires Expo adapters |
| Expo Symbols | Native SF Symbol tab icons on the iPhone | Avoids shipping a second icon system for the shell |
| React Native Safe Area Context and Screens | Safe layout and native navigation primitives | Required by the Expo Router navigation stack |
| Gesture Handler, Reanimated, and Worklets | Expo Router/native-navigation peer foundation pinned to the SDK 57 template versions | Leaving these implicit allowed pnpm to select incompatible peer versions |
| Expo Dev Client | Native-capable development build | Expo Go cannot represent the eventual native dependency set |

No analytics, database, form, state-management, media, notification, HealthKit,
AI, or backend dependency is added in BOOT-001.

## Development dependencies

| Dependency | Purpose | Alternative considered |
|---|---|---|
| TypeScript and React types | Strict static checking | Plain JavaScript rejected by the architecture |
| ESLint with Expo config | Expo/React-aware static rules | A custom lint stack would duplicate maintained defaults |
| Prettier | Deterministic formatting check | Hand formatting is not reproducible |
| Jest and jest-expo | Expo-compatible unit/component runner | Native-only testing is too slow for the base feedback loop |
| React Native Testing Library | Accessibility-oriented component tests for React 19 | Deprecated react-test-renderer is unsupported for React 19 |

Licenses and exact transitive versions are captured in `pnpm-lock.yaml`. Native
runtime additions require a new binary and must be documented here.

## Known transitive advisory

`pnpm audit --prod` currently reports one moderate advisory for `uuid@7` through
Expo's build-time `@expo/config-plugins → xcode` toolchain. The affected package
is used for native project generation and is not bundled application runtime
logic. Do not force a major transitive override: review and remove this entry
when a compatible Expo/config-plugin update carries `uuid` 11.1.1 or newer.
