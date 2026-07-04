jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

let mockSecureStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key) => mockSecureStore[key] || null),
  setItemAsync: jest.fn(async (key, value) => {
    mockSecureStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key) => {
    delete mockSecureStore[key];
  }),
}));

import { useConfigStore } from '../store/useConfigStore';

describe('useConfigStore', () => {
  beforeEach(() => {
    mockSecureStore = {};
    useConfigStore.getState().clearConfig();
  });

  it('should initialize with blank values and allow setting config', () => {
    const state = useConfigStore.getState();
    expect(state.apiUrl).toBe('');
    expect(state.apiKey).toBe('');
    expect(state.isConfigured).toBe(false);

    state.setConfig('https://api.vela.local', 'my-secret-key');

    const updatedState = useConfigStore.getState();
    expect(updatedState.apiUrl).toBe('https://api.vela.local');
    expect(updatedState.apiKey).toBe('my-secret-key');
    expect(updatedState.isConfigured).toBe(true);

    // Test clearConfig
    updatedState.clearConfig();
    const clearedState = useConfigStore.getState();
    expect(clearedState.apiUrl).toBe('');
    expect(clearedState.apiKey).toBe('');
    expect(clearedState.isConfigured).toBe(false);
  });
});
