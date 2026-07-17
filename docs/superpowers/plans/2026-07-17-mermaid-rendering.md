# Mermaid Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate visual Mermaid rendering inside fenced code blocks using a tabbed interface (Diagram/Source) and a WebView.

**Architecture:** Create a `MermaidRenderer` component that loads Mermaid.js from a CDN inside a `WebView` for iOS/Android, and auto-adjusts height. Tapping tabs switches between the visual diagram and raw text code block. Integrate this component inside `RichText.tsx` markdown fenced code blocks when the language is set to `mermaid`.

**Tech Stack:** React Native, Expo, React Native WebView, Jest.

---

### Task 1: Create the MermaidRenderer Component

**Files:**
- Create: `client/components/chat/MermaidRenderer.tsx`

- [ ] **Step 1: Write component code**
Create `client/components/chat/MermaidRenderer.tsx` with WebView container, tab switching, and height postMessage handling.

```typescript
import React, { useState } from 'react';
import { View, StyleSheet, Platform, Text, Pressable, ScrollView, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import { THEME_COLORS, FONT_SIZES, ACCENT_COLORS } from '../../utils/theme';

interface MermaidRendererProps {
  graph: string;
  theme?: 'deep' | 'slate' | 'cyberpunk' | 'nordic' | 'dracula' | 'oled';
  fontSize?: 'small' | 'medium' | 'large';
  accentColor?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' | 'pink' | 'orange' | 'blue';
}

export default function MermaidRenderer({
  graph,
  theme = 'deep',
  fontSize = 'medium',
  accentColor = 'indigo',
}: MermaidRendererProps) {
  const [activeTab, setActiveTab] = useState<'diagram' | 'source'>('diagram');
  const [height, setHeight] = useState(180);
  const [hasError, setHasError] = useState(false);

  const colors = THEME_COLORS[theme] || THEME_COLORS.deep;
  const sizes = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const accentHex = ACCENT_COLORS[accentColor] || ACCENT_COLORS.indigo;

  // Fallback for Web targets where WebView is unavailable
  if (Platform.OS === 'web') {
    return renderSourceView();
  }

  function renderSourceView() {
    return (
      <View style={[styles.codeBlockWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
          <Text style={[styles.codeText, { color: colors.text, fontSize: sizes.text - 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
            {graph.replace(/\n$/, '')}
          </Text>
        </ScrollView>
      </View>
    );
  }

  const isDark = theme !== 'slate'; // Slate is the only light-like theme
  const mermaidTheme = isDark ? 'dark' : 'default';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://cdn.jsdelivr.net/npm/mermaid@10.2.4/dist/mermaid.min.js"></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: transparent;
          color: ${colors.text};
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #diagram {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 12px;
          min-height: 50px;
        }
        /* Style adjustments for dark theme SVGs */
        svg {
          max-width: 100% !important;
          height: auto !important;
        }
        .error-msg {
          color: #ef4444;
          font-size: 13px;
          font-family: monospace;
          padding: 8px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.05);
          border-radius: 6px;
        }
      </style>
    </head>
    <body>
      <div id="diagram">Rendering...</div>
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          const container = document.getElementById('diagram');
          try {
            mermaid.initialize({
              startOnLoad: false,
              theme: '${mermaidTheme}',
              securityLevel: 'loose',
              logLevel: 4,
            });

            const uniqueId = 'mermaid-svg-' + Date.now();
            const rawGraph = ${JSON.stringify(graph)};

            mermaid.render(uniqueId, rawGraph).then(({ svg }) => {
              container.innerHTML = svg;
              sendHeight();
              // Polling for sizing layout updates
              setTimeout(sendHeight, 100);
              setTimeout(sendHeight, 300);
              setTimeout(sendHeight, 600);
            }).catch((err) => {
              showError(err.message || err);
            });
          } catch (err) {
            showError(err.message || err);
          }

          function showError(msg) {
            container.innerHTML = '<div class="error-msg">Mermaid Compile Error: ' + msg + '</div>';
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ error: true }));
            }
            sendHeight();
          }

          function sendHeight() {
            const height = document.documentElement.scrollHeight || document.body.scrollHeight;
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ height: height }));
            }
          }
        });
      </script>
    </body>
    </html>
  `;

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(graph);
    Alert.alert('Copied', 'Mermaid code copied to clipboard.');
  };

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {/* Tab Headers */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === 'diagram' && { borderBottomColor: accentHex }]}
            onPress={() => setActiveTab('diagram')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'diagram' ? colors.text : colors.textDark, fontSize: sizes.sub, fontWeight: activeTab === 'diagram' ? 'bold' : 'normal' }]}>
              📊 Diagram
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'source' && { borderBottomColor: accentHex }]}
            onPress={() => setActiveTab('source')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'source' ? colors.text : colors.textDark, fontSize: sizes.sub, fontWeight: activeTab === 'source' ? 'bold' : 'normal' }]}>
              📝 Source
            </Text>
          </Pressable>
        </View>

        {activeTab === 'source' && (
          <Pressable style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.7 }]} onPress={copyToClipboard}>
            <Text style={{ color: colors.textMuted, fontSize: sizes.sub - 1, fontWeight: 'bold' }}>Copy</Text>
          </Pressable>
        )}
      </View>

      {/* Render Active View */}
      {activeTab === 'diagram' ? (
        <View style={[styles.webviewContainer, { height: height }]}>
          <WebView
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            style={styles.webview}
            scrollEnabled={false}
            overScrollMode="never"
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.height) {
                  setHeight(Math.max(data.height, 80));
                }
                if (data.error) {
                  setHasError(true);
                }
              } catch (e) {
                // Ignore
              }
            }}
          />
        </View>
      ) : (
        renderSourceView()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 8,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    height: 38,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 16,
    height: '100%',
  },
  tabButton: {
    justifyContent: 'center',
    height: '100%',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingHorizontal: 4,
  },
  tabText: {
    textAlign: 'center',
  },
  copyBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  webviewContainer: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  webview: {
    backgroundColor: 'transparent',
  },
  codeBlockWrapper: {
    borderWidth: 0,
    padding: 12,
    alignSelf: 'stretch',
  },
  codeText: {
    lineHeight: 18,
  },
});
```

- [ ] **Step 2: Commit file creation**
```bash
git add client/components/chat/MermaidRenderer.tsx
git commit -m "feat: create MermaidRenderer tabbed visual component"
```

---

### Task 2: Integrate MermaidRenderer inside RichText

**Files:**
- Modify: `client/components/chat/RichText.tsx`

- [ ] **Step 1: Modify code implementation**
Import `MermaidRenderer` and update the `rules.fence` logic inside `client/components/chat/RichText.tsx`.

Add import (around line 7):
```diff
 import LatexRenderer from './LatexRenderer';
 import { THEME_COLORS, FONT_SIZES, ACCENT_COLORS } from '../../utils/theme';
+import MermaidRenderer from './MermaidRenderer';
```

Modify the `rules.fence` block (around line 28):
```diff
     fence: (node: any) => {
       const codeText = node.content || '';
       const lang = node.info || '';
+
+      if (lang.toLowerCase().trim() === 'mermaid') {
+        return (
+          <MermaidRenderer
+            key={node.key}
+            graph={codeText}
+            theme={theme}
+            fontSize={fontSize}
+            accentColor={accentColor}
+          />
+        );
+      }
+
       return (
         <View key={node.key} style={[styles.codeBlockWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
```

- [ ] **Step 2: Commit integration**
```bash
git add client/components/chat/RichText.tsx
git commit -m "feat: integrate MermaidRenderer for markdown mermaid code blocks"
```

---

### Task 3: Create Unit Tests for Mermaid Rendering

**Files:**
- Create: `client/__tests__/MermaidRenderer.test.tsx`

- [ ] **Step 1: Write unit tests**
Create Jest tests confirming `MermaidRenderer` renders without crashing, toggles tabs correctly, and that `RichText` successfully triggers it.

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MermaidRenderer from '../components/chat/MermaidRenderer';
import RichText from '../components/chat/RichText';

// Mock WebView since it is a native dependency not supported in standard Jest node environment
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props: any) => <View testID="mock-webview" {...props} />,
  };
});

describe('MermaidRenderer', () => {
  const sampleGraph = 'graph TD\nA-->B';

  it('should render the diagram tab by default', () => {
    const { getByText, getByTestId, queryByText } = render(
      <MermaidRenderer graph={sampleGraph} />
    );

    expect(getByText('📊 Diagram')).toBeTruthy();
    expect(getByText('📝 Source')).toBeTruthy();
    expect(getByTestId('mock-webview')).toBeTruthy();
  });

  it('should switch to source view when clicking the Source tab', () => {
    const { getByText, queryByTestId } = render(
      <MermaidRenderer graph={sampleGraph} />
    );

    const sourceTab = getByText('📝 Source');
    fireEvent.press(sourceTab);

    // WebView should be hidden and source text displayed
    expect(queryByTestId('mock-webview')).toBeNull();
    expect(getByText(sampleGraph)).toBeTruthy();
    expect(getByText('Copy')).toBeTruthy();
  });
});

describe('RichText Mermaid Integration', () => {
  it('should render MermaidRenderer for mermaid fenced blocks', () => {
    const markdownContent = '```mermaid\ngraph TD\nA-->B\n```';
    const { getByText, getByTestId } = render(
      <RichText content={markdownContent} />
    );

    // It should render diagram tab (which belongs to MermaidRenderer)
    expect(getByText('📊 Diagram')).toBeTruthy();
    expect(getByTestId('mock-webview')).toBeTruthy();
  });

  it('should render standard code block for non-mermaid fenced blocks', () => {
    const markdownContent = '```javascript\nconsole.log("hello");\n```';
    const { getByText, queryByTestId } = render(
      <RichText content={markdownContent} />
    );

    expect(getByText('JAVASCRIPT')).toBeTruthy();
    expect(getByText('Copy')).toBeTruthy();
    expect(queryByTestId('mock-webview')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests and verify they pass**
Run Jest:
Command: `npm run test -- __tests__/MermaidRenderer.test.tsx`
Expected: 4 tests passed

- [ ] **Step 3: Run all project tests**
Command: `npm run test`
Expected: All 71 tests pass

- [ ] **Step 4: Commit tests**
```bash
git add client/__tests__/MermaidRenderer.test.tsx
git commit -m "test: add MermaidRenderer and RichText integration tests"
```
