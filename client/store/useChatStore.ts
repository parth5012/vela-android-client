import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfigStore } from './useConfigStore';

const normalizeUrl = (url: string): string => {
  let formattedUrl = url.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = 'https://' + formattedUrl;
  }
  return formattedUrl.replace(/\/+$/, '');
};

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface Thread {
  id: string;
  title: string;
  updated_at: string;
  is_pinned?: boolean;
  persona?: string;
}

interface ChatState {
  threads: Thread[];
  activeThreadId: string | null;
  messages: Record<string, Message[]>;
  isStreaming: boolean;
  createThread: (title: string, id: string, persona?: string) => void;
  selectThread: (id: string) => void;
  deleteThread: (id: string) => void;
  renameThread: (id: string, newTitle: string) => void;
  togglePinThread: (id: string) => void;
  setThreadPersona: (threadId: string, persona: string) => void;
  addMessage: (threadId: string, message: Message) => void;
  appendToken: (threadId: string, token: string) => void;
  setThreads: (threads: Thread[]) => void;
  setHistory: (threadId: string, history: Message[]) => void;
  setStreaming: (streaming: boolean) => void;
  clearStore: () => void;
  branchThread: (parentThreadId: string, uptoMessageId: string, newThreadId: string, title: string) => Promise<void>;
  truncateThreadHistory: (threadId: string, uptoMessageId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      threads: [],
      activeThreadId: null,
      messages: {},
      isStreaming: false,
      createThread: (title, id, persona = 'personal assistant') => set((state) => ({
        threads: [{ id, title, persona, updated_at: new Date().toISOString() }, ...state.threads],
        activeThreadId: id,
        messages: { ...state.messages, [id]: [] }
      })),
      selectThread: (id) => set({ activeThreadId: id }),
      deleteThread: (id) => {
        const config = useConfigStore.getState();
        if (config.apiUrl && config.apiKey) {
          const formattedUrl = normalizeUrl(config.apiUrl);
          fetch(`${formattedUrl}/chat/threads/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${config.apiKey.trim()}`,
            },
          }).then((res) => {
            if (!res.ok) {
              console.error(`[deleteThread] Failed to delete on backend, status: ${res.status}`);
            }
          }).catch((err) => console.error('[deleteThread] Failed to delete on backend:', err));
        }

        set((state) => {
          const nextThreads = state.threads.filter((t) => t.id !== id);
          const nextActive = state.activeThreadId === id
            ? (nextThreads[0]?.id || null)
            : state.activeThreadId;
          const nextMessages = { ...state.messages };
          delete nextMessages[id];
          return { threads: nextThreads, activeThreadId: nextActive, messages: nextMessages };
        });
      },
      addMessage: (threadId, message) => set((state) => {
        const current = state.messages[threadId] || [];
        const threadIndex = state.threads.findIndex(t => t.id === threadId);
        let updatedThreads = [...state.threads];
        if (threadIndex !== -1) {
          const updatedThread = {
            ...updatedThreads[threadIndex],
            updated_at: new Date().toISOString()
          };
          updatedThreads.splice(threadIndex, 1);
          updatedThreads = [updatedThread, ...updatedThreads];
        }
        return {
          messages: { ...state.messages, [threadId]: [...current, message] },
          threads: updatedThreads
        };
      }),
      appendToken: (threadId, token) => set((state) => {
        const current = state.messages[threadId] || [];
        if (current.length === 0) return {};
        const last = current[current.length - 1];
        if (last.role !== 'assistant') return {};
        
        const updatedLast = { ...last, content: last.content + token };
        return {
          messages: {
            ...state.messages,
            [threadId]: [...current.slice(0, -1), updatedLast]
          }
        };
      }),
      renameThread: async (id, newTitle) => {
        const config = useConfigStore.getState();
        if (config.apiUrl && config.apiKey) {
          const formattedUrl = normalizeUrl(config.apiUrl);
          try {
            const res = await fetch(`${formattedUrl}/chats/threads`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${config.apiKey.trim()}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                thread_id: id,
                title: newTitle,
              }),
            });
            if (!res.ok) {
              console.error(`[renameThread] Backend rename returned status: ${res.status}`);
            }
          } catch (err) {
            console.error('[renameThread] Failed to rename on backend:', err);
          }
        }

        set((state) => ({
          threads: state.threads.map((t) => t.id === id ? { ...t, title: newTitle } : t)
        }));
      },
      togglePinThread: (id) => set((state) => ({
        threads: state.threads.map((t) => t.id === id ? { ...t, is_pinned: !t.is_pinned } : t)
      })),
      setThreadPersona: (threadId, persona) => set((state) => ({
        threads: state.threads.map((t) => t.id === threadId ? { ...t, persona } : t)
      })),
      setThreads: (threads) => set({ threads }),
      setHistory: (threadId, history) => set((state) => ({
        messages: { ...state.messages, [threadId]: history }
      })),
      setStreaming: (isStreaming) => set({ isStreaming }),
      clearStore: () => set({ threads: [], activeThreadId: null, messages: {}, isStreaming: false }),
      branchThread: async (parentThreadId, uptoMessageId, newThreadId, title) => {
        const config = useConfigStore.getState();
        if (config.apiUrl && config.apiKey) {
          const formattedUrl = normalizeUrl(config.apiUrl);
          try {
            const res = await fetch(`${formattedUrl}/chat/threads/branch`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${config.apiKey.trim()}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                parent_thread_id: parentThreadId,
                new_thread_id: newThreadId,
                upto_message_id: uptoMessageId,
                title: title,
              }),
            });
            if (!res.ok) {
              console.error(`[branchThread] Backend branch returned status: ${res.status}`);
            }
          } catch (err) {
            console.error('[branchThread] Failed to branch on backend:', err);
          }
        }

        set((state) => {
          const parentMessages = state.messages[parentThreadId] || [];
          const index = parentMessages.findIndex((m) => m.id === uptoMessageId);
          const branchedMessages = index !== -1 ? parentMessages.slice(0, index + 1) : [...parentMessages];
          
          const newThread = {
            id: newThreadId,
            title,
            updated_at: new Date().toISOString(),
          };

          return {
            threads: [newThread, ...state.threads],
            activeThreadId: newThreadId,
            messages: {
              ...state.messages,
              [newThreadId]: branchedMessages,
            },
          };
        });
      },

      truncateThreadHistory: async (threadId, uptoMessageId) => {
        const config = useConfigStore.getState();
        if (config.apiUrl && config.apiKey) {
          const formattedUrl = normalizeUrl(config.apiUrl);
          try {
            const res = await fetch(`${formattedUrl}/chat/threads/${threadId}/truncate`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${config.apiKey.trim()}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                upto_message_id: uptoMessageId,
              }),
            });
            if (!res.ok) {
              console.error(`[truncateThreadHistory] Backend truncate returned status: ${res.status}`);
            }
          } catch (err) {
            console.error('[truncateThreadHistory] Failed to truncate on backend:', err);
          }
        }

        set((state) => {
          const current = state.messages[threadId] || [];
          const index = current.findIndex((m) => m.id === uptoMessageId);
          const truncatedMessages = index !== -1 ? current.slice(0, index) : [...current];

          return {
            messages: {
              ...state.messages,
              [threadId]: truncatedMessages,
            },
          };
        });
      },
    }),
    {
      name: 'vela-chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        threads: state.threads,
        activeThreadId: state.activeThreadId,
        messages: state.messages,
      }),
    }
  )
);
