# Stream Throttling and Tag Healing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement stream token throttling (batching updates in a queue) to prevent UI thread freezing when the app returns from the background, and add XML tag healing to prevent response content from escaping UI borders.

**Architecture:** Create an `xmlHealer` utility that identifies and closes unclosed XML tags using a stack-based parser. Integrate this healer inside `RichText` rendering or when stream completion/error triggers. Implement a local buffering interval in `index.tsx` during streaming that aggregates incoming tokens and flushes them to the store at most once every 120ms.

**Tech Stack:** React Native, Jest.

---

### Task 1: Implement XML Tag Healing Utility

**Files:**
- Create: `client/utils/xmlHealer.ts`

- [ ] **Step 1: Write healer utility**
Create `client/utils/xmlHealer.ts` with a stack-based XML tag closing algorithm.

```typescript
/**
 * Automatically heals unclosed XML tags (like <thought>, <intent>, <call:...>, <skill:...>)
 * in a string by appending their matching closing tags in reverse order.
 */
export function healXmlTags(content: string): string {
  if (!content) return '';

  const stack: string[] = [];
  let index = 0;

  // Pattern matching open tags like <call:tool_name input="..."> or <skill:name>
  const callOpenRegex = /^<call:([a-zA-Z0-9_:]+)(?:\s+input=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'))?\s*>/;
  const skillOpenRegex = /^<skill:([a-zA-Z0-9_:]+)(?:\s+input=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'))?\s*>/;

  while (index < content.length) {
    const textRemaining = content.slice(index);

    const nextThoughtOpen = textRemaining.indexOf('<thought>');
    const nextThoughtClose = textRemaining.indexOf('</thought>');
    const nextIntentOpen = textRemaining.indexOf('<intent>');
    const nextIntentClose = textRemaining.indexOf('</intent>');
    
    const nextCallOpenIndex = textRemaining.indexOf('<call:');
    const nextCallClose = textRemaining.indexOf('</call');
    
    const nextSkillOpenIndex = textRemaining.indexOf('<skill:');
    const nextSkillClose = textRemaining.indexOf('</skill');

    const targets: { pos: number; type: string; len: number; data?: string }[] = [];

    if (nextThoughtOpen !== -1) targets.push({ pos: nextThoughtOpen, type: 'thought_open', len: 9 });
    if (nextThoughtClose !== -1) targets.push({ pos: nextThoughtClose, type: 'thought_close', len: 10 });
    if (nextIntentOpen !== -1) targets.push({ pos: nextIntentOpen, type: 'intent_open', len: 8 });
    if (nextIntentClose !== -1) targets.push({ pos: nextIntentClose, type: 'intent_close', len: 9 });

    if (nextCallOpenIndex !== -1) {
      const callMatch = textRemaining.slice(nextCallOpenIndex).match(callOpenRegex);
      if (callMatch) {
        targets.push({ pos: nextCallOpenIndex, type: 'call_open', len: callMatch[0].length, data: callMatch[1] });
      }
    }
    if (nextCallClose !== -1) {
      const closeTagEndIdx = textRemaining.slice(nextCallClose).indexOf('>');
      if (closeTagEndIdx !== -1) {
        targets.push({ pos: nextCallClose, type: 'call_close', len: closeTagEndIdx + 1 });
      }
    }

    if (nextSkillOpenIndex !== -1) {
      const skillMatch = textRemaining.slice(nextSkillOpenIndex).match(skillOpenRegex);
      if (skillMatch) {
        targets.push({ pos: nextSkillOpenIndex, type: 'skill_open', len: skillMatch[0].length, data: skillMatch[1] });
      }
    }
    if (nextSkillClose !== -1) {
      const closeTagEndIdx = textRemaining.slice(nextSkillClose).indexOf('>');
      if (closeTagEndIdx !== -1) {
        targets.push({ pos: nextSkillClose, type: 'skill_close', len: closeTagEndIdx + 1 });
      }
    }

    targets.sort((a, b) => a.pos - b.pos);

    if (targets.length === 0) {
      break;
    }

    const target = targets[0];
    index += target.pos + target.len;

    if (target.type === 'thought_open') {
      stack.push('thought');
    } else if (target.type === 'thought_close') {
      if (stack[stack.length - 1] === 'thought') {
        stack.pop();
      }
    } else if (target.type === 'intent_open') {
      stack.push('intent');
    } else if (target.type === 'intent_close') {
      if (stack[stack.length - 1] === 'intent') {
        stack.pop();
      }
    } else if (target.type === 'call_open') {
      stack.push(`call:${target.data || 'tool'}`);
    } else if (target.type === 'call_close') {
      if (stack.length > 0 && stack[stack.length - 1].startsWith('call:')) {
        stack.pop();
      }
    } else if (target.type === 'skill_open') {
      stack.push(`skill:${target.data || 'skill'}`);
    } else if (target.type === 'skill_close') {
      if (stack.length > 0 && stack[stack.length - 1].startsWith('skill:')) {
        stack.pop();
      }
    }
  }

  // Heal open tags by appending their closing tags in reverse order
  let healedContent = content;
  while (stack.length > 0) {
    const openTag = stack.pop()!;
    if (openTag === 'thought') {
      healedContent += '</thought>';
    } else if (openTag === 'intent') {
      healedContent += '</intent>';
    } else if (openTag.startsWith('call:')) {
      const name = openTag.split(':')[1];
      healedContent += `</call:${name}>`;
    } else if (openTag.startsWith('skill:')) {
      const name = openTag.split(':')[1];
      healedContent += `</skill:${name}>`;
    }
  }

  return healedContent;
}
```

- [ ] **Step 2: Commit utility creation**
```bash
git add client/utils/xmlHealer.ts
git commit -m "feat: implement XML tag healer utility"
```

---

### Task 2: Create Healer Unit Tests

**Files:**
- Create: `client/__tests__/xmlHealer.test.ts`

- [ ] **Step 1: Write unit tests**
Create Jest unit tests confirming that `healXmlTags` correctly handles all categories of tag states.

```typescript
import { healXmlTags } from '../utils/xmlHealer';

describe('xmlHealer', () => {
  it('should return empty string if content is empty', () => {
    expect(healXmlTags('')).toBe('');
  });

  it('should not modify content with fully closed tags', () => {
    const text = 'Hello <thought>thinking</thought> World <call:search input="foo">results</call:search>!';
    expect(healXmlTags(text)).toBe(text);
  });

  it('should heal unclosed thought blocks', () => {
    expect(healXmlTags('<thought>Currently thinking')).toBe('<thought>Currently thinking</thought>');
  });

  it('should heal unclosed nested tool call and thought blocks in reverse order', () => {
    const text = '<thought>Let me look that up. <call:web_search input="react">Result';
    const expected = '<thought>Let me look that up. <call:web_search input="react">Result</call:web_search></thought>';
    expect(healXmlTags(text)).toBe(expected);
  });

  it('should heal unclosed skill blocks', () => {
    const text = 'Running skill: <skill:lint_code input="test.ts">Output';
    const expected = 'Running skill: <skill:lint_code input="test.ts">Output</skill:lint_code>';
    expect(healXmlTags(text)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run tests and verify they pass**
Run tests:
Command: `npm run test -- __tests__/xmlHealer.test.ts`
Expected: 5 tests passed

- [ ] **Step 3: Commit tests**
```bash
git add client/__tests__/xmlHealer.test.ts
git commit -m "test: add xmlHealer unit tests"
```

---

### Task 3: Integrate Token Throttling and Tag Healing in index.tsx

**Files:**
- Modify: `client/app/index.tsx`

- [ ] **Step 1: Modify imports and state bindings**
Import `healXmlTags` from `../utils/xmlHealer` and destructure `setHistory` from `useChatStore`.
Lines to update (around line 32):
```diff
 import { parseMessage } from '../utils/messageParser';
 import { parseSearchContent, SearchSource } from '../utils/sourceParser';
+import { healXmlTags } from '../utils/xmlHealer';
```

Lines to update (around line 125):
```diff
     truncateThreadHistory,
     branchThread,
     setThreadPersona,
+    setHistory,
   } = useChatStore();
```

- [ ] **Step 2: Implement throttling and tag-healing logic**
Create helper logic in `HomeScreen` to buffer and flush tokens, and heal unclosed tags.

Define a throttle reference structure right inside `ChatScreen` (around line 143):
```typescript
  const pendingTokensRef = React.useRef('');
  const throttleTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const cleanUpThrottleAndHeal = useCallback((threadId: string) => {
    if (throttleTimerRef.current) {
      clearInterval(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    
    // Flush any leftover tokens
    if (pendingTokensRef.current) {
      appendToken(threadId, pendingTokensRef.current);
      pendingTokensRef.current = '';
    }

    // Heal XML tags for the last assistant message
    const threadMsgs = useChatStore.getState().messages[threadId] || [];
    if (threadMsgs.length > 0) {
      const last = threadMsgs[threadMsgs.length - 1];
      if (last.role === 'assistant') {
        const healed = healXmlTags(last.content);
        if (healed !== last.content) {
          const updatedHistory = [...threadMsgs.slice(0, -1), { ...last, content: healed }];
          setHistory(threadId, updatedHistory);
        }
      }
    }
  }, [appendToken, setHistory]);
```

- [ ] **Step 3: Update `streamAgentResponse` loops inside `index.tsx`**
Update the token streaming callbacks in `handleRegenerate`, `handleSend`, and `handleSendWelcome`.

For `handleRegenerate` (around line 290):
```typescript
    // Call SSE API again
    await streamAgentResponse(
      apiUrl,
      apiKey,
      activeThreadId,
      userPrompt,
      (chunk) => {
        pendingTokensRef.current += chunk;
        if (!throttleTimerRef.current) {
          throttleTimerRef.current = setInterval(() => {
            if (pendingTokensRef.current) {
              appendToken(activeThreadId, pendingTokensRef.current);
              pendingTokensRef.current = '';
            }
          }, 120);
        }
      },
      (newTitle) => {
        setStreaming(false);
        cleanUpThrottleAndHeal(activeThreadId);
        if (newTitle) {
          const updatedThreads = threads.map((t) =>
            t.id === activeThreadId ? { ...t, title: newTitle } : t
          );
          setThreads(updatedThreads);
        }
      },
      (error) => {
        setStreaming(false);
        const errMsg = error?.message || (typeof error === 'string' ? error : '') || 'Failed to stream response.';
        pendingTokensRef.current += `\n\n⚠️ **Stream interrupted:** ${errMsg}`;
        cleanUpThrottleAndHeal(activeThreadId);
      }
    );
```

For `handleSend` (around line 665):
```typescript
    // 3. Connect to backend stream
    await streamAgentResponse(
      apiUrl,
      apiKey,
      activeThreadId,
      userText,
      (chunk) => {
        pendingTokensRef.current += chunk;
        if (!throttleTimerRef.current) {
          throttleTimerRef.current = setInterval(() => {
            if (pendingTokensRef.current) {
              appendToken(activeThreadId, pendingTokensRef.current);
              pendingTokensRef.current = '';
            }
          }, 120);
        }
      },
      (newTitle) => {
        setStreaming(false);
        cleanUpThrottleAndHeal(activeThreadId);
        if (newTitle) {
          // Update thread title
          const updatedThreads = threads.map((t) =>
            t.id === activeThreadId ? { ...t, title: newTitle } : t
          );
          setThreads(updatedThreads);
        }
      },
      (error) => {
        setStreaming(false);
        const errMsg = error?.message || (typeof error === 'string' ? error : '') || 'Failed to stream response.';
        pendingTokensRef.current += `\n\n⚠️ **Stream interrupted:** ${errMsg}`;
        cleanUpThrottleAndHeal(activeThreadId);
      },
      undefined,
      selectedPersona
    );
```

For `handleSendWelcome` (around line 728):
```typescript
    // 4. Stream response
    await streamAgentResponse(
      apiUrl,
      apiKey,
      newThreadId,
      textToSend.trim(),
      (chunk) => {
        pendingTokensRef.current += chunk;
        if (!throttleTimerRef.current) {
          throttleTimerRef.current = setInterval(() => {
            if (pendingTokensRef.current) {
              appendToken(newThreadId, pendingTokensRef.current);
              pendingTokensRef.current = '';
            }
          }, 120);
        }
      },
      (newTitle) => {
        setStreaming(false);
        cleanUpThrottleAndHeal(newThreadId);
        if (newTitle) {
          useChatStore.getState().renameThread(newThreadId, newTitle);
        }
      },
      (error) => {
        setStreaming(false);
        const errMsg = error?.message || (typeof error === 'string' ? error : '') || 'Failed to stream response.';
        pendingTokensRef.current += `\n\n⚠️ **Stream interrupted:** ${errMsg}`;
        cleanUpThrottleAndHeal(newThreadId);
      },
      undefined,
      persona
    );
```

- [ ] **Step 4: Clean up useEffect timers**
Make sure to clean up the interval on unmount in `index.tsx`:
```typescript
  React.useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearInterval(throttleTimerRef.current);
      }
    };
  }, []);
```

- [ ] **Step 5: Run tests and verify they pass**
Command: `npm run test`
Expected: All 76 tests pass

- [ ] **Step 6: Commit changes**
```bash
git add client/app/index.tsx
git commit -m "feat: implement throttled token updates and XML tag healing on stream finish"
```
