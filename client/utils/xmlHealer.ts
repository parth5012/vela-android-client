function findLastIndex<T>(array: T[], predicate: (value: T) => boolean): number {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * Automatically heals unclosed XML tags (like <thought>, <intent>, <call:...>, <skill:...>)
 * in a string by appending their matching closing tags in reverse order.
 * It builds the string dynamically, auto-closing any nested unclosed tags to prevent crossed-tag nesting violations.
 */
export function healXmlTags(content: string): string {
  if (!content) return '';

  const stack: string[] = [];
  let healed = '';
  let lastIndex = 0;

  // Capture group matches standard tags strictly in lowercase
  const TAG_REGEX = /<\/?(thought|intent|call:[a-zA-Z0-9_:]+|skill:[a-zA-Z0-9_:]+|call|skill)(?:\s+input\s*=\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'))?\s*>/g;

  let match: RegExpExecArray | null;
  TAG_REGEX.lastIndex = 0;
  while ((match = TAG_REGEX.exec(content)) !== null) {
    const matchIndex = match.index;
    const fullTag = match[0];
    const tagName = match[1];
    const isCloseTag = fullTag.startsWith('</');

    // Append content slice since last match
    healed += content.slice(lastIndex, matchIndex);
    lastIndex = matchIndex + fullTag.length;

    if (!isCloseTag) {
      // Open tag
      stack.push(tagName);
      healed += fullTag;
    } else {
      // Close tag - find matching open tag in stack
      let lastOpenIdx = -1;
      if (tagName === 'call' || tagName === 'skill') {
        // Generic close tag closes last open call/skill tag or its named variation
        lastOpenIdx = findLastIndex(stack, s => s === tagName || s.startsWith(tagName + ':'));
      } else {
        lastOpenIdx = stack.lastIndexOf(tagName);
      }

      if (lastOpenIdx !== -1) {
        // Close any unclosed nested tags on top of this tag first to maintain strict XML nesting
        while (stack.length > lastOpenIdx + 1) {
          const nestedTag = stack.pop()!;
          healed += `</${nestedTag}>`;
        }
        // Pop the matching tag itself
        stack.pop();
        healed += fullTag;
      } else {
        // Unmatched closing tag, keep it as text
        healed += fullTag;
      }
    }
  }

  // Append remainder of content
  healed += content.slice(lastIndex);

  // Close any remaining unclosed tags on the stack
  while (stack.length > 0) {
    healed += `</${stack.pop()!}>`;
  }

  return healed;
}
