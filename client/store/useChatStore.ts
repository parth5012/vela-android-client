import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

interface ChatState {
  threads: Thread[];
  activeThreadId: string | null;
  messages: Record<string, Message[]>;
  isStreaming: boolean;
  createThread: (title: string, id: string) => void;
  selectThread: (id: string) => void;
  deleteThread: (id: string) => void;
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
      deleteThread: (id) => set((state) => {
        const nextThreads = state.threads.filter((t) => t.id !== id);
        const nextActive = state.activeThreadId === id
          ? (nextThreads[0]?.id || null)
          : state.activeThreadId;
        const nextMessages = { ...state.messages };
        delete nextMessages[id];
        return { threads: nextThreads, activeThreadId: nextActive, messages: nextMessages };
      }),
      addMessage: (threadId, message) => set((state) => {
        const current = state.messages[threadId] || [];
        return {
          messages: { ...state.messages, [threadId]: [...current, message] }
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
    }
  )
);
