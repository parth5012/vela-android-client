import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';

interface MessageOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onDownloadMd: () => void;
  onRegenerate: () => void;
  onToggleRaw: () => void;
  onBranch: () => void;
  onCopyCodeBlocks: () => void;
  onShowInfo: () => void;
  isRaw: boolean;
}

export default function MessageOptionsModal({
  visible,
  onClose,
  onDownloadMd,
  onRegenerate,
  onToggleRaw,
  onBranch,
  onCopyCodeBlocks,
  onShowInfo,
  isRaw,
}: MessageOptionsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={() => {}}>
          <View style={styles.dragHandle} />
          <Text style={styles.title}>Message Options</Text>

          <Pressable
            style={({ pressed }) => [
              styles.optionButton,
              pressed && styles.optionButtonPressed,
            ]}
            onPress={() => { onDownloadMd(); onClose(); }}
          >
            <Text style={styles.optionIcon}>📄</Text>
            <Text style={styles.optionButtonText}>Download as MD</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.optionButton,
              pressed && styles.optionButtonPressed,
            ]}
            onPress={() => { onRegenerate(); onClose(); }}
          >
            <Text style={styles.optionIcon}>🔄</Text>
            <Text style={styles.optionButtonText}>Regenerate Response</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.optionButton,
              pressed && styles.optionButtonPressed,
            ]}
            onPress={() => { onToggleRaw(); onClose(); }}
          >
            <Text style={styles.optionIcon}>👁️</Text>
            <Text style={styles.optionButtonText}>
              {isRaw ? 'Show Rendered Markdown' : 'Show Raw Markdown'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.optionButton,
              pressed && styles.optionButtonPressed,
            ]}
            onPress={() => { onBranch(); onClose(); }}
          >
            <Text style={styles.optionIcon}>🌿</Text>
            <Text style={styles.optionButtonText}>Branch Conversation</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.optionButton,
              pressed && styles.optionButtonPressed,
            ]}
            onPress={() => { onCopyCodeBlocks(); onClose(); }}
          >
            <Text style={styles.optionIcon}>💻</Text>
            <Text style={styles.optionButtonText}>Copy Code Blocks Only</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.optionButton,
              pressed && styles.optionButtonPressed,
            ]}
            onPress={() => { onShowInfo(); onClose(); }}
          >
            <Text style={styles.optionIcon}>ℹ️</Text>
            <Text style={styles.optionButtonText}>Response Info</Text>
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
        </Pressable>
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
});
