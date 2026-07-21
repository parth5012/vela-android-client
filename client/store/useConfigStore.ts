import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface SuggestionStarter {
  label: string;
  text: string;
  persona: string;
}

interface ConfigState {
  apiUrl: string;
  apiKey: string;
  isConfigured: boolean;
  hasHydrated: boolean;
  setConfig: (url: string, key: string) => void;
  clearConfig: () => void;
  setHasHydrated: (val: boolean) => void;
  theme: 'deep' | 'slate' | 'cyberpunk' | 'nordic' | 'dracula' | 'oled';
  fontSize: 'small' | 'medium' | 'large';
  accentColor: 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' | 'pink' | 'orange' | 'blue';
  systemPrompt: string;
  temperature: number;
  modelName: string;
  defaultPersona: string;
  userName: string;
  suggestionStarters: SuggestionStarter[];
  setTheme: (theme: 'deep' | 'slate' | 'cyberpunk' | 'nordic' | 'dracula' | 'oled') => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setAccentColor: (color: 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' | 'pink' | 'orange' | 'blue') => void;
  setSystemPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setModelName: (model: string) => void;
  setDefaultPersona: (persona: string) => void;
  setUserName: (name: string) => void;
  setSuggestionStarters: (starters: SuggestionStarter[]) => void;
}

const SECURE_KEY = 'vela-api-key';

const secureConfigStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const baseValue = await AsyncStorage.getItem(name);
    if (!baseValue) return null;

    try {
      const state = JSON.parse(baseValue);
      let apiKey = '';
      if (Platform.OS !== 'web') {
        const secureKey = await SecureStore.getItemAsync(SECURE_KEY);
        if (secureKey) {
          apiKey = secureKey;
        }
      } else {
        apiKey = state.state?.apiKey || '';
      }

      if (state.state) {
        state.state.apiKey = apiKey;
      }
      return JSON.stringify(state);
    } catch (e) {
      return baseValue;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const state = JSON.parse(value);
      const apiKey = state.state?.apiKey || '';

      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(SECURE_KEY, apiKey);
        if (state.state) {
          state.state.apiKey = ''; // Strip apiKey from AsyncStorage
        }
      }

      await AsyncStorage.setItem(name, JSON.stringify(state));
    } catch (e) {
      await AsyncStorage.setItem(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(SECURE_KEY);
    }
    await AsyncStorage.removeItem(name);
  },
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      apiUrl: '',
      apiKey: '',
      isConfigured: false,
      hasHydrated: false,
      theme: 'deep',
      fontSize: 'medium',
      accentColor: 'indigo',
      systemPrompt: 'You are an autonomous research agent.',
      temperature: 0.7,
      modelName: 'gemini-1.5-pro',
      defaultPersona: 'personal assistant',
      userName: 'Parth',
      suggestionStarters: [
        { label: '👩‍🏫 Teach Concept', text: 'Teach me the intuition behind binary search and trace an example', persona: 'teacher' },
        { label: '📊 Data Analyst', text: 'Analyze the key features of the 2026 FIFA World Cup matches', persona: 'analyst' },
        { label: '✍️ Prompt Architect', text: 'Help me draft a detailed system prompt for a weather assistant bot', persona: 'prompt builder' }
      ],
      setConfig: (url, key) => set({ apiUrl: url, apiKey: key, isConfigured: true }),
      clearConfig: () =>
        set({
          apiUrl: '',
          apiKey: '',
          isConfigured: false,
          theme: 'deep',
          fontSize: 'medium',
          accentColor: 'indigo',
          systemPrompt: 'You are an autonomous research agent.',
          temperature: 0.7,
          modelName: 'gemini-1.5-pro',
          defaultPersona: 'personal assistant',
          userName: 'Parth',
          suggestionStarters: [
            { label: '👩‍🏫 Teach Concept', text: 'Teach me the intuition behind binary search and trace an example', persona: 'teacher' },
            { label: '📊 Data Analyst', text: 'Analyze the key features of the 2026 FIFA World Cup matches', persona: 'analyst' },
            { label: '✍️ Prompt Architect', text: 'Help me draft a detailed system prompt for a weather assistant bot', persona: 'prompt builder' }
          ],
        }),
      setHasHydrated: (val) => set({ hasHydrated: val }),
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
      setTemperature: (temperature) => set({ temperature }),
      setModelName: (modelName) => set({ modelName }),
      setDefaultPersona: (defaultPersona) => set({ defaultPersona }),
      setUserName: (userName) => set({ userName }),
      setSuggestionStarters: (suggestionStarters) => set({ suggestionStarters }),
    }),
    {
    name: 'vela-config-storage',
    storage: createJSONStorage(() => secureConfigStorage),
    onRehydrateStorage: (state) => {
      return (hydratedState, error) => {
        if (!error && hydratedState) {
          hydratedState.setHasHydrated(true);
        } else {
          state?.setHasHydrated(true);
        }
      };
    },
    }
  )
);
