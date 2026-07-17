/**
 * Automatically heals unclosed XML tags (like <thought>, <intent>, <call:...>, <skill:...>)
 * in a string by appending their matching closing tags in reverse order.
 */
export function healXmlTags(content: string): string {
  if (!content) return '';

  const TAG_REGEX = /<\/?(?:thought|intent|call:[a-zA-Z0-9_:]+|skill:[a-zA-Z0-9_:]+|call|skill)(?:\s+input\s*=\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'))?\s*>/gi;
  const stack: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = TAG_REGEX.exec(content)) !== null) {
    const tagText = match[0];
    const isClose = tagText.startsWith('</');

    // Extract name: remove <, >, and / then split by space to get the tag name
    const cleanText = tagText.replace(/[<\/>]/g, '').trim();
    const tagName = cleanText.split(/\s+/)[0];

    if (!isClose) {
      stack.push(tagName);
    } else {
      // Find the last index of a matching tag on the stack and remove it
      const matchIndex = findLastIndex(stack, (openTag) => {
        if (tagName === 'thought') return openTag === 'thought';
        if (tagName === 'intent') return openTag === 'intent';
        if (tagName === 'call' || tagName.startsWith('call:')) {
          return openTag === 'call' || openTag.startsWith('call:');
        }
        if (tagName === 'skill' || tagName.startsWith('skill:')) {
          return openTag === 'skill' || openTag.startsWith('skill:');
        }
        return false;
      });

      if (matchIndex !== -1) {
        stack.splice(matchIndex, 1);
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
      const name = openTag.split(':').slice(1).join(':');
      healedContent += `</call:${name}>`;
    } else if (openTag === 'call') {
      healedContent += '</call>';
    } else if (openTag.startsWith('skill:')) {
      const name = openTag.split(':').slice(1).join(':');
      healedContent += `</skill:${name}>`;
    } else if (openTag === 'skill') {
      healedContent += '</skill>';
    }
  }

  return healedContent;
}

function findLastIndex<T>(array: T[], predicate: (value: T) => boolean): number {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i])) {
      return i;
    }
  }
  return -1;
}
