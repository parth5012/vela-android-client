import React from 'react';
import renderer, { act } from 'react-test-renderer';
import SetupScreen from '../app/setup';
import { useConfigStore } from '../store/useConfigStore';

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

describe('SetupScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    useConfigStore.getState().clearConfig();
    (globalThis as any).fetch = jest.fn();
  });

  it('should call setConfig on successful 200 response', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    (globalThis as any).fetch = mockFetch;

    let component: any;
    act(() => {
      component = renderer.create(<SetupScreen />);
    });

    const root = component.root;
    
    // Find Inputs
    const textInputs = root.findAllByType('TextInput');
    expect(textInputs.length).toBe(2);

    // Simulate entering API URL and API Key
    act(() => {
      textInputs[0].props.onChangeText('https://api.vela.local');
      textInputs[1].props.onChangeText('test-key');
    });

    // Find Connect button by looking for text "Connect & Save" and walking up to find onPress
    const textNode = root.find((node: any) => node.type === 'Text' && node.children.includes('Connect & Save'));
    let button = textNode;
    while (button && !button.props.onPress) {
      button = button.parent;
    }
    expect(button).toBeDefined();

    // Press the button
    await act(async () => {
      await button.props.onPress();
    });

    // Verify fetch was called with correct arguments
    expect(mockFetch).toHaveBeenCalledWith('https://api.vela.local/health', expect.any(Object));

    // Verify useConfigStore has been updated
    const configState = useConfigStore.getState();
    expect(configState.isConfigured).toBe(true);
    expect(configState.apiUrl).toBe('https://api.vela.local');
    expect(configState.apiKey).toBe('test-key');

    // Verify router.replace was not called directly from SetupScreen (redirection is handled reactively by RootLayout)
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
