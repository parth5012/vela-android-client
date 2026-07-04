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
import { useChatStore } from '../../store/useChatStore';

const generateId = () => {
  return 'thread_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
};

export default function DrawerContent() {
  const { threads, activeThreadId, createThread, deleteThread, selectThread } = useChatStore();
  const { apiUrl } = useConfigStore();
  const router = useRouter();
  const navigation = useNavigation<any>();

  const handleNewChat = () => {
    const newId = generateId();
    createThread('New Conversation', newId);
    if (typeof navigation.closeDrawer === 'function') {
      navigation.closeDrawer();
    }
  };

  const handleSelectThread = (id: string) => {
    selectThread(id);
    if (typeof navigation.closeDrawer === 'function') {
      navigation.closeDrawer();
    }
  };

  const handleDeleteThread = (e: any, id: string) => {
    e.stopPropagation();
    deleteThread(id);
  };

  const handleSettings = () => {
    router.navigate('/settings');
    if (typeof navigation.closeDrawer === 'function') {
      navigation.closeDrawer();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>VELA</Text>
        <Text style={styles.nodeStatus} numberOfLines={1}>
          Node: {apiUrl.replace(/^https?:\/\//, '')}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.newChatButton, pressed && styles.newChatButtonPressed]}
        onPress={handleNewChat}
      >
        <Text style={styles.newChatButtonText}>+ New Conversation</Text>
      </Pressable>

      <ScrollView style={styles.threadsContainer} contentContainerStyle={styles.threadsContent}>
        <Text style={styles.sectionTitle}>Recent Chats</Text>
        {threads.length === 0 ? (
          <Text style={styles.emptyText}>No chats yet</Text>
        ) : (
          threads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            return (
              <Pressable
                key={thread.id}
                style={[styles.threadItem, isActive && styles.activeThreadItem]}
                onPress={() => handleSelectThread(thread.id)}
              >
                <Text
                  style={[styles.threadTitle, isActive && styles.activeThreadTitle]}
                  numberOfLines={1}
                >
                  {thread.title}
                </Text>
                <Pressable
                  style={styles.deleteButton}
                  onPress={(e) => handleDeleteThread(e, thread.id)}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
          onPress={handleSettings}
        >
          <Text style={styles.settingsButtonText}>⚙ Settings</Text>
        </Pressable>
      </View>
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
