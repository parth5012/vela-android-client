import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface ConfigState {
  apiUrl: string;
  apiKey: string;
  isConfigured: boolean;
  hasHydrated: boolean;
  setConfig: (url: string, key: string) => void;
  clearConfig: () => void;
  setHasHydrated: (val: boolean) => void;
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
      setConfig: (url, key) => set({ apiUrl: url, apiKey: key, isConfigured: true }),
      clearConfig: () => set({ apiUrl: '', apiKey: '', isConfigured: false }),
      setHasHydrated: (val) => set({ hasHydrated: val }),
    }),
    {
      name: 'vela-config-storage',
      storage: createJSONStorage(() => secureConfigStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
