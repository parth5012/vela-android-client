import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, Share } from 'react-native';
import ThreadOptionsModal from '../components/ui/ThreadOptionsModal';
import { useChatStore } from '../store/useChatStore';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('ThreadOptionsModal', () => {
  const mockThread = {
    id: 'thread-1',
    title: 'Test Thread',
    updated_at: new Date().toISOString(),
    is_pinned: false,
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useChatStore.getState().clearStore();
      useChatStore.getState().createThread('Test Thread', 'thread-1');
    });
  });

  it('renders nothing when not visible and no cached thread', () => {
    let component: any;
    act(() => {
      component = renderer.create(
        <ThreadOptionsModal visible={false} thread={null} onClose={mockOnClose} />
      );
    });
    expect(component.toJSON()).toBeNull();
  });

  it('renders options correctly when visible', () => {
    let component: any;
    act(() => {
      component = renderer.create(
        <ThreadOptionsModal visible={true} thread={mockThread} onClose={mockOnClose} />
      );
    });
    const root = component.root;
    
    // Find Title text
    const titleText = root.find((node: any) => node.type === 'Text' && node.props.style?.fontSize === 16);
    expect(titleText.props.children).toBe('Test Thread');

    // Find option button texts to verify they are rendered
    expect(root.find((node: any) => node.type === 'Text' && node.props.children === 'Share Conversation')).toBeDefined();
    expect(root.find((node: any) => node.type === 'Text' && node.props.children === 'Pin Thread')).toBeDefined();
    expect(root.find((node: any) => node.type === 'Text' && node.props.children === 'Rename Thread')).toBeDefined();
    expect(root.find((node: any) => node.type === 'Text' && node.props.children === 'Delete Thread')).toBeDefined();
    expect(root.find((node: any) => node.type === 'Text' && node.props.children === 'Cancel')).toBeDefined();
  });

  it('handles Pin action correctly', () => {
    let component: any;
    act(() => {
      component = renderer.create(
        <ThreadOptionsModal visible={true} thread={mockThread} onClose={mockOnClose} />
      );
    });
    const root = component.root;

    // Find the Pin Button
    const pinText = root.find((node: any) => node.type === 'Text' && node.props.children === 'Pin Thread');
    let button = pinText;
    while (button && !button.props.onPress) {
      button = button.parent;
    }
    
    act(() => {
      button.props.onPress();
    });

    const thread = useChatStore.getState().threads.find(t => t.id === 'thread-1');
    expect(thread?.is_pinned).toBe(true);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles Share action correctly', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: null });
    
    let component: any;
    act(() => {
      component = renderer.create(
        <ThreadOptionsModal visible={true} thread={mockThread} onClose={mockOnClose} />
      );
    });
    const root = component.root;

    const shareText = root.find((node: any) => node.type === 'Text' && node.props.children === 'Share Conversation');
    let button = shareText;
    while (button && !button.props.onPress) {
      button = button.parent;
    }

    await act(async () => {
      await button.props.onPress();
    });

    expect(shareSpy).toHaveBeenCalledWith({
      message: 'Conversation Title: Test Thread\nID: thread-1',
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles Delete action correctly', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    
    let component: any;
    act(() => {
      component = renderer.create(
        <ThreadOptionsModal visible={true} thread={mockThread} onClose={mockOnClose} />
      );
    });
    const root = component.root;

    const deleteText = root.find((node: any) => node.type === 'Text' && node.props.children === 'Delete Thread');
    let button = deleteText;
    while (button && !button.props.onPress) {
      button = button.parent;
    }

    act(() => {
      button.props.onPress();
    });

    expect(alertSpy).toHaveBeenCalled();
    const alertArgs = alertSpy.mock.calls[0];
    expect(alertArgs[0]).toBe('Delete Conversation');
    
    // Simulate clicking delete in Alert dialog
    const deleteOption = alertArgs[2]?.find((opt: any) => opt.text === 'Delete');
    expect(deleteOption).toBeDefined();

    act(() => {
      deleteOption?.onPress?.();
    });

    const deletedThread = useChatStore.getState().threads.find(t => t.id === 'thread-1');
    expect(deletedThread).toBeUndefined();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles Rename flow and input validation', () => {
    let component: any;
    act(() => {
      component = renderer.create(
        <ThreadOptionsModal visible={true} thread={mockThread} onClose={mockOnClose} />
      );
    });
    const root = component.root;

    // 1. Enter editing mode
    const renameText = root.find((node: any) => node.type === 'Text' && node.props.children === 'Rename Thread');
    let renameBtn = renameText;
    while (renameBtn && !renameBtn.props.onPress) {
      renameBtn = renameBtn.parent;
    }
    
    act(() => {
      renameBtn.props.onPress();
    });

    // Check we have text input now
    const textInput = root.findByType('TextInput');
    expect(textInput.props.value).toBe('Test Thread');

    // Find Save button
    const saveText = root.find((node: any) => node.type === 'Text' && node.props.children === 'Save');
    let saveBtn = saveText;
    while (saveBtn && !saveBtn.props.onPress) {
      saveBtn = saveBtn.parent;
    }
    expect(saveBtn.props.disabled).toBe(false);

    // 2. Clear input -> save should be disabled
    act(() => {
      textInput.props.onChangeText('   ');
    });
    expect(saveBtn.props.disabled).toBe(true);

    // 3. Enter new title -> save should be enabled and update store
    act(() => {
      textInput.props.onChangeText('Renamed Title');
    });
    expect(saveBtn.props.disabled).toBe(false);

    act(() => {
      saveBtn.props.onPress();
    });

    const thread = useChatStore.getState().threads.find(t => t.id === 'thread-1');
    expect(thread?.title).toBe('Renamed Title');
    expect(mockOnClose).toHaveBeenCalled();
  });
});
