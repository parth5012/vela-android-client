import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useConfigStore } from '../store/useConfigStore';
import { useChatStore, Message } from '../store/useChatStore';
import RichText from '../components/chat/RichText';
import { streamAgentResponse } from '../utils/sse';

const generateId = (prefix: string) => {
  return prefix + '_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
};

export default function ChatScreen() {
  const { apiUrl, apiKey } = useConfigStore();
  const {
    threads,
    activeThreadId,
    messages,
    isStreaming,
    createThread,
    addMessage,
    appendToken,
    setThreads,
    setStreaming,
  } = useChatStore();

  const [input, setInput] = useState('');

  const activeMessages = activeThreadId ? messages[activeThreadId] || [] : [];
  const reversedMessages = useMemo(() => {
    return [...activeMessages].reverse();
  }, [activeMessages]);

  const handleSend = async () => {
    if (!input.trim() || !activeThreadId || isStreaming) return;
    Keyboard.dismiss();

    const userText = input.trim();
    setInput('');

    const userMsgId = generateId('msg_user');
    const assistantMsgId = generateId('msg_assistant');

    // 1. Add user message
    addMessage(activeThreadId, {
      id: userMsgId,
      role: 'user',
      content: userText,
    });

    // 2. Add empty assistant message for streaming
    addMessage(activeThreadId, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
    });

    setStreaming(true);

    // 3. Connect to backend stream
    await streamAgentResponse(
      apiUrl,
      apiKey,
      activeThreadId,
      userText,
      (chunk) => {
        appendToken(activeThreadId, chunk);
      },
      (newTitle) => {
        setStreaming(false);
        if (newTitle) {
          // Update thread title
          const updatedThreads = threads.map((t) =>
            t.id === activeThreadId ? { ...t, title: newTitle } : t
          );
          setThreads(updatedThreads);
        }
      },
      (error) => {
        setStreaming(false);
        const errMsg = error?.message || (typeof error === 'string' ? error : '') || 'Failed to stream response.';
        appendToken(
          activeThreadId,
          `\n\n⚠️ **Error:** ${errMsg}`
        );
      }
    );
  };


  const handleStartConversation = () => {
    const newId = 'thread_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    createThread('New Conversation', newId);
  };

  if (!activeThreadId || threads.length === 0) {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeLogo}>VELA</Text>
          <Text style={styles.welcomeTitle}>Welcome to Vela</Text>
          <Text style={styles.welcomeSubtitle}>
            Your localized autonomous research agent node. Ready to analyze code, write equations, and execute pipelines.
          </Text>
          <Pressable style={styles.welcomeButton} onPress={handleStartConversation}>
            <Text style={styles.welcomeButtonText}>Start a Conversation</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const renderItem = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={styles.senderLabel}>{isUser ? 'User' : 'Vela Agent'}</Text>
          {item.content === '' && isStreaming && activeMessages[activeMessages.length - 1]?.id === item.id ? (
            <ActivityIndicator size="small" color="#818cf8" style={styles.loader} />
          ) : (
            <RichText content={item.content} />
          )}
        </View>
      </View>
    );
  }, [isStreaming, activeMessages]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.container}
    >
      <FlatList
        data={reversedMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        inverted={true}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={[styles.emptyChat, { transform: [{ scaleY: -1 }] }]}>
            <Text style={styles.emptyText}>Thread initialized. Say hello to get started.</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask a question or request a task..."
          placeholderTextColor="#71717a"
          value={input}
          onChangeText={setInput}
          multiline
          editable={!isStreaming}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            (!input.trim() || isStreaming) && styles.sendButtonDisabled,
            pressed && styles.sendButtonPressed,
          ]}
          onPress={handleSend}
          disabled={!input.trim() || isStreaming}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  welcomeContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  welcomeLogo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#818cf8',
    letterSpacing: 6,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f4f4f5',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  welcomeButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  welcomeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 8,
    alignSelf: 'stretch',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderTopRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderTopLeftRadius: 4,
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  loader: {
    marginVertical: 4,
    alignSelf: 'flex-start',
  },
  emptyChat: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#52525b',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#18181b',
    backgroundColor: '#09090b',
  },
  input: {
    flex: 1,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
    color: '#f4f4f5',
    fontSize: 15,
    marginRight: 12,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    height: 48,
    justifyContent: 'center',
  },
  sendButtonPressed: {
    backgroundColor: '#4f46e5',
  },
  sendButtonDisabled: {
    backgroundColor: '#3f3f46',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
