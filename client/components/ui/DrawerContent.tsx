import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useConfigStore } from '../../store/useConfigStore';
import { useChatStore, Thread } from '../../store/useChatStore';
import ThreadOptionsModal from './ThreadOptionsModal';
import { THEME_COLORS, FONT_SIZES, ACCENT_COLORS } from '../../utils/theme';

const generateId = () => {
  return 'thread_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
};

export default function DrawerContent() {
  const threads = useChatStore((state) => state.threads);
  const activeThreadId = useChatStore((state) => state.activeThreadId);
  const createThread = useChatStore((state) => state.createThread);
  const selectThread = useChatStore((state) => state.selectThread);
  const { apiUrl, theme, fontSize, accentColor } = useConfigStore();
  const router = useRouter();
  const navigation = useNavigation<any>();

  const colors = THEME_COLORS[theme] || THEME_COLORS.deep;
  const sizes = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const accentHex = ACCENT_COLORS[accentColor] || ACCENT_COLORS.indigo;

  const [optionsVisible, setOptionsVisible] = React.useState(false);
  const [selectedThread, setSelectedThread] = React.useState<Thread | null>(null);

  const handleOpenOptions = (thread: Thread) => {
    setSelectedThread(thread);
    setOptionsVisible(true);
  };

  const handleCloseOptions = () => {
    setOptionsVisible(false);
    setSelectedThread(null);
  };

  const handleNewChat = () => {
    const newId = generateId();
    createThread('New Conversation', newId);
    router.navigate('/');
    if (typeof navigation.closeDrawer === 'function') {
      navigation.closeDrawer();
    }
  };

  const handleSelectThread = (id: string) => {
    selectThread(id);
    router.navigate('/');
    if (typeof navigation.closeDrawer === 'function') {
      navigation.closeDrawer();
    }
  };

  const handleSettings = () => {
    router.navigate('/settings');
    if (typeof navigation.closeDrawer === 'function') {
      navigation.closeDrawer();
    }
  };

  const sortedThreads = React.useMemo(() => {
    return [...threads].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      // Fallback to 0 if date is invalid (isNaN)
      const valA = isNaN(timeA) ? 0 : timeA;
      const valB = isNaN(timeB) ? 0 : timeB;
      return valB - valA;
    });
  }, [threads]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable
        style={[styles.header, { borderBottomColor: colors.border }]}
        onPress={() => {
          router.navigate('/');
          if (typeof navigation.closeDrawer === 'function') {
            navigation.closeDrawer();
          }
        }}
      >
        <Text style={[styles.logo, { color: accentHex }]}>VELA</Text>
        <Text style={[styles.nodeStatus, { color: colors.textDark }]} numberOfLines={1}>
          Node: {apiUrl.replace(/^https?:\/\//, '')}
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.newChatButton, 
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed && styles.newChatButtonPressed
        ]}
        onPress={handleNewChat}
      >
        <Text style={[styles.newChatButtonText, { color: colors.text }]}>+ New Conversation</Text>
      </Pressable>

      <ScrollView style={styles.threadsContainer} contentContainerStyle={styles.threadsContent}>
        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Recent Chats</Text>
        {sortedThreads.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textDark }]}>No chats yet</Text>
        ) : (
          sortedThreads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            return (
              <Pressable
                key={thread.id}
                style={[
                  styles.threadItem, 
                  isActive && styles.activeThreadItem,
                  isActive && { backgroundColor: colors.card }
                ]}
                onPress={() => handleSelectThread(thread.id)}
                onLongPress={() => handleOpenOptions(thread)}
                delayLongPress={450}
              >
                <Text
                  style={[
                    styles.threadTitle,
                    { color: colors.textMuted },
                    thread.is_pinned && styles.pinnedThreadTitle,
                    thread.is_pinned && { color: colors.text },
                    isActive && styles.activeThreadTitle,
                    isActive && { color: colors.text }
                  ]}
                  numberOfLines={1}
                >
                  {thread.is_pinned ? '📌 ' : ''}{thread.title}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [
            styles.settingsButton, 
            pressed && styles.settingsButtonPressed, 
            pressed && { backgroundColor: colors.card },
            { marginBottom: 8 }
          ]}
          onPress={() => {
            router.navigate('/');
            if (typeof navigation.closeDrawer === 'function') {
              navigation.closeDrawer();
            }
          }}
        >
          <Text style={[styles.settingsButtonText, { color: colors.textMuted }]}>💬 Chat</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.settingsButton, 
            pressed && styles.settingsButtonPressed,
            pressed && { backgroundColor: colors.card }
          ]}
          onPress={handleSettings}
        >
          <Text style={[styles.settingsButtonText, { color: colors.textMuted }]}>⚙ Settings</Text>
        </Pressable>
      </View>

      <ThreadOptionsModal
        visible={optionsVisible}
        thread={selectedThread}
        onClose={handleCloseOptions}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  logo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#818cf8',
    letterSpacing: 4,
    marginBottom: 4,
  },
  nodeStatus: {
    fontSize: 12,
    color: '#71717a',
  },
  newChatButton: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatButtonPressed: {
    backgroundColor: '#27272a',
  },
  newChatButtonText: {
    color: '#f4f4f5',
    fontWeight: '600',
    fontSize: 14,
  },
  threadsContainer: {
    flex: 1,
  },
  threadsContent: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#3f3f46',
    textAlign: 'center',
    marginTop: 20,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  activeThreadItem: {
    backgroundColor: '#18181b',
  },
  threadTitle: {
    fontSize: 14,
    color: '#a1a1aa',
    flex: 1,
    marginRight: 8,
  },
  pinnedThreadTitle: {
    color: '#e4e4e7',
    fontWeight: '600',
  },
  activeThreadTitle: {
    color: '#f4f4f5',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    color: '#52525b',
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#18181b',
  },
  settingsButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  settingsButtonPressed: {
    backgroundColor: '#18181b',
  },
  settingsButtonText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '500',
  },
});
