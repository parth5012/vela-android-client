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

  it('should store apiKey securely in SecureStore and strip it from AsyncStorage', async () => {
    const state = useConfigStore.getState();
    state.setConfig('https://api.vela.local', 'my-secret-key');

    // Allow async persistence storage calls to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify SecureStore has the token
    expect(mockSecureStore['vela-api-key']).toBe('my-secret-key');

    // Verify AsyncStorage has the structure but key is stripped
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const asyncStorageVal = await AsyncStorage.getItem('vela-config-storage');
    expect(asyncStorageVal).not.toBeNull();
    const parsed = JSON.parse(asyncStorageVal);
    expect(parsed.state.apiKey).toBe('');
    expect(parsed.state.apiUrl).toBe('https://api.vela.local');
  });
});
