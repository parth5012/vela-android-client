export interface MessageSegment {
  type: 'text' | 'thought' | 'tool_call';
  content?: string;
  name?: string;
  input?: string;
  isClosed: boolean;
  children?: MessageSegment[];
}

export function parseMessage(content: string): MessageSegment[] {
  const root: MessageSegment = {
    type: 'text',
    isClosed: true,
    children: [],
  };

  const stack: MessageSegment[] = [root];
  let index = 0;

  const activeNode = () => stack[stack.length - 1];

  const addText = (text: string) => {
    if (!text) return;
    const current = activeNode();
    if (!current.children) {
      current.children = [];
    }
    const lastChild = current.children[current.children.length - 1];
    if (lastChild && lastChild.type === 'text') {
      lastChild.content += text;
    } else {
      current.children.push({
        type: 'text',
        content: text,
        isClosed: true,
      });
    }
  };

  while (index < content.length) {
    const textRemaining = content.slice(index);

    const nextThoughtOpen = textRemaining.indexOf('<thought>');
    const nextThoughtClose = textRemaining.indexOf('</thought>');
    const nextCallOpen = textRemaining.indexOf('<call:');
    const nextCallClose = textRemaining.indexOf('</call');

    const targets: { pos: number; type: 'thought_open' | 'thought_close' | 'call_open' | 'call_close' }[] = [];
    if (nextThoughtOpen !== -1) targets.push({ pos: nextThoughtOpen, type: 'thought_open' });
    if (nextThoughtClose !== -1) targets.push({ pos: nextThoughtClose, type: 'thought_close' });
    if (nextCallOpen !== -1) targets.push({ pos: nextCallOpen, type: 'call_open' });
    if (nextCallClose !== -1) targets.push({ pos: nextCallClose, type: 'call_close' });

    targets.sort((a, b) => a.pos - b.pos);

    if (targets.length === 0) {
      addText(textRemaining);
      break;
    }

    const nextTarget = targets[0];

    if (nextTarget.pos > 0) {
      addText(textRemaining.slice(0, nextTarget.pos));
    }

    index += nextTarget.pos;

    if (nextTarget.type === 'thought_open') {
      index += 9;
      const newNode: MessageSegment = {
        type: 'thought',
        isClosed: false,
        children: [],
      };
      activeNode().children!.push(newNode);
      stack.push(newNode);
    } 
    else if (nextTarget.type === 'thought_close') {
      index += 10;
      if (stack.length > 1 && stack[stack.length - 1].type === 'thought') {
        const popped = stack.pop()!;
        popped.isClosed = true;
      }
    } 
    else if (nextTarget.type === 'call_open') {
      const callRemaining = content.slice(index);
      const openTagRegex = /^<call:([a-zA-Z0-9_:]+)(?:\s+input=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'))?\s*>/;
      const openTagMatch = callRemaining.match(openTagRegex);

      if (!openTagMatch) {
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

        const newNode: MessageSegment = {
          type: 'tool_call',
          name,
          input,
          isClosed: false,
          children: [],
        };
        activeNode().children!.push(newNode);
        stack.push(newNode);
        break;
      }

      const toolName = openTagMatch[1];
      const inputVal = openTagMatch[2] || openTagMatch[3] || '';
      const openTagLength = openTagMatch[0].length;

      index += openTagLength;

      const newNode: MessageSegment = {
        type: 'tool_call',
        name: toolName,
        input: inputVal,
        isClosed: false,
        children: [],
      };
      activeNode().children!.push(newNode);
      stack.push(newNode);
    } 
    else if (nextTarget.type === 'call_close') {
      const closeRemaining = content.slice(index);
      const closeTagEndIdx = closeRemaining.indexOf('>');
      
      if (closeTagEndIdx === -1) {
        index = content.length;
      } else {
        index += closeTagEndIdx + 1;
        if (stack.length > 1 && stack[stack.length - 1].type === 'tool_call') {
          const popped = stack.pop()!;
          popped.isClosed = true;
        }
      }
    }
  }

  return root.children || [];
}
