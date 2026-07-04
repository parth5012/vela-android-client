export async function streamAgentResponse(
  url: string,
  apiKey: string,
  threadId: string,
  message: string,
  onChunk: (chunk: string) => void,
  onDone: (newTitle?: string) => void,
  onError: (error: Error) => void
) {
  try {
    const response = await fetch(`${url}/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({ thread_id: threadId, message }),
    });

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
      if (done) break;

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
