import { parseMessage, MessageSegment } from './messageParser';

export interface SearchSource {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}

/**
 * Extracts and cleans the domain/hostname from a full URL.
 */
export function extractDomain(url: string): string {
  try {
    const match = url.match(/https?:\/\/([^\/\s]+)/i);
    if (match && match[1]) {
      let hostname = match[1].toLowerCase();
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      return hostname;
    }
  } catch (e) {
    // Ignore
  }
  return 'web';
}

/**
 * Parses search result content from JSON or text.
 */
export function parseSearchContent(rawContent: string): SearchSource[] {
  const sources: SearchSource[] = [];
  const cleaned = rawContent.trim();
  if (!cleaned) return sources;

  // 1. Try parsing as JSON
  try {
    const parsed = JSON.parse(cleaned);
    let items: any[] = [];

    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === 'object') {
      // Look for common search result array keys
      const potentialKeys = ['results', 'sources', 'organic_results', 'organic', 'matches'];
      for (const key of potentialKeys) {
        if (Array.isArray(parsed[key])) {
          items = parsed[key];
          break;
        }
      }
    }

    for (const item of items) {
      if (item && typeof item === 'object') {
        const url = item.url || item.link;
        if (typeof url === 'string' && url.trim()) {
          const title = typeof item.title === 'string' ? item.title.trim() : (typeof item.name === 'string' ? item.name.trim() : '');
          const snippet = typeof item.snippet === 'string' ? item.snippet.trim() : (typeof item.content === 'string' ? item.content.trim() : undefined);
          const domain = extractDomain(url);
          sources.push({
            title: title || domain,
            url: url.trim(),
            domain,
            snippet,
          });
        }
      }
    }

    if (sources.length > 0) {
      return deduplicateSources(sources);
    }
  } catch (e) {
    // Fail-safe to Regex fallbacks
  }

  // 2. Regex fallback for Markdown links: [Title](URL)
  const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  while ((match = markdownRegex.exec(cleaned)) !== null) {
    const title = match[1].trim();
    const url = match[2].trim();
    const domain = extractDomain(url);
    sources.push({
      title: title || domain,
      url,
      domain,
    });
  }

  // 3. Regex fallback for raw URLs
  if (sources.length === 0) {
    const urlRegex = /(https?:\/\/[^\/\s]+[^\s]*)/g;
    const rawUrls = cleaned.match(urlRegex);
    if (rawUrls) {
      for (const url of rawUrls) {
        const cleanUrl = url.trim().replace(/[.,);]$/, ''); // strip trailing punctuation
        const domain = extractDomain(cleanUrl);
        sources.push({
          title: domain,
          url: cleanUrl,
          domain,
        });
      }
    }
  }

  return deduplicateSources(sources);
}

/**
 * Deduplicates sources list by URL.
 */
function deduplicateSources(sources: SearchSource[]): SearchSource[] {
  const seen = new Set<string>();
  return sources.filter(s => {
    const normalizedUrl = s.url.toLowerCase().replace(/\/+$/, '');
    if (seen.has(normalizedUrl)) {
      return false;
    }
    seen.add(normalizedUrl);
    return true;
  });
}

/**
 * Extracts search sources from the last search tool call segment in the message.
 */
export function extractSearchSources(messageContent: string): SearchSource[] {
  if (!messageContent) return [];
  
  const segments = parseMessage(messageContent);
  // Find all search tool calls
  const searchSegments = segments.filter(s => 
    s.type === 'tool_call' && 
    s.name && 
    (s.name.toLowerCase().includes('search') || s.name.toLowerCase().includes('google'))
  );

  if (searchSegments.length === 0) {
    return [];
  }

  // Get the last search segment
  const lastSearchSegment = searchSegments[searchSegments.length - 1];
  if (!lastSearchSegment.children || lastSearchSegment.children.length === 0) {
    return [];
  }

  const rawContent = lastSearchSegment.children.map(c => c.content || '').join('');
  return parseSearchContent(rawContent);
}
