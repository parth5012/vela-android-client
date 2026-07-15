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

  it('should initialize with default values for UI customizations and agent parameters', () => {
    const state = useConfigStore.getState();
    expect(state.theme).toBe('deep');
    expect(state.fontSize).toBe('medium');
    expect(state.accentColor).toBe('indigo');
    expect(state.systemPrompt).toBe('You are an autonomous research agent.');
    expect(state.temperature).toBe(0.7);
    expect(state.modelName).toBe('gemini-1.5-pro');
  });

  it('should allow updating UI customizations and agent parameters via setters', () => {
    const state = useConfigStore.getState();
    
    state.setTheme('cyberpunk');
    state.setFontSize('large');
    state.setAccentColor('rose');
    state.setSystemPrompt('Hello world');
    state.setTemperature(0.9);
    state.setModelName('gemini-1.5-flash');

    const updatedState = useConfigStore.getState();
    expect(updatedState.theme).toBe('cyberpunk');
    expect(updatedState.fontSize).toBe('large');
    expect(updatedState.accentColor).toBe('rose');
    expect(updatedState.systemPrompt).toBe('Hello world');
    expect(updatedState.temperature).toBe(0.9);
    expect(updatedState.modelName).toBe('gemini-1.5-flash');
  });

  it('should have default suggestion starters', () => {
    const state = useConfigStore.getState();
    expect(state.suggestionStarters.length).toBe(3);
    expect(state.suggestionStarters[0].label).toBe('👩‍🏫 Teach Concept');
  });

  it('should update suggestion starters correctly', () => {
    useConfigStore.getState().setSuggestionStarters([
      { label: 'Test Label', text: 'Test text', persona: 'teacher' }
    ]);
    expect(useConfigStore.getState().suggestionStarters.length).toBe(1);
    expect(useConfigStore.getState().suggestionStarters[0].label).toBe('Test Label');
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
