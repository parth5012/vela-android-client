import { parseContent } from '../utils/latexExtractor';

describe('latexExtractor', () => {
  it('should split math equations from standard markdown text', () => {
    const text = 'Here is inline $x^2 + y^2 = z^2$ and a block: \n$$\\int x dx = \\frac{x^2}{2}$$';
    const segments = parseContent(text);
    
    expect(segments.length).toBe(4);
    expect(segments[0]).toEqual({ type: 'markdown', content: 'Here is inline ' });
    expect(segments[1]).toEqual({ type: 'latex-inline', content: 'x^2 + y^2 = z^2' });
    expect(segments[2]).toEqual({ type: 'markdown', content: ' and a block: \n' });
    expect(segments[3]).toEqual({ type: 'latex-block', content: '\\int x dx = \\frac{x^2}{2}' });
  });

  it('should return empty array for empty or falsy text', () => {
    expect(parseContent('')).toEqual([]);
  });

  it('should handle text with no latex equations', () => {
    const text = 'This is just markdown text without any math.';
    const segments = parseContent(text);
    expect(segments.length).toBe(1);
    expect(segments[0]).toEqual({ type: 'markdown', content: text });
  });

  it('should handle text with only block equations', () => {
    const text = '$$\\sigma = \\sqrt{\\frac{1}{N}\\sum_{i=1}^N (x_i - \\mu)^2}$$';
    const segments = parseContent(text);
    expect(segments.length).toBe(1);
    expect(segments[0]).toEqual({
      type: 'latex-block',
      content: '\\sigma = \\sqrt{\\frac{1}{N}\\sum_{i=1}^N (x_i - \\mu)^2}',
    });
  });

  it('should handle text with only inline equations', () => {
    const text = '$E = mc^2$';
    const segments = parseContent(text);
    expect(segments.length).toBe(1);
    expect(segments[0]).toEqual({ type: 'latex-inline', content: 'E = mc^2' });
  });

  it('should not parse currency values as LaTeX inline formulas', () => {
    const text = 'I have $10 and my friend has $20';
    const segments = parseContent(text);
    expect(segments.length).toBe(1);
    expect(segments[0]).toEqual({ type: 'markdown', content: text });
  });
});
