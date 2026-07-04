import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ConfigState {
  apiUrl: string;
  apiKey: string;
  isConfigured: boolean;
  hasHydrated: boolean;
  setConfig: (url: string, key: string) => void;
  clearConfig: () => void;
  setHasHydrated: (val: boolean) => void;
}

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
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
