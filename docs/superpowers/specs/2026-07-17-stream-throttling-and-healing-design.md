# Stream Throttling and Tag Healing Design Spec

This document specifies the design and implementation details for preventing UI freezes and layout breakage when streaming responses, particularly when the application transitions between the background and foreground states.

## 1. Objectives
* Eliminate UI thread freezes (caused by rapid flushes of buffered network packets when returning from the background) by batching incoming stream tokens.
* Prevent chat bubble layout breaks (spilling text outside of containers caused by unclosed tags like `<thought>` or `<call>` when the stream is interrupted) by automatically healing unclosed XML tags.

## 2. Token Batching (Throttling) Architecture

To prevent backpressure on the React Native UI thread, we will replace direct, immediate state updates with a throttled flushing queue.

* **Pending Buffer**: A local string variable `pendingTokens` to accumulate incoming stream chunks.
* **Interval Timer**: A timer (`setInterval`) running every `120ms` that flushes any accumulated tokens to the Zustand store using the existing `appendToken` action.
* **Stream Completion / Interruption**: When the stream finishes (`onDone` or `onError`), the interval is cleared, and any remaining text in the buffer is flushed immediately to ensure no data is lost.

```typescript
let pendingTokens = '';
let throttleTimer: NodeJS.Timeout | null = null;

const onChunk = (chunk: string) => {
  pendingTokens += chunk;
  if (!throttleTimer) {
    throttleTimer = setInterval(() => {
      if (pendingTokens) {
        appendToken(activeThreadId, pendingTokens);
        pendingTokens = '';
      }
    }, 120);
  }
};

const cleanUpThrottle = () => {
  if (throttleTimer) {
    clearInterval(throttleTimer);
    throttleTimer = null;
  }
  if (pendingTokens) {
    appendToken(activeThreadId, pendingTokens);
    pendingTokens = '';
  }
};
```

## 3. XML Tag Healing Architecture

If the network connection gets terminated by the operating system while the app is in the background, tags like `<thought>`, `<intent>`, `<call>`, or `<skill>` might remain unclosed, breaking layout parsing.

We will create a helper utility `healXmlTags(content: string): string` in `client/utils/xmlHealer.ts`:
1. Use a stack to track open tags in the message string.
2. Scan the string from start to finish:
   - Push tags onto the stack on open tags (e.g., `<thought>`, `<intent>`, `<call:tool>`, `<skill:skill_name>`).
   - Pop matching tags on close tags (e.g., `</thought>`, `</intent>`, `</call>`, `</skill>`).
3. After scanning, if the stack is not empty (unclosed tags remain):
   - Pop each tag in reverse order and append its corresponding closing tag to the message content.

When streaming finishes (both in the success callback and the error callback), we will fetch the last message, heal its XML tags, and write it back to the store.

## 4. Implementation Location

* **XML Healer Utility**: `client/utils/xmlHealer.ts` (new file)
* **XML Healer Tests**: `client/__tests__/xmlHealer.test.ts` (new file)
* **Throttled Stream Integration**: `client/app/index.tsx` (inside `handleSend`, `handleSendWelcome`, and `handleRegenerate`).
