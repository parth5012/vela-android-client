jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { useChatStore } from '../store/useChatStore';
import { useConfigStore } from '../store/useConfigStore';
import { syncHistoryWithBackend } from '../utils/history';

describe('syncHistoryWithBackend', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    useChatStore.getState().clearStore();
    useConfigStore.getState().clearConfig();
    jest.clearAllMocks();
  });

  it('should return false if API URL or API Key is missing', async () => {
    const success = await syncHistoryWithBackend();
    expect(success).toBe(false);
  });

  it('should fetch threads, update store, background pre-fetch history for each, and select the first thread as active if none was selected', async () => {
    // 1. Configure the API connection
    useConfigStore.getState().setConfig('https://api.vela.local', 'test-key');

    // Mock response for threads
    const mockThreads = [
      { id: 'thread-1', title: 'Thread 1', updated_at: '2026-07-05T00:00:00Z' },
      { id: 'thread-2', title: 'Thread 2', updated_at: '2026-07-05T01:00:00Z' },
    ];

    const mockMessages1 = [
      { id: 'msg-1', role: 'user' as const, content: 'hello 1' },
      { id: 'msg-2', role: 'assistant' as const, content: 'hi 1' },
    ];

    const mockMessages2 = [
      { id: 'msg-3', role: 'user' as const, content: 'hello 2' },
    ];

    // Mock fetch implementation
    const fetchMock = jest.fn((url: string, options: any) => {
      // Check auth header
      expect(options.headers.Authorization).toBe('Bearer test-key');

      if (url.endsWith('/chat/threads')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockThreads),
        } as any);
      } else if (url.endsWith('/chat/threads/thread-1')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockMessages1),
        } as any);
      } else if (url.endsWith('/chat/threads/thread-2')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockMessages2),
        } as any);
      }

      return Promise.reject(new Error('Unknown URL: ' + url));
    });

    globalThis.fetch = fetchMock as any;

    const success = await syncHistoryWithBackend();
    expect(success).toBe(true);

    // Verify threads are updated in store
    expect(useChatStore.getState().threads).toEqual(mockThreads);

    // Verify first thread is selected as active because activeThreadId was null
    expect(useChatStore.getState().activeThreadId).toBe('thread-1');

    // Wait for the background promises to resolve
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify histories are cached
    expect(useChatStore.getState().messages['thread-1']).toEqual(mockMessages1);
    expect(useChatStore.getState().messages['thread-2']).toEqual(mockMessages2);

    // Verify fetch calls
    expect(fetchMock).toHaveBeenCalledWith('https://api.vela.local/chat/threads', expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith('https://api.vela.local/chat/threads/thread-1', expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith('https://api.vela.local/chat/threads/thread-2', expect.any(Object));
  });

  it('should not change active thread if one is already selected', async () => {
    useConfigStore.getState().setConfig('https://api.vela.local', 'test-key');
    useChatStore.getState().selectThread('already-active');

    const mockThreads = [
      { id: 'thread-1', title: 'Thread 1', updated_at: '2026-07-05T00:00:00Z' },
    ];

    globalThis.fetch = jest.fn((url: string) => {
      if (url.endsWith('/chat/threads')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockThreads),
        } as any);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      } as any);
    }) as any;

    const success = await syncHistoryWithBackend();
    expect(success).toBe(true);
    expect(useChatStore.getState().activeThreadId).toBe('already-active');
  });

  it('should handle failures gracefully and return false', async () => {
    useConfigStore.getState().setConfig('https://api.vela.local', 'test-key');

    globalThis.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as any)
    ) as any;

    const success = await syncHistoryWithBackend();
    expect(success).toBe(false);
  });

  it('should support passing apiUrl and apiKey parameters directly', async () => {
    const mockThreads = [
      { id: 'thread-p1', title: 'Param Thread', updated_at: '2026-07-05T02:00:00Z' },
    ];

    const fetchMock = jest.fn((url: string, options: any) => {
      expect(options.headers.Authorization).toBe('Bearer param-key');
      if (url.endsWith('/chat/threads')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockThreads),
        } as any);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      } as any);
    });

    globalThis.fetch = fetchMock as any;

    const success = await syncHistoryWithBackend('https://api.param.local', 'param-key');
    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://api.param.local/chat/threads', expect.any(Object));
    expect(useChatStore.getState().threads).toEqual(mockThreads);
  });
});
