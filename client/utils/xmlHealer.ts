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
