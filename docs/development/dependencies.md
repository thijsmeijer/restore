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
| Expo SQLite | Durable, transactional, offline device storage required by ADR 0002 and DB-001 | React Native has no platform SQLite API; key/value or file storage cannot provide the required relational constraints, migrations, transactions, and recovery behavior |
| React Native SVG | Interactive, scalable front/back body-map geometry required by MAP-001 | Nested React Native views do not provide stable vector paths or scale cleanly across iPhone sizes and Dynamic Type settings |
| Zod | Versioned runtime validation for content, imports, and future durable JSON snapshots | TypeScript types disappear at runtime; handwritten validators would duplicate the wire contract and make path-specific failures harder to keep complete |

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
| Node 24 type definitions | Strictly type the Node 24 real-SQL migration test adapter | Untyped imports or disabling test type-checking would weaken the repository contract; a second SQLite package would duplicate the platform capability |
| tsx | Execute the same strict TypeScript content validator locally and in CI | Duplicating schemas in JavaScript risks drift; Node type stripping is not consistently available across the repository minimum Node versions |

Licenses and exact transitive versions are captured in `pnpm-lock.yaml`. Native
runtime additions require a new binary and must be documented here.

### DB-001 persistence decision

`expo-sqlite` is pinned to the Expo SDK-compatible `~57.0.2` release. It stores
data only in Restore's local application container, adds no network behavior,
analytics, account, permission, or entitlement, and contributes the native
SQLite adapter already maintained for Expo. Its native code increases the
binary and requires rebuilding the development client.

Restore owns a small typed migration layer instead of adding Drizzle ORM in
DB-001. The first migration contains lifecycle tables only, so an ORM and its
schema-generation tool would add maintenance, build-time, bundle, and licensing
surface without yet improving a domain repository. Direct `expo-sqlite` access
is confined to the database adapter; application code uses repository
interfaces. Drizzle remains a valid later replacement if the domain schema
makes generated queries materially useful. Removal requires replacing the
adapter while preserving the on-device database, migration checksums, repository
contracts, and released-schema fixtures; it must never reset owner data.

### MAP-001 body-map decision

`react-native-svg@15.15.4` is pinned to the Expo SDK-compatible release and is
MIT licensed. It renders the simplified front/back silhouette locally, adds no
network behavior, analytics, storage, permission, or entitlement, and replaces
the brittle alternative of composing anatomical geometry from nested native
views. The body map keeps native `Pressable` controls over the SVG so VoiceOver
and 44-point touch targets do not depend on SVG-element accessibility support.
The native module increases the application binary and requires a new compatible
development/preview build; the hand-authored geometry adds only a small amount
of JavaScript bundle data. Removal requires replacing scalable map rendering
while preserving canonical region/side mapping, visible selection state, touch
targets, and the complete list-based accessible route.

### CONTENT-001 validation decision

`zod@4.5.4` is pinned as an MIT-licensed runtime dependency. It performs local,
deterministic validation and adds no native code, network behavior, storage,
analytics, permission, or entitlement. Schemas are shared by CI and the future
on-device import/content pipeline, so invalid data cannot pass a weaker CLI-only
check. The published package is approximately 5.8 MB unpacked, but CONTENT-001
does not import it from an application route, so the current iOS bundle does not
include it. Future on-device validation will add the reachable, tree-shaken
schema code. `tsx@4.23.12` is a development-only MIT-licensed runner of roughly
0.5 MB unpacked plus its build-time transform dependency; it is not included in
the iOS bundle. Removing either dependency requires a replacement that preserves
the versioned wire schemas, strict unknown-field behavior, stable issue codes
and paths, and identical local/on-device validation.

## Known transitive advisory

`pnpm audit --prod` currently reports one moderate advisory for `uuid@7` through
Expo's build-time `@expo/config-plugins → xcode` toolchain. The affected package
is used for native project generation and is not bundled application runtime
logic. Do not force a major transitive override: review and remove this entry
when a compatible Expo/config-plugin update carries `uuid` 11.1.1 or newer.
