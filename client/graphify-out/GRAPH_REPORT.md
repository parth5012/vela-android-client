# Graph Report - client  (2026-07-05)

## Corpus Check
- 16 files · ~4,625 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 117 nodes · 136 edges · 8 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e63c5dfa`
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
- [[_COMMUNITY_compilerOptions|compilerOptions]]

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

## Communities (8 total, 0 thin omitted)

### Community 0 - "index.tsx"
Cohesion: 0.13
Nodes (18): ChatScreen(), styles, RootLayout(), styles, SettingsScreen(), styles, SetupScreen(), styles (+10 more)

### Community 1 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, expo, expo-linking, expo-router, expo-secure-store, expo-status-bar, react, react-dom (+13 more)

### Community 2 - "expo"
Cohesion: 0.10
Nodes (20): projectId, expo, extra, icon, ios, name, orientation, plugins (+12 more)

### Community 3 - "package.json"
Cohesion: 0.12
Nodes (15): devDependencies, jest, jest-expo, @react-native/jest-preset, react-test-renderer, @types/jest, @types/react, typescript (+7 more)

### Community 4 - "RichText.tsx"
Cohesion: 0.20
Nodes (8): LatexRendererProps, styles, markdownStyles, RichText(), RichTextProps, styles, ContentSegment, parseContent()

### Community 5 - "adaptiveIcon"
Cohesion: 0.25
Nodes (8): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, android

### Community 6 - "devDependencies"
Cohesion: 0.33
Nodes (6): scripts, android, ios, start, test, web

### Community 8 - "compilerOptions"
Cohesion: 0.40
Nodes (4): compilerOptions, strict, types, extends

## Knowledge Gaps
- **76 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+71 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `expo` connect `expo` to `adaptiveIcon`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `scheme` to the rest of the system?**
  _76 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12698412698412698 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._