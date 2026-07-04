import { streamAgentResponse } from '../utils/sse';

describe('streamAgentResponse', () => {
  let originalFetch: any;

  beforeAll(() => {
    originalFetch = (globalThis as any).fetch;
  });

  afterAll(() => {
    (globalThis as any).fetch = originalFetch;
  });

  it('should stream chunks and trigger events', async () => {
    const chunks: string[] = [];
    let completed = false;
    let title = '';

    (globalThis as any).fetch = jest.fn().mockImplementation(() => {
      const mockStream = {
        getReader() {
          let count = 0;
          return {
            async read() {
              if (count === 0) {
                count++;
                return { value: new TextEncoder().encode('data: {"type": "content", "delta": "Hello"}\n\n'), done: false };
              } else if (count === 1) {
                count++;
                return { value: new TextEncoder().encode('data: {"type": "done", "thread_title": "Greeting"}\n\n'), done: false };
              }
              return { value: undefined, done: true };
            }
          };
        }
      };
      return Promise.resolve({
        ok: true,
        body: mockStream
      });
    });

    await streamAgentResponse(
      'http://localhost',
      'key',
      'thread-1',
      'hi',
      (chunk) => chunks.push(chunk),
      (t) => { completed = true; title = t || ''; },
      () => {}
    );

    expect(chunks).toEqual(['Hello']);
    expect(completed).toBe(true);
    expect(title).toBe('Greeting');
  });

  it('should handle non-ok server response status by triggering onError', async () => {
    let errorOccurred = false;
    let errorMessage = '';

    (globalThis as any).fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
      });
    });

    await streamAgentResponse(
      'http://localhost',
      'key',
      'thread-1',
      'hi',
      () => {},
      () => {},
      (err) => {
        errorOccurred = true;
        errorMessage = err.message;
      }
    );

    expect(errorOccurred).toBe(true);
    expect(errorMessage).toBe('Server returned HTTP 500');
  });

  it('should handle body stream reader unavailability', async () => {
    let errorOccurred = false;
    let errorMessage = '';

    (globalThis as any).fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        body: null,
      });
    });

    await streamAgentResponse(
      'http://localhost',
      'key',
      'thread-1',
      'hi',
      () => {},
      () => {},
      (err) => {
        errorOccurred = true;
        errorMessage = err.message;
      }
    );

    expect(errorOccurred).toBe(true);
    expect(errorMessage).toBe('Response body is not readable');
  });
});
