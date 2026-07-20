import { Platform } from 'react-native';

const normalizeUrl = (rawUrl: string): string => {
  let formattedUrl = (rawUrl || '').trim();
  if (!formattedUrl) return '';
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = 'https://' + formattedUrl;
  }
  return formattedUrl.replace(/\/+$/, '');
};

export async function streamAgentResponse(
  url: string,
  apiKey: string,
  threadId: string,
  message: string,
  onChunk: (chunk: string) => void,
  onDone: (newTitle?: string) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
  persona?: string
): Promise<void> {
  try {
    const formattedUrl = normalizeUrl(url);
    if (!formattedUrl) {
      throw new Error('API URL is not configured.');
    }

    const sseFetch = Platform.OS !== 'web' && process.env.NODE_ENV !== 'test'
      ? require('react-native-fetch-api').fetch
      : fetch;

    const response = await sseFetch(`${formattedUrl}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({ thread_id: threadId, message, persona }),
      signal,
      ...((Platform.OS !== 'web' && process.env.NODE_ENV !== 'test') ? {
        reactNative: { textStreaming: true }
      } : {})
    } as any);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("Response body is not readable");
    }

    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        const cleaned = buffer.trim();
        if (cleaned.startsWith('data: ')) {
          const rawData = cleaned.slice(6);
          try {
            const parsed = JSON.parse(rawData);
            if (parsed.type === 'content') {
              onChunk(parsed.delta);
            } else if (parsed.type === 'done') {
              onDone(parsed.thread_title);
            } else if (parsed.type === 'error') {
              onError(new Error(parsed.message || 'Unknown server error'));
            }
          } catch {
            // Ignore malformed JSON
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleaned = line.trim();
        if (cleaned.startsWith('data: ')) {
          const rawData = cleaned.slice(6);
          try {
            const parsed = JSON.parse(rawData);
            if (parsed.type === 'content') {
              onChunk(parsed.delta);
            } else if (parsed.type === 'done') {
              onDone(parsed.thread_title);
            } else if (parsed.type === 'error') {
              onError(new Error(parsed.message || 'Unknown server error'));
            }
          } catch {
            // Ignore malformed JSON chunks
          }
        }
      }
    }
  } catch (error: any) {
    onError(error);
  }
}
