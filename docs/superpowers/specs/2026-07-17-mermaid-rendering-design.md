# Mermaid Graph Visual Rendering Design Spec

This document specifies the design and implementation details for parsing and rendering fenced markdown code blocks of language `mermaid` as visual diagrams with toggles inside the Vela Client application.

## 1. Objectives
* Detect `mermaid` code blocks in assistant messages.
* Provide a dual-view tabbed card component:
  * **Diagram View**: Renders the graph visually in a WebView using the `mermaid.js` library via CDN.
  * **Source View**: Displays the raw, copyable text representation of the Mermaid definition.
* Dynamically adjust the container height of the diagram WebView to prevent truncation or excessive whitespace.
* Seamlessly fall back to standard code block rendering on Web targets where WebView is unavailable.

## 2. Component Design: `MermaidRenderer.tsx`

We will create a new component `client/components/chat/MermaidRenderer.tsx`.

### State Management
* `activeTab`: `'diagram' | 'source'` (defaults to `'diagram'`).
* `height`: number (defaults to 160).
* `renderError`: string | null (to display parsing or compilation errors inside the WebView).

### Layout
1. **Tabs Bar**:
   - Two pressable elements: `📊 Diagram` and `📝 Source`.
   - The active tab will have an underline of the theme's `accentHex` color and bold text.
   - Right-aligned "Copy" button when on the "Source" tab (reusing clipboard copy behavior).
2. **Diagram View Container**:
   - A `react-native-webview` rendering an HTML shell.
   - The HTML shell loads `https://cdn.jsdelivr.net/npm/mermaid@10.2.4/dist/mermaid.min.js`.
   - It initializes Mermaid in `dark` or `default` theme configurations matching the client theme.
   - It reports height changes via `window.ReactNativeWebView.postMessage`.
3. **Source View Container**:
   - Monospace, horizontally scrollable text matching standard code block layouts.

## 3. Markdown Integration: `RichText.tsx`

We will modify `client/components/chat/RichText.tsx`:
1. Import `MermaidRenderer` from `./MermaidRenderer`.
2. Inside `rules.fence`:
   - Inspect the node info (language tag): `const lang = (node.info || '').toLowerCase().trim();`.
   - If `lang === 'mermaid'`:
     - Render `<MermaidRenderer graph={codeText} theme={theme} fontSize={fontSize} accentColor={accentColor} />`.
   - Else:
     - Render the standard fenced code block view.

## 4. Verification & Testing

* Create unit tests in `client/__tests__/MermaidRenderer.test.tsx` to verify component rendering:
  * Check that `MermaidRenderer` compiles under Jest.
  * Check that it switches tabs on press.
  * Verify `RichText.tsx` integrates the Mermaid renderer correctly for fenced blocks with the `mermaid` language tag.
