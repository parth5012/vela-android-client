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
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Message Options</Text>

          <Pressable style={styles.optionButton} onPress={() => { onDownloadMd(); onClose(); }}>
            <Text style={styles.optionIcon}>📄</Text>
            <Text style={styles.optionText}>Download as MD</Text>
          </Pressable>

          <Pressable style={styles.optionButton} onPress={() => { onRegenerate(); onClose(); }}>
            <Text style={styles.optionIcon}>🔄</Text>
            <Text style={styles.optionText}>Regenerate Response</Text>
          </Pressable>

          <Pressable style={styles.optionButton} onPress={() => { onToggleRaw(); onClose(); }}>
            <Text style={styles.optionIcon}>👁️</Text>
            <Text style={styles.optionText}>{isRaw ? 'Show Rendered Markdown' : 'Show Raw Markdown'}</Text>
          </Pressable>

          <Pressable style={styles.optionButton} onPress={() => { onBranch(); onClose(); }}>
            <Text style={styles.optionIcon}>🌿</Text>
            <Text style={styles.optionText}>Branch Conversation</Text>
          </Pressable>

          <Pressable style={styles.optionButton} onPress={() => { onCopyCodeBlocks(); onClose(); }}>
            <Text style={styles.optionIcon}>💻</Text>
            <Text style={styles.optionText}>Copy Code Blocks Only</Text>
          </Pressable>

          <Pressable style={styles.optionButton} onPress={() => { onShowInfo(); onClose(); }}>
            <Text style={styles.optionIcon}>ℹ️</Text>
            <Text style={styles.optionText}>Response Info</Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#0b1329',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e294b',
    padding: 20,
    width: '85%',
    maxWidth: 320,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#111a36',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e294b',
  },
  optionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  optionText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
});
