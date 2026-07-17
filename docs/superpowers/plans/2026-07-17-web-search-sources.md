# Web Search Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse web search tool results and render them as a beautiful, interactive card list at the bottom of assistant message bubbles.

**Architecture:** Create a client-side parser utility (`sourceParser.ts`) that extracts raw search content from the last search tool call in the message and parses it (JSON with Regex fallback). Then, render a custom, styled horizontal wrap listing of clickable cards in the message rendering block of `index.tsx`.

**Tech Stack:** React Native, Expo, Jest (for unit testing), Zustands store.

---

### Task 1: Create the Source Parser Utility

**Files:**
- Create: `client/utils/sourceParser.ts`

- [ ] **Step 1: Write the parser implementation**
Create the file `client/utils/sourceParser.ts` with robust JSON and Regex fallback parsing logic.

```typescript
import { parseMessage, MessageSegment } from './messageParser';

export interface SearchSource {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}

/**
 * Extracts and cleans the domain/hostname from a full URL.
 */
export function extractDomain(url: string): string {
  try {
    const match = url.match(/https?:\/\/([^\/\s]+)/i);
    if (match && match[1]) {
      let hostname = match[1].toLowerCase();
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      return hostname;
    }
  } catch (e) {
    // Ignore
  }
  return 'web';
}

/**
 * Parses search result content from JSON or text.
 */
export function parseSearchContent(rawContent: string): SearchSource[] {
  const sources: SearchSource[] = [];
  const cleaned = rawContent.trim();
  if (!cleaned) return sources;

  // 1. Try parsing as JSON
  try {
    const parsed = JSON.parse(cleaned);
    let items: any[] = [];

    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === 'object') {
      // Look for common search result array keys
      const potentialKeys = ['results', 'sources', 'organic_results', 'organic', 'matches'];
      for (const key of potentialKeys) {
        if (Array.isArray(parsed[key])) {
          items = parsed[key];
          break;
        }
      }
    }

    for (const item of items) {
      if (item && typeof item === 'object') {
        const url = item.url || item.link;
        if (typeof url === 'string' && url.trim()) {
          const title = typeof item.title === 'string' ? item.title.trim() : (typeof item.name === 'string' ? item.name.trim() : '');
          const snippet = typeof item.snippet === 'string' ? item.snippet.trim() : (typeof item.content === 'string' ? item.content.trim() : undefined);
          const domain = extractDomain(url);
          sources.push({
            title: title || domain,
            url: url.trim(),
            domain,
            snippet,
          });
        }
      }
    }

    if (sources.length > 0) {
      return deduplicateSources(sources);
    }
  } catch (e) {
    // Fail-safe to Regex fallbacks
  }

  // 2. Regex fallback for Markdown links: [Title](URL)
  const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  while ((match = markdownRegex.exec(cleaned)) !== null) {
    const title = match[1].trim();
    const url = match[2].trim();
    const domain = extractDomain(url);
    sources.push({
      title: title || domain,
      url,
      domain,
    });
  }

  // 3. Regex fallback for raw URLs
  if (sources.length === 0) {
    const urlRegex = /(https?:\/\/[^\/\s]+[^\s]*)/g;
    const rawUrls = cleaned.match(urlRegex);
    if (rawUrls) {
      for (const url of rawUrls) {
        const cleanUrl = url.trim().replace(/[.,);]$/, ''); // strip trailing punctuation
        const domain = extractDomain(cleanUrl);
        sources.push({
          title: domain,
          url: cleanUrl,
          domain,
        });
      }
    }
  }

  return deduplicateSources(sources);
}

/**
 * Deduplicates sources list by URL.
 */
function deduplicateSources(sources: SearchSource[]): SearchSource[] {
  const seen = new Set<string>();
  return sources.filter(s => {
    const normalizedUrl = s.url.toLowerCase().replace(/\/+$/, '');
    if (seen.has(normalizedUrl)) {
      return false;
    }
    seen.add(normalizedUrl);
    return true;
  });
}

/**
 * Extracts search sources from the last search tool call segment in the message.
 */
export function extractSearchSources(messageContent: string): SearchSource[] {
  if (!messageContent) return [];
  
  const segments = parseMessage(messageContent);
  // Find all search tool calls
  const searchSegments = segments.filter(s => 
    s.type === 'tool_call' && 
    s.name && 
    (s.name.toLowerCase().includes('search') || s.name.toLowerCase().includes('google'))
  );

  if (searchSegments.length === 0) {
    return [];
  }

  // Get the last search segment
  const lastSearchSegment = searchSegments[searchSegments.length - 1];
  if (!lastSearchSegment.children || lastSearchSegment.children.length === 0) {
    return [];
  }

  const rawContent = lastSearchSegment.children.map(c => c.content || '').join('');
  return parseSearchContent(rawContent);
}
```

- [ ] **Step 2: Commit utility creation**
```bash
git add client/utils/sourceParser.ts
git commit -m "feat: implement web search source parser utility"
```

---

### Task 2: Create Parser Unit Tests

**Files:**
- Create: `client/__tests__/sourceParser.test.ts`

- [ ] **Step 1: Write tests**
Create unit tests to test various JSON structures, markdown link parsing, raw URL extraction, and deduplication behavior.

```typescript
import { parseSearchContent, extractSearchSources } from '../utils/sourceParser';
import { parseMessage } from '../utils/messageParser';

describe('sourceParser', () => {
  describe('parseSearchContent', () => {
    it('should parse search results from a valid JSON array', () => {
      const rawJson = JSON.stringify([
        { title: 'Google', url: 'https://google.com', snippet: 'Search engine' },
        { title: 'GitHub', url: 'https://github.com/trending', snippet: 'Git hosting' }
      ]);
      const result = parseSearchContent(rawJson);
      expect(result).toEqual([
        { title: 'Google', url: 'https://google.com', domain: 'google.com', snippet: 'Search engine' },
        { title: 'GitHub', url: 'https://github.com/trending', domain: 'github.com', snippet: 'Git hosting' }
      ]);
    });

    it('should parse search results from nested organic_results object', () => {
      const rawJson = JSON.stringify({
        organic_results: [
          { title: 'Wikipedia', link: 'https://en.wikipedia.org/wiki/React' }
        ]
      });
      const result = parseSearchContent(rawJson);
      expect(result).toEqual([
        { title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/React', domain: 'wikipedia.org', snippet: undefined }
      ]);
    });

    it('should fall back to markdown link parsing if JSON parsing fails', () => {
      const text = 'Here are some links:\n* [Expo Documentation](https://docs.expo.dev/versions/latest)\n* [React Native](https://reactnative.dev)';
      const result = parseSearchContent(text);
      expect(result).toEqual([
        { title: 'Expo Documentation', url: 'https://docs.expo.dev/versions/latest', domain: 'docs.expo.dev' },
        { title: 'React Native', url: 'https://reactnative.dev', domain: 'reactnative.dev' }
      ]);
    });

    it('should extract raw URLs as fallback if no markdown or JSON format exists', () => {
      const text = 'Check out https://google.com/search and http://example.org for details.';
      const result = parseSearchContent(text);
      expect(result).toEqual([
        { title: 'google.com', url: 'https://google.com/search', domain: 'google.com' },
        { title: 'example.org', url: 'http://example.org', domain: 'example.org' }
      ]);
    });

    it('should deduplicate sources by normalized URL', () => {
      const rawJson = JSON.stringify([
        { title: 'Google', url: 'https://google.com' },
        { title: 'Google Search', url: 'https://google.com/' }
      ]);
      const result = parseSearchContent(rawJson);
      expect(result).toHaveLength(1);
    });
  });

  describe('extractSearchSources', () => {
    it('should extract search results from a message with search tool calls', () => {
      const messageContent = 'Let me look that up.\n<call:web_search input="react native">\n[{"title":"RN","url":"https://reactnative.dev"}]\n</call:web_search>\nI found it.';
      const result = extractSearchSources(messageContent);
      expect(result).toEqual([
        { title: 'RN', url: 'https://reactnative.dev', domain: 'reactnative.dev', snippet: undefined }
      ]);
    });

    it('should return empty array if no search tool calls exist', () => {
      const messageContent = 'Hello, how can I help you?';
      const result = extractSearchSources(messageContent);
      expect(result).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run tests and verify they pass**
Run the tests using Jest from the `client/` workspace:
Command: `npm run test -- __tests__/sourceParser.test.ts`
Expected: 5 tests passed

- [ ] **Step 3: Commit tests**
```bash
git add client/__tests__/sourceParser.test.ts
git commit -m "test: add source parser unit tests"
```

---

### Task 3: Integrate Sources List in App Chat UI

**Files:**
- Modify: `client/app/index.tsx`

- [ ] **Step 1: Modify imports in index.tsx**
Add `Image` and `Linking` to the React Native imports list, and import `extractSearchSources` and `SearchSource`.
Lines to update:
```diff
 import {
   View,
   Text,
   StyleSheet,
   FlatList,
   TextInput,
   Pressable,
   KeyboardAvoidingView,
   Platform,
   ActivityIndicator,
   Keyboard,
   Share,
   Alert,
   ScrollView,
   Animated,
+  Image,
+  Linking,
 } from 'react-native';
...
 import { parseMessage } from '../utils/messageParser';
+import { extractSearchSources, SearchSource } from '../utils/sourceParser';
```

- [ ] **Step 2: Define SourceCard component and styles in index.tsx**
Create the `SourceCard` sub-component and render layout helper functions, and append the stylesheets to `styles` in `client/app/index.tsx`.

Add this component right before `export default function HomeScreen()` (around line 190):
```typescript
function SourceCard({ src, colors, sizes, accentHex }: { src: SearchSource; colors: any; sizes: any; accentHex: string }) {
  const [imgError, setImgError] = React.useState(false);

  const handlePress = async () => {
    try {
      await Linking.openURL(src.url);
    } catch (error) {
      Alert.alert('Error', 'Could not open link in browser.');
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.sourceCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      onPress={handlePress}
    >
      {!imgError ? (
        <Image
          source={{ uri: `https://www.google.com/s2/favicons?sz=64&domain=${src.domain}` }}
          style={styles.sourceFavicon}
          onError={() => setImgError(true)}
        />
      ) : (
        <Text style={[styles.sourceIconEmoji, { fontSize: sizes.sub }]}>🌐</Text>
      )}
      <View style={styles.sourceTextContainer}>
        <Text numberOfLines={1} style={[styles.sourceTitle, { color: colors.text, fontSize: sizes.sub - 1 }]}>
          {src.title}
        </Text>
        <Text numberOfLines={1} style={[styles.sourceDomain, { color: colors.textDark, fontSize: sizes.sub - 3 }]}>
          {src.domain}
        </Text>
      </View>
    </Pressable>
  );
}
```

Add these styles in `StyleSheet.create` (at the bottom of `client/app/index.tsx`):
```typescript
  sourceDivider: {
    borderTopWidth: 1,
    marginTop: 10,
    marginBottom: 8,
    width: '100%',
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sourcesHeaderTitle: {
    fontWeight: 'bold',
  },
  sourcesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: '100%',
    flexGrow: 0,
    flexShrink: 1,
  },
  sourceFavicon: {
    width: 14,
    height: 14,
    marginRight: 6,
    borderRadius: 2,
  },
  sourceIconEmoji: {
    marginRight: 6,
  },
  sourceTextContainer: {
    flexDirection: 'column',
    maxWidth: 160,
  },
  sourceTitle: {
    fontWeight: '500',
  },
  sourceDomain: {
    marginTop: 1,
  },
```

- [ ] **Step 3: Render Sources Used in message list**
In `renderItem` of `client/app/index.tsx`, extract the sources for the assistant message and render them if available.
Locate the render section for the assistant message's main bubble content (around line 475):
```diff
             ) : (
               <View style={{ gap: 4, width: '100%' }}>
                 {bubbleContent.map((segment, idx) => {
                   const node = renderSegment(segment, idx);
                   const isLast = idx === bubbleContent.length - 1;
                   if (segment.type === 'skill' && !isLast) {
                     return (
                       <View key={idx} style={{ width: '100%' }}>
                         {node}
                         <View style={{ height: sizes.text }} />
                       </View>
                     );
                   }
                   return node;
                 })}
+                {(() => {
+                  const sources = extractSearchSources(item.content);
+                  if (sources.length > 0) {
+                    return (
+                      <View style={{ width: '100%' }}>
+                        <View style={[styles.sourceDivider, { borderTopColor: colors.border }]} />
+                        <View style={styles.sourcesHeader}>
+                          <Text style={[styles.sourcesHeaderTitle, { color: colors.text, fontSize: sizes.sub - 1 }]}>
+                            🌐 Sources Used
+                          </Text>
+                        </View>
+                        <View style={styles.sourcesContainer}>
+                          {sources.map((src, srcIdx) => (
+                            <SourceCard
+                              key={srcIdx}
+                              src={src}
+                              colors={colors}
+                              sizes={sizes}
+                              accentHex={accentHex}
+                            />
+                          ))}
+                        </View>
+                      </View>
+                    );
+                  }
+                  return null;
+                })()}
               </View>
             )}
```

- [ ] **Step 4: Run full app tests to verify no syntax/import breakages**
Run Jest test suite to check that the codebase remains healthy:
Command: `npm run test`
Expected: All tests pass

- [ ] **Step 5: Commit UI integration**
```bash
git add client/app/index.tsx
git commit -m "feat: integrate web search sources list in assistant message bubble UI"
```
