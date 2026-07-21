# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Stack

- Expo SDK 57, React 19, React Native 0.86, TypeScript ~6.0
- Expo Router (file-based routing in `app/`)
- Zustand for state (`store/useChatStore.ts`, `store/useConfigStore.ts`)
- SSE streaming for agent responses (`utils/sse.ts`)
- No ESLint/Prettier configured

## App architecture

```
app/_layout.tsx     → root layout, drawer nav, loads config
app/index.tsx       → main chat screen (inline input, no separate component)
app/settings.tsx    → settings screen
app/setup.tsx       → initial API setup screen
```

- `components/chat/` — RichText, CollapsibleBlock, LatexRenderer, MermaidRenderer
- `components/ui/` — DrawerContent, modals, HealthIndicator
- `utils/` — message parsing, XML healing, theme constants, source parsing
- API config (url, key) stored in `expo-secure-store` via `useConfigStore`

## Commands (run from `client/`)

```
npm start                   # Expo dev server
npm test                    # Jest (jest-expo preset)
npm run android             # expo run:android
npx tsc --noEmit            # typecheck (no script alias)
npx expo prebuild --clean   # regenerate native dirs after config changes
```

## Gotchas

- `editable` prop (not `editable={true}`) is the bare JSX boolean — don't add `={true}`
- `react-native-fetch-api` is used for SSE streaming on native (textStreaming support)
- `expo-file-system` uses the `/legacy` import: `import * as FileSystem from 'expo-file-system/legacy'`
- `.npmrc` has `legacy-peer-deps=true` — required for install
- `app.config.js` is dynamic: `APP_VARIANT` env var switches between prod/dev bundle IDs
- `__tests__/` is gitignored — tests exist locally but are not committed
- Pre-existing TS error: `NodeJS.Timeout` type in `index.tsx` (RN global type mismatch) — ignore it
- The `credentials.json`, `temp.keystore`, and `credentials/` dir in client are signing artifacts — never commit secrets

## Build & Release

- EAS Build configured in `eas.json` with `development`, `preview`, `production` profiles
- Production builds output APK (not AAB) with auto-incrementing version
- See `build guide.txt` for manual AAB → APK signing with bundletool

## Knowledge graph

## Agent skills

### Issue tracker

Issues and specs are tracked locally as Markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage states use standard role strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository layout using `CONTEXT.md` and `docs/adr/` at the root. See `docs/agents/domain.md`.

`graphify-out/` contains a pre-built knowledge graph. Query it before reading files blindly:
- God nodes: `useConfigStore` (11 edges), `useChatStore` (7 edges)
- 4 screens, 8 communities, 117 nodes
