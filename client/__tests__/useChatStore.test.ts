jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { useChatStore } from '../store/useChatStore';
import { useConfigStore } from '../store/useConfigStore';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.getState().clearStore();
    useConfigStore.getState().clearConfig();
  });

  it('should handle creating, selecting, and deleting threads with correct fallback active selection', () => {
    const store = useChatStore.getState();
    expect(store.threads.length).toBe(0);

    // 1. Create multiple threads
    store.createThread('Thread 1', 'test-uuid-1');
    store.createThread('Thread 2', 'test-uuid-2');
    store.createThread('Thread 3', 'test-uuid-3');
    
    // Active thread should be the most recently created one (which is prepended)
    expect(useChatStore.getState().activeThreadId).toBe('test-uuid-3');
    expect(useChatStore.getState().threads.map((t) => t.id)).toEqual([
      'test-uuid-3',
      'test-uuid-2',
      'test-uuid-1',
    ]);

    // 2. Add message to thread
    store.addMessage('test-uuid-1', { id: 'msg1', role: 'user', content: 'hello' });
    expect(useChatStore.getState().messages['test-uuid-1'].length).toBe(1);
    expect(useChatStore.getState().threads.map((t) => t.id)).toEqual([
      'test-uuid-1',
      'test-uuid-3',
      'test-uuid-2',
    ]);

    // 3. Select thread
    store.selectThread('test-uuid-2');
    expect(useChatStore.getState().activeThreadId).toBe('test-uuid-2');

    // 4. Delete active thread
    store.deleteThread('test-uuid-2');
    expect(useChatStore.getState().threads.map((t) => t.id)).toEqual([
      'test-uuid-1',
      'test-uuid-3',
    ]);
    // Active thread should shift to first in list ('test-uuid-1')
    expect(useChatStore.getState().activeThreadId).toBe('test-uuid-1');

    // 5. Delete inactive thread
    store.deleteThread('test-uuid-3');
    // Active thread should remain unchanged
    expect(useChatStore.getState().activeThreadId).toBe('test-uuid-1');
    expect(useChatStore.getState().messages['test-uuid-3']).toBeUndefined();

    // 6. Delete last remaining thread
    store.deleteThread('test-uuid-1');
    expect(useChatStore.getState().threads.length).toBe(0);
    expect(useChatStore.getState().activeThreadId).toBeNull();
  });

  it('should handle appending tokens to assistant messages', () => {
    const store = useChatStore.getState();
    store.createThread('Thread 1', 'test-uuid-2');
    
    // Add user message
    store.addMessage('test-uuid-2', { id: 'msg1', role: 'user', content: 'hello' });
    
    // Attempting to appendToken when last message is not assistant should do nothing
    store.appendToken('test-uuid-2', 'token');
    expect(useChatStore.getState().messages['test-uuid-2'].length).toBe(1);

    // Add assistant message
    store.addMessage('test-uuid-2', { id: 'msg2', role: 'assistant', content: 'Hi' });
    expect(useChatStore.getState().messages['test-uuid-2'][1].content).toBe('Hi');

    // Append token
    store.appendToken('test-uuid-2', ' there!');
    expect(useChatStore.getState().messages['test-uuid-2'][1].content).toBe('Hi there!');
    expect(useChatStore.getState().messages['test-uuid-2'].length).toBe(2);
  });

  it('should handle setHistory, setThreads, and setStreaming', () => {
    const store = useChatStore.getState();
    store.createThread('Thread 1', 'test-uuid-3');

    store.setStreaming(true);
    expect(useChatStore.getState().isStreaming).toBe(true);

    const history = [
      { id: 'msg1', role: 'user' as const, content: 'hello' },
      { id: 'msg2', role: 'assistant' as const, content: 'world' },
    ];
    store.setHistory('test-uuid-3', history);
    expect(useChatStore.getState().messages['test-uuid-3']).toEqual(history);

    const newThreads = [
      { id: 'test-uuid-4', title: 'Thread 4', updated_at: '2026-07-04T18:00:00.000Z' }
    ];
    store.setThreads(newThreads);
    expect(useChatStore.getState().threads).toEqual(newThreads);
  });

  it('should handle renameThread and togglePinThread', () => {
    const store = useChatStore.getState();
    store.createThread('Original Title', 'test-uuid-rename');

    // Verify renaming thread
    store.renameThread('test-uuid-rename', 'New Title');
    const thread = useChatStore.getState().threads.find(t => t.id === 'test-uuid-rename');
    expect(thread?.title).toBe('New Title');

    // Verify toggle pin thread
    expect(thread?.is_pinned).toBeUndefined();

    // Toggle pin on (should become true)
    store.togglePinThread('test-uuid-rename');
    const pinnedThread = useChatStore.getState().threads.find(t => t.id === 'test-uuid-rename');
    expect(pinnedThread?.is_pinned).toBe(true);

    // Toggle pin off (should become false)
    store.togglePinThread('test-uuid-rename');
    const unpinnedThread = useChatStore.getState().threads.find(t => t.id === 'test-uuid-rename');
    expect(unpinnedThread?.is_pinned).toBe(false);
  });

  describe('branchThread and truncateThreadHistory', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeAll(() => {
      originalFetch = globalThis.fetch;
    });

    afterAll(() => {
      globalThis.fetch = originalFetch;
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should branch thread locally and call backend API when config is set', async () => {
      useConfigStore.getState().setConfig('https://api.vela.local', 'test-key');
      
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      globalThis.fetch = fetchMock as any;

      const store = useChatStore.getState();
      
      // Setup parent thread
      store.createThread('Parent Thread', 'parent-id');
      store.addMessage('parent-id', { id: 'msg-1', role: 'user', content: 'hello 1' });
      store.addMessage('parent-id', { id: 'msg-2', role: 'assistant', content: 'hi 1' });
      store.addMessage('parent-id', { id: 'msg-3', role: 'user', content: 'hello 2' });

      // Call branchThread
      await store.branchThread('parent-id', 'msg-2', 'branched-id', 'Branched Thread');

      // Verify backend API call
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('https://api.vela.local/chat/threads/branch', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent_thread_id: 'parent-id',
          new_thread_id: 'branched-id',
          upto_message_id: 'msg-2',
          title: 'Branched Thread',
        }),
      });

      // Verify local store state
      const state = useChatStore.getState();
      expect(state.activeThreadId).toBe('branched-id');
      
      // The branched thread should be prepended
      expect(state.threads[0]).toEqual({
        id: 'branched-id',
        title: 'Branched Thread',
        updated_at: expect.any(String),
      });

      // The branched thread should have messages up to and including msg-2
      expect(state.messages['branched-id']).toEqual([
        { id: 'msg-1', role: 'user', content: 'hello 1' },
        { id: 'msg-2', role: 'assistant', content: 'hi 1' },
      ]);

      // Parent thread messages should remain intact
      expect(state.messages['parent-id']).toEqual([
        { id: 'msg-1', role: 'user', content: 'hello 1' },
        { id: 'msg-2', role: 'assistant', content: 'hi 1' },
        { id: 'msg-3', role: 'user', content: 'hello 2' },
      ]);
    });

    it('should branch thread locally and not call backend when config is missing', async () => {
      // Config is empty (clearConfig is called in beforeEach)
      const fetchMock = jest.fn();
      globalThis.fetch = fetchMock as any;

      const store = useChatStore.getState();
      
      // Setup parent thread
      store.createThread('Parent Thread', 'parent-id');
      store.addMessage('parent-id', { id: 'msg-1', role: 'user', content: 'hello 1' });
      store.addMessage('parent-id', { id: 'msg-2', role: 'assistant', content: 'hi 1' });

      // Call branchThread
      await store.branchThread('parent-id', 'msg-2', 'branched-id', 'Branched Thread');

      // Verify no backend API call
      expect(fetchMock).not.toHaveBeenCalled();

      // Verify local store state
      const state = useChatStore.getState();
      expect(state.activeThreadId).toBe('branched-id');
      expect(state.messages['branched-id']).toEqual([
        { id: 'msg-1', role: 'user', content: 'hello 1' },
        { id: 'msg-2', role: 'assistant', content: 'hi 1' },
      ]);
    });

    it('should truncate thread history locally and call backend API when config is set', async () => {
      useConfigStore.getState().setConfig('https://api.vela.local', 'test-key');
      
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      globalThis.fetch = fetchMock as any;

      const store = useChatStore.getState();
      
      // Setup thread
      store.createThread('Thread', 'thread-id');
      store.addMessage('thread-id', { id: 'msg-1', role: 'user', content: 'hello 1' });
      store.addMessage('thread-id', { id: 'msg-2', role: 'assistant', content: 'hi 1' });
      store.addMessage('thread-id', { id: 'msg-3', role: 'user', content: 'hello 2' });

      // Call truncateThreadHistory
      await store.truncateThreadHistory('thread-id', 'msg-2');

      // Verify backend API call
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('https://api.vela.local/chat/threads/thread-id/truncate', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          upto_message_id: 'msg-2',
        }),
      });

      // Verify local store state
      const state = useChatStore.getState();
      // The thread should have messages strictly before msg-2 (i.e. only msg-1)
      expect(state.messages['thread-id']).toEqual([
        { id: 'msg-1', role: 'user', content: 'hello 1' },
      ]);
    });

    it('should truncate thread history locally and not call backend when config is missing', async () => {
      // Config is empty
      const fetchMock = jest.fn();
      globalThis.fetch = fetchMock as any;

      const store = useChatStore.getState();
      
      // Setup thread
      store.createThread('Thread', 'thread-id');
      store.addMessage('thread-id', { id: 'msg-1', role: 'user', content: 'hello 1' });
      store.addMessage('thread-id', { id: 'msg-2', role: 'assistant', content: 'hi 1' });

      // Call truncateThreadHistory
      await store.truncateThreadHistory('thread-id', 'msg-2');

      // Verify no backend API call
      expect(fetchMock).not.toHaveBeenCalled();

      // Verify local store state
      const state = useChatStore.getState();
      expect(state.messages['thread-id']).toEqual([
        { id: 'msg-1', role: 'user', content: 'hello 1' },
      ]);
    });
  });
});
