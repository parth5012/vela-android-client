export interface MessageSegment {
  type: 'text' | 'thought' | 'tool_call';
  content: string;
  name?: string;
  input?: string;
  isClosed: boolean;
}

export function parseMessage(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let index = 0;

  while (index < content.length) {
    const textRemaining = content.slice(index);

    // Look for opening thought or call tag
    const nextThought = textRemaining.indexOf('<thought>');
    const nextCall = textRemaining.indexOf('<call:');

    let firstTagIndex = -1;
    let isThoughtTag = false;

    if (nextThought !== -1 && nextCall !== -1) {
      if (nextThought < nextCall) {
        firstTagIndex = nextThought;
        isThoughtTag = true;
      } else {
        firstTagIndex = nextCall;
        isThoughtTag = false;
      }
    } else if (nextThought !== -1) {
      firstTagIndex = nextThought;
      isThoughtTag = true;
    } else if (nextCall !== -1) {
      firstTagIndex = nextCall;
      isThoughtTag = false;
    }

    if (firstTagIndex === -1) {
      // No more tags, append the rest as text
      const text = textRemaining;
      if (text) {
        segments.push({
          type: 'text',
          content: text,
          isClosed: true,
        });
      }
      break;
    }

    // Add any preceding text as a segment
    if (firstTagIndex > 0) {
      const text = textRemaining.slice(0, firstTagIndex);
      segments.push({
        type: 'text',
        content: text,
        isClosed: true,
      });
    }

    index += firstTagIndex;

    if (isThoughtTag) {
      // Skip opening tag <thought>
      index += 9;
      const thoughtRemaining = content.slice(index);
      const closeIdx = thoughtRemaining.indexOf('</thought>');

      if (closeIdx === -1) {
        // Unclosed thought
        segments.push({
          type: 'thought',
          content: thoughtRemaining,
          isClosed: false,
        });
        break;
      } else {
        // Closed thought
        segments.push({
          type: 'thought',
          content: thoughtRemaining.slice(0, closeIdx),
          isClosed: true,
        });
        index += closeIdx + 10; // skip </thought>
      }
    } else {
      // Tool call tag. Format: <call:name input="...">
      const callRemaining = content.slice(index);
      
      // Match the full opening tag
      const openTagRegex = /^<call:([a-zA-Z0-9_:]+)(?:\s+input=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'))?\s*>/;
      const openTagMatch = callRemaining.match(openTagRegex);

      if (!openTagMatch) {
        // Opening tag is incomplete/streaming
        const nameMatch = callRemaining.match(/^<call:([a-zA-Z0-9_:]*)/);
        const name = nameMatch && nameMatch[1] ? nameMatch[1] : 'Tool';
        
        let input = '';
        const inputMatch = callRemaining.match(/input=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/);
        if (inputMatch) {
          input = inputMatch[1] || inputMatch[2] || '';
        } else {
          const partialInputMatch = callRemaining.match(/input=["']((?:[^"\\]|\\.)*)$/);
          if (partialInputMatch) {
            input = partialInputMatch[1];
          }
        }

        segments.push({
          type: 'tool_call',
          name,
          input,
          content: '',
          isClosed: false,
        });
        break;
      }

      // Opening tag is complete
      const toolName = openTagMatch[1];
      const inputVal = openTagMatch[2] || openTagMatch[3] || '';
      const openTagLength = openTagMatch[0].length;

      index += openTagLength; // Move past the opening tag

      // Now look for closing tag: </call:toolName> or </call>
      const bodyRemaining = content.slice(index);
      const closeTagIdx = bodyRemaining.indexOf('</call');

      if (closeTagIdx === -1) {
        // Unclosed tool call
        segments.push({
          type: 'tool_call',
          name: toolName,
          input: inputVal,
          content: bodyRemaining,
          isClosed: false,
        });
        break;
      } else {
        // Find ending '>' of the closing tag
        const closingTagRemaining = bodyRemaining.slice(closeTagIdx);
        const closeTagEndIdx = closingTagRemaining.indexOf('>');
        
        const toolCallContent = bodyRemaining.slice(0, closeTagIdx);
        
        segments.push({
          type: 'tool_call',
          name: toolName,
          input: inputVal,
          content: toolCallContent,
          isClosed: true,
        });

        if (closeTagEndIdx === -1) {
          // Closing tag is truncated/incomplete, e.g. "</call"
          break;
        } else {
          index += closeTagIdx + closeTagEndIdx + 1;
        }
      }
    }
  }

  return segments;
}
