jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { useConfigStore } from '../store/useConfigStore';

describe('useConfigStore', () => {
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
  });
});
