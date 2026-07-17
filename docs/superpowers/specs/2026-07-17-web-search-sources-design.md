# Web Search Sources Parsing & UI Listing Design

This document specifies the design and implementation details for parsing and rendering search sources returned by web search tools at the end of assistant messages.

## 1. Objectives
* Automatically extract web search results from agent tool execution blocks.
* Parse the raw JSON/text output of the search tool into a structured array of sources (Title, URL, Domain, and Snippet).
* Display the parsed sources as a list of interactive, clean cards at the bottom of the assistant message bubble.
* Allow users to tap on source cards to open the original webpages in their browser.

## 2. Parsing Architecture

### Source Extraction Logic
We will add a parsing utility function `extractSearchSources` to extract search results from parsed message segments:
1. Filters all `tool_call` segments in an assistant's message.
2. Identifies segments where the tool name suggests a search operation (e.g., `web_search`, `google_search`, `search`).
3. Selects the **last** search segment (representing the final search context used by the agent).
4. Combines the content of all child segments of this tool call.
5. Runs a robust parser on this content.

### Robust Content Parser
The parser `parseSearchContent(rawContent: string)` will handle:
* **JSON Array**: Directly parses lists like `[{"title": "...", "url": "..."}, ...]`.
* **JSON Object**: Detects nested arrays under common search response keys like `results`, `sources`, or `organic_results`.
* **Markdown Link Fallback**: Extracts links formatted as `[Title](URL)` using regex.
* **Raw URL Fallback**: Extracts standard `http(s)` URLs if no structured formatting is present, fallback-naming the title with the hostname.

```typescript
export interface SearchSource {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}
```

## 3. UI and Layout Specification

At the bottom of the assistant's chat bubble, when the message is completed or streaming is done (or dynamically updated), if sources are found:
* **Separator**: A subtle horizontal line or top-border separating the message body from the sources section.
* **Header**: A clean header with a `🌐 Sources Used` title.
* **Layout**: A flex row with wrap (`flexDirection: 'row', flexWrap: 'wrap', gap: 8`) displaying the cards.
* **Card Design**:
  * Left side: A clean domain favicon (using Google's favicon helper: `https://www.google.com/s2/favicons?sz=64&domain=...`) or a generic web icon (`🌐`).
  * Right side: Vertical text containing the page title (truncated to 1-2 lines) and the domain name (e.g., `wikipedia.org`) in a small, muted font.
  * Border/Background: Styled using theme accent colors with low opacity.
* **Interactivity**:
  * Tapping a card triggers `Linking.openURL(url)`.
  * Visual press states (opacity change on press).

## 4. Implementation Location

* **Parser Helper**: `client/utils/sourceParser.ts` (new file).
* **UI Integration**: `client/app/index.tsx` (inside the message rendering block).
* **Test Plan**: Create unit tests in `client/utils/__tests__/sourceParser.test.ts` to verify parsing of various JSON and Markdown search payloads.
