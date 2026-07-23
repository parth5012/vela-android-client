import { extractDomain, parseSearchContent, extractSearchSources } from '../utils/sourceParser';

describe('sourceParser utils', () => {
  describe('extractDomain', () => {
    it('should extract clean hostname from http/https url', () => {
      expect(extractDomain('https://www.google.com/search?q=test')).toBe('google.com');
      expect(extractDomain('http://example.org/path')).toBe('example.org');
      expect(extractDomain('https://sub.domain.co.uk/')).toBe('sub.domain.co.uk');
    });

    it('should strip www. prefix', () => {
      expect(extractDomain('https://www.wikipedia.org')).toBe('wikipedia.org');
    });

    it('should handle protocol-less inputs correctly', () => {
      expect(extractDomain('google.com/search')).toBe('google.com');
      expect(extractDomain('www.wikipedia.org/wiki/React')).toBe('wikipedia.org');
    });

    it('should fall back to "web" on invalid URLs', () => {
      expect(extractDomain('not-a-url')).toBe('web');
      expect(extractDomain('')).toBe('web');
    });
  });

  describe('parseSearchContent', () => {
    it('should parse JSON array of sources', () => {
      const json = JSON.stringify([
        { url: 'https://example.com/page1', title: 'Example Page 1', snippet: 'This is the first example snippet' },
        { link: 'https://www.wikipedia.org/wiki/React', name: 'React - Wikipedia', content: 'React is a library' }
      ]);
      const result = parseSearchContent(json);
      expect(result).toEqual([
        {
          title: 'Example Page 1',
          url: 'https://example.com/page1',
          domain: 'example.com',
          snippet: 'This is the first example snippet'
        },
        {
          title: 'React - Wikipedia',
          url: 'https://www.wikipedia.org/wiki/React',
          domain: 'wikipedia.org',
          snippet: 'React is a library'
        }
      ]);
    });

    it('should parse JSON object with organic or results array', () => {
      const json = JSON.stringify({
        organic_results: [
          { url: 'https://example.com/page2', title: 'Example 2' }
        ]
      });
      const result = parseSearchContent(json);
      expect(result).toEqual([
        {
          title: 'Example 2',
          url: 'https://example.com/page2',
          domain: 'example.com',
          snippet: undefined
        }
      ]);
    });

    it('should fall back to Markdown links if JSON parsing fails', () => {
      const content = 'Check out [Google](https://google.com) and also [Yahoo](https://www.yahoo.com/news).';
      const result = parseSearchContent(content);
      expect(result).toEqual([
        { title: 'Google', url: 'https://google.com', domain: 'google.com' },
        { title: 'Yahoo', url: 'https://www.yahoo.com/news', domain: 'yahoo.com' }
      ]);
    });

    it('should parse Markdown links containing URLs with parentheses correctly', () => {
      const content = 'Check out [React](https://en.wikipedia.org/wiki/React_(software)) for info.';
      const result = parseSearchContent(content);
      expect(result).toEqual([
        { title: 'React', url: 'https://en.wikipedia.org/wiki/React_(software)', domain: 'en.wikipedia.org' }
      ]);
    });

    it('should fall back to raw URLs if no markdown link exists and JSON fails', () => {
      const content = 'Check out https://google.com and http://example.com/test.';
      const result = parseSearchContent(content);
      expect(result).toEqual([
        { title: 'google.com', url: 'https://google.com', domain: 'google.com' },
        { title: 'example.com', url: 'http://example.com/test', domain: 'example.com' }
      ]);
    });

    it('should preserve matching trailing parenthesis but strip non-matching ones for raw URLs', () => {
      const content = 'Wikipedia: https://en.wikipedia.org/wiki/React_(software) and extra text (see https://example.com/page).';
      const result = parseSearchContent(content);
      expect(result).toEqual([
        { title: 'en.wikipedia.org', url: 'https://en.wikipedia.org/wiki/React_(software)', domain: 'en.wikipedia.org' },
        { title: 'example.com', url: 'https://example.com/page', domain: 'example.com' }
      ]);
    });

    it('should deduplicate sources correctly, maintaining case sensitivity for path/query', () => {
      const json = JSON.stringify([
        { url: 'https://example.com/Page', title: 'Page Upper' },
        { url: 'https://example.com/page', title: 'Page Lower' }, // path casing difference -> keep both
        { url: 'HTTPS://EXAMPLE.COM/Page', title: 'Page Upper duplicate' }, // scheme/host casing difference -> deduplicate
        { url: 'https://example.com/Page/', title: 'Page Upper slash' } // trailing slash difference -> deduplicate
      ]);
      const result = parseSearchContent(json);
      expect(result).toEqual([
        { url: 'https://example.com/Page', title: 'Page Upper', domain: 'example.com' },
        { url: 'https://example.com/page', title: 'Page Lower', domain: 'example.com' }
      ]);
    });
  });

  describe('extractSearchSources', () => {
    it('should return empty array if no search tool call is present', () => {
      const message = 'Hello world, this is a plain message.';
      expect(extractSearchSources(message)).toEqual([]);
    });

    it('should extract sources from the last search tool call in the message', () => {
      const message = `
Some intro text.
<call:default_api:web_search input="{\\"query\\":\\"react\\"}">
[
  {"url": "https://react.dev", "title": "React Documentation"}
]
</call:default_api:web_search>
Middle text.
<call:default_api:google_search input="{\\"query\\":\\"expo\\"}">
[
  {"url": "https://expo.dev", "title": "Expo Documentation"}
]
</call:default_api:google_search>
Closing text.
      `;
      const result = extractSearchSources(message);
      expect(result).toEqual([
        {
          title: 'Expo Documentation',
          url: 'https://expo.dev',
          domain: 'expo.dev',
          snippet: undefined
        }
      ]);
    });
  });
});
