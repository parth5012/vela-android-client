export interface MessageSegment {
  type: 'text' | 'thought' | 'tool_call' | 'intent' | 'skill';
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
    const nextIntentOpen = textRemaining.indexOf('<intent>');
    const nextIntentClose = textRemaining.indexOf('</intent>');
    const nextSkillOpen = textRemaining.indexOf('<skill:');
    const nextSkillClose = textRemaining.indexOf('</skill');

    const targets: {
      pos: number;
      type: 'thought_open' | 'thought_close' | 'call_open' | 'call_close' | 'intent_open' | 'intent_close' | 'skill_open' | 'skill_close';
    }[] = [];
    if (nextThoughtOpen !== -1) targets.push({ pos: nextThoughtOpen, type: 'thought_open' });
    if (nextThoughtClose !== -1) targets.push({ pos: nextThoughtClose, type: 'thought_close' });
    if (nextCallOpen !== -1) targets.push({ pos: nextCallOpen, type: 'call_open' });
    if (nextCallClose !== -1) targets.push({ pos: nextCallClose, type: 'call_close' });
    if (nextIntentOpen !== -1) targets.push({ pos: nextIntentOpen, type: 'intent_open' });
    if (nextIntentClose !== -1) targets.push({ pos: nextIntentClose, type: 'intent_close' });
    if (nextSkillOpen !== -1) targets.push({ pos: nextSkillOpen, type: 'skill_open' });
    if (nextSkillClose !== -1) targets.push({ pos: nextSkillClose, type: 'skill_close' });

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
    else if (nextTarget.type === 'intent_open') {
      index += 8;
      const newNode: MessageSegment = {
        type: 'intent',
        isClosed: false,
        children: [],
      };
      activeNode().children!.push(newNode);
      stack.push(newNode);
    } 
    else if (nextTarget.type === 'intent_close') {
      index += 9;
      if (stack.length > 1 && stack[stack.length - 1].type === 'intent') {
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
        
        let input: string | undefined = undefined;
        const inputMatch = callRemaining.match(/input=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/);
        if (inputMatch) {
          input = inputMatch[1] !== undefined ? inputMatch[1] : inputMatch[2];
        } else {
          const partialInputMatch = callRemaining.match(/input=["']((?:[^"\\]|\\.)*)$/);
          if (partialInputMatch) {
            input = partialInputMatch[1];
          }
        }

        const newNode: MessageSegment = {
          type: 'tool_call',
          name,
          isClosed: false,
          children: [],
        };
        if (input !== undefined) {
          newNode.input = input;
        }
        activeNode().children!.push(newNode);
        stack.push(newNode);
        break;
      }

      const toolName = openTagMatch[1];
      const inputVal = openTagMatch[2] !== undefined ? openTagMatch[2] : openTagMatch[3];
      const openTagLength = openTagMatch[0].length;

      index += openTagLength;

      const newNode: MessageSegment = {
        type: 'tool_call',
        name: toolName,
        isClosed: false,
        children: [],
      };
      if (inputVal !== undefined) {
        newNode.input = inputVal;
      }
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
    else if (nextTarget.type === 'skill_open') {
      const skillRemaining = content.slice(index);
      const openTagRegex = /^<skill:([a-zA-Z0-9_:]+)(?:\s+input=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'))?\s*>/;
      const openTagMatch = skillRemaining.match(openTagRegex);

      if (!openTagMatch) {
        const nameMatch = skillRemaining.match(/^<skill:([a-zA-Z0-9_:]*)/);
        const name = nameMatch && nameMatch[1] ? nameMatch[1] : 'Skill';
        
        let input: string | undefined = undefined;
        const inputMatch = skillRemaining.match(/input=(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/);
        if (inputMatch) {
          input = inputMatch[1] !== undefined ? inputMatch[1] : inputMatch[2];
        } else {
          const partialInputMatch = skillRemaining.match(/input=["']((?:[^"\\]|\\.)*)$/);
          if (partialInputMatch) {
            input = partialInputMatch[1];
          }
        }

        const newNode: MessageSegment = {
          type: 'skill',
          name,
          isClosed: false,
          children: [],
        };
        if (input !== undefined) {
          newNode.input = input;
        }
        activeNode().children!.push(newNode);
        stack.push(newNode);
        break;
      }

      const skillName = openTagMatch[1];
      const inputVal = openTagMatch[2] !== undefined ? openTagMatch[2] : openTagMatch[3];
      const openTagLength = openTagMatch[0].length;

      index += openTagLength;

      const newNode: MessageSegment = {
        type: 'skill',
        name: skillName,
        isClosed: false,
        children: [],
      };
      if (inputVal !== undefined) {
        newNode.input = inputVal;
      }
      activeNode().children!.push(newNode);
      stack.push(newNode);
    }
    else if (nextTarget.type === 'skill_close') {
      const closeRemaining = content.slice(index);
      const closeTagEndIdx = closeRemaining.indexOf('>');
      
      if (closeTagEndIdx === -1) {
        index = content.length;
      } else {
        index += closeTagEndIdx + 1;
        if (stack.length > 1 && stack[stack.length - 1].type === 'skill') {
          const popped = stack.pop()!;
          popped.isClosed = true;
        }
      }
    }
  }

  return root.children || [];
}
