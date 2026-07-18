import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBrowserStore } from '../store/useBrowserStore';
import { useConfigStore } from '../store/useConfigStore';
import { THEME_COLORS, FONT_SIZES, ACCENT_COLORS } from '../utils/theme';

export default function BrowserScreen() {
  const router = useRouter();
  const { theme, fontSize, accentColor } = useConfigStore();
  const colors = THEME_COLORS[theme] || THEME_COLORS.deep;
  const sizes = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const accentHex = ACCENT_COLORS[accentColor] || ACCENT_COLORS.indigo;

  const {
    currentUrl,
    canGoBack,
    canGoForward,
    isLoading,
    pageTitle,
    pendingApproval,
    aiStatus,
    navigate,
    approveAction,
    denyAction,
  } = useBrowserStore();

  const [urlInput, setUrlInput] = useState(currentUrl === 'about:blank' ? '' : currentUrl);

  const handleGo = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    navigate(trimmed);
  }, [urlInput, navigate]);

  const handleBack = useCallback(() => {
    const ref = require('../store/useBrowserStore').webViewRef;
    ref.current?.goBack();
  }, []);

  const handleForward = useCallback(() => {
    const ref = require('../store/useBrowserStore').webViewRef;
    ref.current?.goForward();
  }, []);

  const handleRefresh = useCallback(() => {
    const ref = require('../store/useBrowserStore').webViewRef;
    ref.current?.reload();
  }, []);

  const handleClose = useCallback(() => {
    useBrowserStore.getState().setVisible(false);
    router.navigate('/');
  }, [router]);

  // Sync URL bar when navigation changes
  React.useEffect(() => {
    if (currentUrl && currentUrl !== 'about:blank') {
      setUrlInput(currentUrl);
    }
  }, [currentUrl]);

  // Mark visible on mount, hidden on unmount
  React.useEffect(() => {
    useBrowserStore.getState().setVisible(true);
    return () => {
      useBrowserStore.getState().setVisible(false);
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* AI Status Banner */}
      {aiStatus && (
        <View style={[styles.aiBanner, { backgroundColor: accentHex }]}>
          <Text style={styles.aiBannerText} numberOfLines={1}>
            🤖 Vela is browsing... {aiStatus}
          </Text>
        </View>
      )}

      {/* URL Bar */}
      <View style={[styles.urlBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TextInput
          style={[styles.urlInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          value={urlInput}
          onChangeText={setUrlInput}
          onSubmitEditing={handleGo}
          placeholder="Enter URL..."
          placeholderTextColor={colors.textDark}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          selectTextOnFocus
        />
        <Pressable onPress={handleGo} style={[styles.goButton, { backgroundColor: accentHex }]}>
          <Text style={styles.goButtonText}>Go</Text>
        </Pressable>
      </View>

      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={handleBack}
          disabled={!canGoBack}
          style={[styles.toolbarButton, !canGoBack && styles.toolbarButtonDisabled]}
        >
          <Text style={[styles.toolbarButtonText, { color: canGoBack ? colors.text : colors.textDark }]}>◀</Text>
        </Pressable>

        <Pressable
          onPress={handleForward}
          disabled={!canGoForward}
          style={[styles.toolbarButton, !canGoForward && styles.toolbarButtonDisabled]}
        >
          <Text style={[styles.toolbarButtonText, { color: canGoForward ? colors.text : colors.textDark }]}>▶</Text>
        </Pressable>

        <Pressable onPress={handleRefresh} style={styles.toolbarButton}>
          <Text style={[styles.toolbarButtonText, { color: colors.text }]}>⟳</Text>
        </Pressable>

        {isLoading && <ActivityIndicator size="small" color={accentHex} style={{ marginLeft: 8 }} />}

        <View style={styles.titleContainer}>
          <Text style={[styles.pageTitle, { color: colors.textMuted, fontSize: sizes.sub }]} numberOfLines={1}>
            {pageTitle || 'Browser'}
          </Text>
        </View>

        <Pressable onPress={handleClose} style={styles.toolbarButton}>
          <Text style={[styles.toolbarButtonText, { color: colors.textMuted, fontWeight: 'bold' }]}>✕</Text>
        </Pressable>
      </View>

      {/* WebView area — the actual WebView is mounted in _layout.tsx and made visible here */}
      <View style={styles.webviewArea} />

      {/* Approval Modal */}
      {pendingApproval && (
        <Modal transparent animationType="fade" visible>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Action Approval</Text>
              <Text style={[styles.modalDescription, { color: colors.textMuted }]}>
                Vela wants to: {pendingApproval.description}
              </Text>
              <View style={styles.modalButtons}>
                <Pressable
                  onPress={denyAction}
                  style={[styles.modalButton, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>Deny</Text>
                </Pressable>
                <Pressable
                  onPress={approveAction}
                  style={[styles.modalButton, { backgroundColor: accentHex }]}
                >
                  <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>Allow</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  aiBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  aiBannerText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  urlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  urlInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  goButton: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 4,
  },
  toolbarButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toolbarButtonDisabled: {
    opacity: 0.4,
  },
  toolbarButtonText: {
    fontSize: 18,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  pageTitle: {
    fontWeight: '500',
  },
  webviewArea: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
