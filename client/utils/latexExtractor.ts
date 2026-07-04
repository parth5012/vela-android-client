export interface ContentSegment {
  type: 'markdown' | 'latex-inline' | 'latex-block';
  content: string;
}

export function parseContent(text: string): ContentSegment[] {
  if (!text) return [];
  
  // Match block math $$...$$ and inline math $...$ (avoiding empty $)
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  const parts = text.split(regex);
  
  return parts.map(part => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return { type: 'latex-block' as const, content: part.slice(2, -2).trim() };
    } else if (part.startsWith('$') && part.endsWith('$')) {
      return { type: 'latex-inline' as const, content: part.slice(1, -1).trim() };
    }
    return { type: 'markdown' as const, content: part };
  }).filter(p => p.content.length > 0);
}
