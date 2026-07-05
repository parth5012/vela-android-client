import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfigStore } from './useConfigStore';

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
}

interface ChatState {
  threads: Thread[];
  activeThreadId: string | null;
  messages: Record<string, Message[]>;
  isStreaming: boolean;
  createThread: (title: string, id: string) => void;
  selectThread: (id: string) => void;
  deleteThread: (id: string) => void;
  renameThread: (id: string, newTitle: string) => void;
  togglePinThread: (id: string) => void;
  addMessage: (threadId: string, message: Message) => void;
  appendToken: (threadId: string, token: string) => void;
  setThreads: (threads: Thread[]) => void;
  setHistory: (threadId: string, history: Message[]) => void;
  setStreaming: (streaming: boolean) => void;
  clearStore: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      threads: [],
      activeThreadId: null,
      messages: {},
      isStreaming: false,
      createThread: (title, id) => set((state) => ({
        threads: [{ id, title, updated_at: new Date().toISOString() }, ...state.threads],
        activeThreadId: id,
        messages: { ...state.messages, [id]: [] }
      })),
      selectThread: (id) => set({ activeThreadId: id }),
      deleteThread: (id) => {
        const config = useConfigStore.getState();
        if (config.apiUrl && config.apiKey) {
          let formattedUrl = config.apiUrl.trim();
          if (!/^https?:\/\//i.test(formattedUrl)) {
            formattedUrl = 'https://' + formattedUrl;
          }
          formattedUrl = formattedUrl.replace(/\/+$/, '');
          fetch(`${formattedUrl}/chat/threads/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${config.apiKey.trim()}`,
            },
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
      renameThread: (id, newTitle) => set((state) => ({
        threads: state.threads.map((t) => t.id === id ? { ...t, title: newTitle } : t)
      })),
      togglePinThread: (id) => set((state) => ({
        threads: state.threads.map((t) => t.id === id ? { ...t, is_pinned: !t.is_pinned } : t)
      })),
      setThreads: (threads) => set({ threads }),
      setHistory: (threadId, history) => set((state) => ({
        messages: { ...state.messages, [threadId]: history }
      })),
      setStreaming: (isStreaming) => set({ isStreaming }),
      clearStore: () => set({ threads: [], activeThreadId: null, messages: {}, isStreaming: false }),
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
