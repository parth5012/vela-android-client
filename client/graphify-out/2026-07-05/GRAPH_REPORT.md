# Graph Report - client  (2026-07-05)

## Corpus Check
- 17 files · ~4,749 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 119 nodes · 137 edges · 10 communities (9 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `03044d67`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_index.tsx|index.tsx]]
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_expo|expo]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_RichText.tsx|RichText.tsx]]
- [[_COMMUNITY_adaptiveIcon|adaptiveIcon]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_ios|ios]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_abc.js|abc.js]]

## God Nodes (most connected - your core abstractions)
1. `expo` - 13 edges
2. `useConfigStore` - 11 edges
3. `useChatStore` - 7 edges
4. `scripts` - 6 edges
5. `adaptiveIcon` - 5 edges
6. `ios` - 4 edges
7. `android` - 4 edges
8. `extra` - 3 edges
9. `ChatScreen()` - 3 edges
10. `SettingsScreen()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `RootLayout()` --calls--> `useConfigStore`  [EXTRACTED]
  app/_layout.tsx → store/useConfigStore.ts
- `SetupScreen()` --calls--> `useConfigStore`  [EXTRACTED]
  app/setup.tsx → store/useConfigStore.ts
- `ChatScreen()` --calls--> `useChatStore`  [EXTRACTED]
  app/index.tsx → store/useChatStore.ts
- `ChatScreen()` --calls--> `useConfigStore`  [EXTRACTED]
  app/index.tsx → store/useConfigStore.ts
- `SettingsScreen()` --calls--> `useChatStore`  [EXTRACTED]
  app/settings.tsx → store/useChatStore.ts

## Import Cycles
- None detected.

## Communities (10 total, 1 thin omitted)

### Community 0 - "index.tsx"
Cohesion: 0.13
Nodes (18): ChatScreen(), styles, RootLayout(), styles, SettingsScreen(), styles, SetupScreen(), styles (+10 more)

### Community 1 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, expo, expo-linking, expo-router, expo-secure-store, expo-status-bar, react, react-dom (+13 more)

### Community 2 - "expo"
Cohesion: 0.12
Nodes (15): projectId, expo, extra, icon, name, orientation, plugins, scheme (+7 more)

### Community 3 - "package.json"
Cohesion: 0.14
Nodes (13): jest, preset, transformIgnorePatterns, main, name, private, scripts, android (+5 more)

### Community 4 - "RichText.tsx"
Cohesion: 0.20
Nodes (8): LatexRendererProps, styles, markdownStyles, RichText(), RichTextProps, styles, ContentSegment, parseContent()

### Community 5 - "adaptiveIcon"
Cohesion: 0.25
Nodes (8): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, android

### Community 6 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, jest, jest-expo, @react-native/jest-preset, react-test-renderer, @types/jest, @types/react, typescript

### Community 7 - "ios"
Cohesion: 0.40
Nodes (5): ios, ITSAppUsesNonExemptEncryption, bundleIdentifier, infoPlist, supportsTablet

### Community 8 - "compilerOptions"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, types, extends

## Knowledge Gaps
- **77 isolated node(s):** `formattedUrl`, `name`, `slug`, `scheme`, `version` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `expo` connect `expo` to `adaptiveIcon`, `ios`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `formattedUrl`, `name`, `slug` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12698412698412698 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._