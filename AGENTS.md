# Vela Client

Android AI assistant chat app. Single Expo project in `client/`. No monorepo.

## Structure

- `client/` — the entire Expo app (all code lives here)
- `docs/` — supplementary docs (gitignored)
- `client/graphify-out/` — knowledge graph of the codebase; query before reading files blindly

## Commands (run from `client/`)

```
npm start            # Expo dev server
npm test             # Jest (jest-expo preset)
npm run android      # expo run:android
npx tsc --noEmit     # typecheck (no script alias — run manually)
npx expo prebuild --clean  # regenerate native dirs
```

No lint or format scripts are configured.

## See also

- `client/AGENTS.md` for app-specific guidance
- `client/build guide.txt` for signing AAB → APK with bundletool

## Knowledge graph

`graphify-out/` contains a pre-built knowledge graph. Query it before reading files blindly:
- God nodes: `useConfigStore` (11 edges), `useChatStore` (7 edges)
- 4 screens, 8 communities, 117 nodes
- use the `graphify` cli to query the graph 
- Dont use Glob or grep to read files

## Agent skills

### Issue tracker

Issues and specs are tracked locally as Markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage states use standard role strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository layout using `CONTEXT.md` and `docs/adr/` at the root. See `docs/agents/domain.md`.

