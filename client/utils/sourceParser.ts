import { parseMessage, MessageSegment } from './messageParser';

export interface SearchSource {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}

// Module-level regex declarations for performance and cleanup
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s()]+(?:\([^\s()]+\)[^\s()]*)*)\)/g;
const RAW_URL_REGEX = /(https?:\/\/[^\/\s]+[^\s]*)/g;

/**
 * Extracts and cleans the domain/hostname from a full URL.
 */
export function extractDomain(url: string): string {
  if (!url) return 'web';
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch (e) {
    try {
      // Fallback for protocol-less URLs
      const match = url.match(/^(?:https?:\/\/)?([^/:\s]+)/i);
      if (match && match[1]) {
        let hostname = match[1].toLowerCase();
        // If it doesn't contain a dot and is not 'localhost', it's probably not a valid domain/hostname
        if (!hostname.includes('.') && hostname !== 'localhost') {
          return 'web';
        }
        if (hostname.startsWith('www.')) {
          hostname = hostname.substring(4);
        }
        return hostname;
      }
    } catch (err) {
      // Ignore
    }
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
  MARKDOWN_LINK_REGEX.lastIndex = 0;
  let match;
  while ((match = MARKDOWN_LINK_REGEX.exec(cleaned)) !== null) {
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
    const rawUrls = cleaned.match(RAW_URL_REGEX);
    if (rawUrls) {
      for (const url of rawUrls) {
        let cleanUrl = url.trim();
        // Strip trailing punctuation but preserve parenthesis if matched
        while (cleanUrl.length > 0) {
          const lastChar = cleanUrl[cleanUrl.length - 1];
          if (lastChar === '.' || lastChar === ',' || lastChar === ';' || lastChar === '!') {
            cleanUrl = cleanUrl.slice(0, -1);
          } else if (lastChar === ')') {
            const openCount = (cleanUrl.match(/\(/g) || []).length;
            const closeCount = (cleanUrl.match(/\)/g) || []).length;
            if (closeCount > openCount) {
              cleanUrl = cleanUrl.slice(0, -1);
            } else {
              break;
            }
          } else {
            break;
          }
        }

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
 * Deduplicates sources list by URL. Normalizes only the scheme and hostname to lowercase,
 * while preserving the case-sensitivity of the path and search parameters.
 */
function deduplicateSources(sources: SearchSource[]): SearchSource[] {
  const seen = new Set<string>();
  return sources.filter(s => {
    let normalizedUrl = s.url.replace(/\/+$/, '');
    try {
      const urlObj = new URL(s.url);
      const cleanPath = urlObj.pathname.replace(/\/+$/, '');
      normalizedUrl = `${urlObj.protocol.toLowerCase()}//${urlObj.hostname.toLowerCase()}${cleanPath}${urlObj.search}`;
    } catch (e) {
      normalizedUrl = normalizedUrl.toLowerCase();
    }
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
