import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Share,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Thread, useChatStore } from '../../store/useChatStore';

interface ThreadOptionsModalProps {
  visible: boolean;
  thread: Thread | null;
  onClose: () => void;
}

export default function ThreadOptionsModal({
  visible,
  thread,
  onClose,
}: ThreadOptionsModalProps) {
  const { togglePinThread, renameThread, deleteThread, messages } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [cachedThread, setCachedThread] = useState<Thread | null>(null);

  useEffect(() => {
    if (thread) {
      setCachedThread(thread);
    }
  }, [thread]);

  useEffect(() => {
    if (visible && thread) {
      setIsEditing(false);
      setNewTitle(thread.title);
    }
  }, [visible, thread]);

  if (!thread && !cachedThread) {
    return null;
  }

  // Active thread to use for UI and functions (either prop thread or cached fallback)
  const activeThread = thread || cachedThread;

  if (!activeThread) {
    return null;
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Conversation Title: ${activeThread.title}\nID: ${activeThread.id}`,
      });
    } catch (error) {
      console.error('Error sharing thread:', error);
    }
    onClose();
  };

  const handleExportMarkdown = async () => {
    try {
      const threadMsgs = messages[activeThread.id] || [];
      if (threadMsgs.length === 0) {
        Alert.alert('Info', 'This conversation has no messages to export.');
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const cleanTitle = activeThread.title
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
        .slice(0, 30);
      const filename = `vela-chat-${cleanTitle || 'export'}-${dateStr}.md`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      let mdContent = `# Vela Chat: ${activeThread.title}\n`;
      mdContent += `*Exported on: ${new Date().toLocaleString()}*\n`;
      mdContent += `*Persona: ${activeThread.persona || 'personal assistant'}*\n`;
      mdContent += `*ID: ${activeThread.id}*\n\n`;
      mdContent += `---\n\n`;

      threadMsgs.forEach((msg) => {
        const isUser = msg.role === 'user';
        mdContent += `### ${isUser ? '👤 User' : '🤖 Vela Agent'}\n\n`;
        mdContent += `${msg.content}\n\n`;
        mdContent += `---\n\n`;
      });

      await FileSystem.writeAsStringAsync(fileUri, mdContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/markdown', dialogTitle: 'Export Chat' });
    } catch (err: any) {
      console.error('Error exporting markdown:', err);
      Alert.alert('Error', 'Failed to export chat.');
    }
    onClose();
  };

  const handleExportJson = async () => {
    try {
      const threadMsgs = messages[activeThread.id] || [];
      if (threadMsgs.length === 0) {
        Alert.alert('Info', 'This conversation has no messages to export.');
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const cleanTitle = activeThread.title
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
        .slice(0, 30);
      const filename = `vela-chat-${cleanTitle || 'export'}-${dateStr}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      const exportData = {
        thread: {
          id: activeThread.id,
          title: activeThread.title,
          persona: activeThread.persona,
          updated_at: activeThread.updated_at,
        },
        messages: threadMsgs,
        exported_at: new Date().toISOString(),
      };

      const jsonContent = JSON.stringify(exportData, null, 2);

      await FileSystem.writeAsStringAsync(fileUri, jsonContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export Chat as JSON' });
    } catch (err: any) {
      console.error('Error exporting JSON:', err);
      Alert.alert('Error', 'Failed to export chat.');
    }
    onClose();
  };

  const handleTogglePin = () => {
    togglePinThread(activeThread.id);
    onClose();
  };

  const handleSaveRename = () => {
    if (!newTitle.trim()) return;
    renameThread(activeThread.id, newTitle.trim());
    onClose();
  };

  const handleCancelRename = () => {
    setIsEditing(false);
    setNewTitle(activeThread.title);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteThread(activeThread.id);
            onClose();
          },
        },
      ]
    );
  };

  const isSaveDisabled = !newTitle.trim();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.dragHandle} />

            {!isEditing ? (
              <View>
                <Text style={styles.title} numberOfLines={1}>
                  {activeThread.title}
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.optionButton,
                    pressed && styles.optionButtonPressed,
                  ]}
                  onPress={handleShare}
                >
                  <Text style={styles.optionIcon}>📤</Text>
                  <Text style={styles.optionButtonText}>Share Conversation</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.optionButton,
                    pressed && styles.optionButtonPressed,
                  ]}
                  onPress={handleExportMarkdown}
                >
                  <Text style={styles.optionIcon}>📄</Text>
                  <Text style={styles.optionButtonText}>Export as Markdown (.md)</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.optionButton,
                    pressed && styles.optionButtonPressed,
                  ]}
                  onPress={handleExportJson}
                >
                  <Text style={styles.optionIcon}>⚙️</Text>
                  <Text style={styles.optionButtonText}>Export as JSON (.json)</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.optionButton,
                    pressed && styles.optionButtonPressed,
                  ]}
                  onPress={handleTogglePin}
                >
                  <Text style={styles.optionIcon}>📌</Text>
                  <Text style={styles.optionButtonText}>
                    {activeThread.is_pinned ? 'Unpin Thread' : 'Pin Thread'}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.optionButton,
                    pressed && styles.optionButtonPressed,
                  ]}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={styles.optionIcon}>✏️</Text>
                  <Text style={styles.optionButtonText}>Rename Thread</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.optionButton,
                    styles.destructiveButton,
                    pressed && styles.destructiveButtonPressed,
                  ]}
                  onPress={handleDelete}
                >
                  <Text style={[styles.optionIcon, styles.destructiveIcon]}>🗑️</Text>
                  <Text style={[styles.optionButtonText, styles.destructiveButtonText]}>
                    Delete Thread
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.cancelButtonPressed,
                  ]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text style={styles.editHeader}>Rename Thread</Text>
                <TextInput
                  style={styles.textInput}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Enter new title..."
                  placeholderTextColor="#475569"
                  autoFocus
                  selectTextOnFocus
                />
                <View style={styles.editActionRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.editActionButton,
                      styles.editCancelButton,
                      pressed && styles.editCancelButtonPressed,
                    ]}
                    onPress={handleCancelRename}
                  >
                    <Text style={styles.editCancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.editActionButton,
                      styles.editSaveButton,
                      isSaveDisabled && styles.editSaveButtonDisabled,
                      pressed && !isSaveDisabled && styles.editSaveButtonPressed,
                    ]}
                    onPress={handleSaveRename}
                    disabled={isSaveDisabled}
                  >
                    <Text
                      style={[
                        styles.editSaveButtonText,
                        isSaveDisabled && styles.editSaveButtonTextDisabled,
                      ]}
                    >
                      Save
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#0b1329',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1e294b',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: '100%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#111a36',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e294b',
  },
  optionButtonPressed: {
    backgroundColor: '#1b254b',
  },
  optionIcon: {
    fontSize: 18,
  },
  optionButtonText: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  destructiveButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  destructiveButtonPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  destructiveIcon: {
    // optional adjustments
  },
  destructiveButtonText: {
    color: '#f87171',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: 'transparent',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  // Rename view styles
  editHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: '#070b19',
    borderWidth: 1,
    borderColor: '#1e294b',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15,
    marginBottom: 20,
  },
  editActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  editActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editCancelButton: {
    backgroundColor: '#111a36',
    borderColor: '#1e294b',
    marginRight: 10,
  },
  editCancelButtonPressed: {
    backgroundColor: '#1b254b',
  },
  editSaveButton: {
    backgroundColor: '#6366f1',
    borderColor: '#818cf8',
    marginLeft: 10,
  },
  editSaveButtonPressed: {
    backgroundColor: '#4f46e5',
  },
  editSaveButtonDisabled: {
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
    borderColor: 'rgba(129, 140, 248, 0.5)',
    opacity: 0.5,
  },
  editCancelButtonText: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '600',
  },
  editSaveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  editSaveButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
