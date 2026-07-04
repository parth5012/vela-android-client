jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { useChatStore } from '../store/useChatStore';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.getState().clearStore();
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

    // 3. Select thread
    store.selectThread('test-uuid-2');
    expect(useChatStore.getState().activeThreadId).toBe('test-uuid-2');

    // 4. Delete active thread
    store.deleteThread('test-uuid-2');
    expect(useChatStore.getState().threads.map((t) => t.id)).toEqual([
      'test-uuid-3',
      'test-uuid-1',
    ]);
    // Active thread should shift to first in list ('test-uuid-3')
    expect(useChatStore.getState().activeThreadId).toBe('test-uuid-3');

    // 5. Delete inactive thread
    store.deleteThread('test-uuid-1');
    // Active thread should remain unchanged
    expect(useChatStore.getState().activeThreadId).toBe('test-uuid-3');
    expect(useChatStore.getState().messages['test-uuid-1']).toBeUndefined();

    // 6. Delete last remaining thread
    store.deleteThread('test-uuid-3');
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
});
