# Agent Response Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a message action bar and a 3-dots dropdown menu for agent responses in Vela Client chat, implementing Copy, Share, Download as MD, Regenerate, Toggle Raw, Branch Conversation, Copy Code Blocks, and Response Info.

**Architecture:** We will implement UI rendering in the chat screen component (`client/app/index.tsx`), add actions in Zustand store (`client/store/useChatStore.ts`), write backend sync handlers on the FastAPI server (`Vela/agent/main.py`), and install native Expo modules for Clipboard, FileSystem, and Sharing.

**Tech Stack:** React Native, Expo 57, Zustand, FastAPI, SQLite/PostgreSQL (SQLAlchemy).

---

### Task 1: Install Expo Dependencies

**Files:**
- Modify: `client/package.json`
- Action: Install `expo-clipboard`, `expo-file-system`, and `expo-sharing`

- [ ] **Step 1: Install dependencies**
  Run:
  ```bash
  cd "D:\work\projects\Vela Client\client"
  npx expo install expo-clipboard expo-file-system expo-sharing
  ```
  Expected: Successful installation and updates to `package.json`.

- [ ] **Step 2: Commit package.json changes**
  Run:
  ```bash
  git add package.json package-lock.json
  git commit -m "chore: install expo-clipboard, expo-file-system, expo-sharing"
  ```

---

### Task 2: Implement Backend Sync Endpoints

**Files:**
- Modify: `D:\work\projects\Vela\agent\main.py`
- Action: Add `/chat/threads/branch` and `/chat/threads/{thread_id}/truncate` endpoints.

- [ ] **Step 1: Add endpoints in main.py**
  Add the following imports and models at the top (near other models like `MessagePayload` around line 157):
  ```python
  class BranchPayload(BaseModel):
      parent_thread_id: str
      new_thread_id: str
      upto_message_id: str
      title: str

  class TruncatePayload(BaseModel):
      upto_message_id: str
  ```
  Add the API endpoints before the `@app.get("/oauth/login")` around line 279:
  ```python
  @app.post("/chat/threads/branch", dependencies=[Depends(verify_api_key)])
  def branch_thread(payload: BranchPayload):
      try:
          with get_db_session() as session:
              client = DBClient(session)
              parent_conv = session.query(Conversation).filter_by(id=payload.parent_thread_id).first()
              if not parent_conv:
                  raise HTTPException(status_code=404, detail="Parent thread not found")
              
              new_conv = Conversation(id=payload.new_thread_id, title=payload.title[:255])
              session.add(new_conv)
              session.flush()
              
              experiences = client.get_conversation_history(payload.parent_thread_id)
              target_exp_id = payload.upto_message_id.replace("usr-", "").replace("ast-", "")
              
              for exp in experiences:
                  new_exp = Experience(
                      id=str(uuid.uuid4()),
                      conversation_id=payload.new_thread_id,
                      user_query=exp.user_query,
                      agent_response=exp.agent_response,
                      eval_score=exp.eval_score,
                      eval_reason=exp.eval_reason,
                      created_at=exp.created_at,
                      consolidated=exp.consolidated
                  )
                  session.add(new_exp)
                  if str(exp.id) == target_exp_id:
                      break
              
              session.commit()
              return {"status": "success"}
      except Exception as e:
          raise HTTPException(status_code=500, detail=str(e))

  @app.post("/chat/threads/{thread_id}/truncate", dependencies=[Depends(verify_api_key)])
  def truncate_thread(thread_id: str, payload: TruncatePayload):
      try:
          with get_db_session() as session:
              target_exp_id = payload.upto_message_id.replace("usr-", "").replace("ast-", "")
              target_exp = session.query(Experience).filter_by(id=target_exp_id, conversation_id=thread_id).first()
              if not target_exp:
                  raise HTTPException(status_code=404, detail="Message not found in thread")
              
              session.query(Experience).filter(
                  Experience.conversation_id == thread_id,
                  Experience.created_at >= target_exp.created_at
              ).delete(synchronize_session=False)
              
              session.commit()
              return {"status": "success"}
      except Exception as e:
          raise HTTPException(status_code=500, detail=str(e))
  ```

- [ ] **Step 2: Verify compile of backend**
  Run:
  ```bash
  cd "D:\work\projects\Vela"
  uv run python -m pytest
  ```
  Expected: All tests pass.

- [ ] **Step 3: Commit backend changes**
  Run:
  ```bash
  cd "D:\work\projects\Vela"
  git add agent/main.py
  git commit -m "feat: add branch and truncate endpoints to backend"
  ```

---

### Task 3: Extend Client Zustand Store with Branch & Regenerate Actions

**Files:**
- Modify: `client/store/useChatStore.ts`
- Action: Add store actions `branchThread` and `truncateThreadHistory` to manage local state and trigger backend HTTP calls.

- [ ] **Step 1: Update interface in useChatStore.ts**
  Add definition to `ChatState` interface:
  ```typescript
  branchThread: (parentThreadId: string, uptoMessageId: string, newThreadId: string, title: string) => Promise<void>;
  truncateThreadHistory: (threadId: string, uptoMessageId: string) => Promise<void>;
  ```

- [ ] **Step 2: Implement actions in useChatStore.ts**
  Implement the actions:
  ```typescript
      branchThread: async (parentThreadId, uptoMessageId, newThreadId, title) => {
        const config = useConfigStore.getState();
        if (config.apiUrl && config.apiKey) {
          let formattedUrl = config.apiUrl.trim();
          if (!/^https?:\/\//i.test(formattedUrl)) {
            formattedUrl = 'https://' + formattedUrl;
          }
          formattedUrl = formattedUrl.replace(/\/+$/, '');
          try {
            await fetch(`${formattedUrl}/chat/threads/branch`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${config.apiKey.trim()}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                parent_thread_id: parentThreadId,
                new_thread_id: newThreadId,
                upto_message_id: uptoMessageId,
                title: title,
              }),
            });
          } catch (err) {
            console.error('[branchThread] Failed to branch on backend:', err);
          }
        }

        set((state) => {
          const parentMessages = state.messages[parentThreadId] || [];
          const index = parentMessages.findIndex((m) => m.id === uptoMessageId);
          const branchedMessages = index !== -1 ? parentMessages.slice(0, index + 1) : [...parentMessages];
          
          const newThread = {
            id: newThreadId,
            title,
            updated_at: new Date().toISOString(),
          };

          return {
            threads: [newThread, ...state.threads],
            activeThreadId: newThreadId,
            messages: {
              ...state.messages,
              [newThreadId]: branchedMessages,
            },
          };
        });
      },

      truncateThreadHistory: async (threadId, uptoMessageId) => {
        const config = useConfigStore.getState();
        if (config.apiUrl && config.apiKey) {
          let formattedUrl = config.apiUrl.trim();
          if (!/^https?:\/\//i.test(formattedUrl)) {
            formattedUrl = 'https://' + formattedUrl;
          }
          formattedUrl = formattedUrl.replace(/\/+$/, '');
          try {
            await fetch(`${formattedUrl}/chat/threads/${threadId}/truncate`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${config.apiKey.trim()}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                upto_message_id: uptoMessageId,
              }),
            });
          } catch (err) {
            console.error('[truncateThreadHistory] Failed to truncate on backend:', err);
          }
        }

        set((state) => {
          const current = state.messages[threadId] || [];
          const index = current.findIndex((m) => m.id === uptoMessageId);
          const truncatedMessages = index !== -1 ? current.slice(0, index) : [...current];

          return {
            messages: {
              ...state.messages,
              [threadId]: truncatedMessages,
            },
          };
        });
      },
  ```

- [ ] **Step 3: Update store tests**
  Add unit tests to `client/__tests__/useChatStore.test.ts` to verify local state behavior of `branchThread` and `truncateThreadHistory`.
  Run:
  ```bash
  cd "D:\work\projects\Vela Client\client"
  npm test
  ```
  Expected: PASS.

- [ ] **Step 4: Commit store changes**
  Run:
  ```bash
  git add store/useChatStore.ts __tests__/useChatStore.test.ts
  git commit -m "feat: implement branchThread and truncateThreadHistory actions in Zustand store"
  ```

---

### Task 4: Create Options Dropdown Overlay Component

**Files:**
- Create: `client/components/ui/MessageOptionsModal.tsx`
- Action: Create a modal-based popover overlay representing the 3-dots actions.

- [ ] **Step 1: Create MessageOptionsModal.tsx**
  Implement:
  ```tsx
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
  ```

- [ ] **Step 2: Commit component**
  Run:
  ```bash
  git add components/ui/MessageOptionsModal.tsx
  git commit -m "feat: create MessageOptionsModal component"
  ```

---

### Task 5: Implement Response Actions and render UI in ChatScreen

**Files:**
- Modify: `client/app/index.tsx`
- Action: Connect UI buttons under assistant messages, handle action implementations (copy, share, download, regenerate, toggle raw, branch, code blocks, info).

- [ ] **Step 1: Add Imports**
  Add the following imports at the top of `client/app/index.tsx`:
  ```typescript
  import * as Clipboard from 'expo-clipboard';
  import * as FileSystem from 'expo-file-system';
  import * as Sharing from 'expo-sharing';
  import { Share, Alert, ScrollView } from 'react-native';
  import MessageOptionsModal from '../components/ui/MessageOptionsModal';
  ```

- [ ] **Step 2: Add Screen States & Action Handlers**
  Inside `ChatScreen` component:
  ```typescript
  const [activeMenuMessage, setActiveMenuMessage] = useState<Message | null>(null);
  const [showRawMap, setShowRawMap] = useState<Record<string, boolean>>({});

  const { truncateThreadHistory, branchThread } = useChatStore();

  const handleCopyText = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Success', 'Copied to clipboard');
  };

  const handleShareText = async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDownloadMd = async (message: Message) => {
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `vela-response-${message.id}-${dateStr}.md`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const mdContent = `# Vela Agent Response\n*Date: ${new Date().toLocaleString()}*\n\n${message.content}`;

      await FileSystem.writeAsStringAsync(fileUri, mdContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/markdown', dialogTitle: 'Download Response' });
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save markdown file.');
    }
  };

  const handleRegenerate = async (message: Message) => {
    if (isStreaming || !activeThreadId) return;

    const threadMsgs = messages[activeThreadId] || [];
    const index = threadMsgs.findIndex((m) => m.id === message.id);
    if (index === -1) return;

    // Find preceding user query
    let userPrompt = '';
    for (let i = index - 1; i >= 0; i--) {
      if (threadMsgs[i].role === 'user') {
        userPrompt = threadMsgs[i].content;
        break;
      }
    }

    if (!userPrompt) {
      Alert.alert('Error', 'No preceding query found to regenerate.');
      return;
    }

    // Truncate thread history up to the assistant message
    await truncateThreadHistory(activeThreadId, message.id);

    // Add empty message for streaming
    const assistantMsgId = generateId('msg_assistant');
    addMessage(activeThreadId, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
    });

    setStreaming(true);

    // Call SSE API again
    await streamAgentResponse(
      apiUrl,
      apiKey,
      activeThreadId,
      userPrompt,
      (chunk) => {
        appendToken(activeThreadId, chunk);
      },
      (newTitle) => {
        setStreaming(false);
        if (newTitle) {
          const updatedThreads = threads.map((t) =>
            t.id === activeThreadId ? { ...t, title: newTitle } : t
          );
          setThreads(updatedThreads);
        }
      },
      (error) => {
        setStreaming(false);
        const errMsg = error?.message || (typeof error === 'string' ? error : '') || 'Failed to stream response.';
        appendToken(activeThreadId, `\n\n⚠️ **Error:** ${errMsg}`);
      }
    );
  };

  const handleBranch = async (message: Message) => {
    if (!activeThreadId) return;
    const newThreadId = 'thread_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    await branchThread(activeThreadId, message.id, newThreadId, 'Branched Conversation');
    Alert.alert('Success', 'Branched to a new conversation.');
  };

  const handleCopyCodeBlocks = async (text: string) => {
    const codeBlockRegex = /```[\s\S]*?```/g;
    const matches = text.match(codeBlockRegex);
    if (!matches || matches.length === 0) {
      Alert.alert('Info', 'No code blocks found in this message.');
      return;
    }

    const cleanedCodes = matches.map((m) => {
      // remove surrounding ``` and any language headers
      return m.replace(/^```[a-zA-Z0-9+#-]*\n/, '').replace(/```$/, '');
    }).join('\n\n---\n\n');

    await Clipboard.setStringAsync(cleanedCodes);
    Alert.alert('Success', 'Copied code blocks to clipboard.');
  };

  const handleShowInfo = (message: Message) => {
    const wordCount = message.content.trim().split(/\s+/).filter(Boolean).length;
    const charCount = message.content.length;
    Alert.alert(
      'Response Metadata',
      `Model: ${modelName || 'gemini-1.5-flash'}\nWords: ${wordCount}\nCharacters: ${charCount}`
    );
  };

  const toggleRaw = (msgId: string) => {
    setShowRawMap(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };
  ```

- [ ] **Step 3: Modify Message Bubble Rendering**
  Modify `renderItem` inside `client/app/index.tsx` (around lines 52-79):
  ```tsx
  const renderItem = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isRaw = showRawMap[item.id] || false;
    const isLastAssistantMessage = !isUser && (!isStreaming || activeMessages[activeMessages.length - 1]?.id !== item.id);

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        <View style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          isUser 
            ? { backgroundColor: colors.bubbleUser, borderColor: colors.bubbleUserBorder }
            : { backgroundColor: accentHex + '0a', borderColor: accentHex + '26' }
        ]}>
          <Text style={[styles.senderLabel, { color: colors.textDark, fontSize: sizes.sub }]}>
            {isUser ? 'User' : 'Vela Agent'}
          </Text>
          {item.content === '' && isStreaming && activeMessages[activeMessages.length - 1]?.id === item.id ? (
            <ActivityIndicator size="small" color={accentHex} style={styles.loader} />
          ) : (
            isRaw ? (
              <ScrollView style={styles.rawScroll}>
                <Text style={[styles.rawText, { color: colors.text, fontSize: sizes.text }]}>
                  {item.content}
                </Text>
              </ScrollView>
            ) : (
              <RichText 
                content={item.content} 
                theme={theme}
                fontSize={fontSize}
                accentColor={accentColor}
              />
            )
          )}

          {isLastAssistantMessage && (
            <View style={styles.actionBar}>
              <Pressable style={styles.actionBtn} onPress={() => handleCopyText(item.content)}>
                <Text style={styles.actionBtnText}>📋 Copy</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => handleShareText(item.content)}>
                <Text style={styles.actionBtnText}>📤 Share</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => setActiveMenuMessage(item)}>
                <Text style={styles.actionBtnText}>︙ More</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  }, [isStreaming, activeMessages, colors, sizes, accentHex, theme, fontSize, accentColor, showRawMap]);
  ```

- [ ] **Step 4: Render Options Modal at the bottom of index.tsx**
  Add the modal invocation at the end of the root View in `client/app/index.tsx`:
  ```tsx
        <MessageOptionsModal
          visible={activeMenuMessage !== null}
          onClose={() => setActiveMenuMessage(null)}
          onDownloadMd={() => activeMenuMessage && handleDownloadMd(activeMenuMessage)}
          onRegenerate={() => activeMenuMessage && handleRegenerate(activeMenuMessage)}
          onToggleRaw={() => activeMenuMessage && toggleRaw(activeMenuMessage.id)}
          onBranch={() => activeMenuMessage && handleBranch(activeMenuMessage)}
          onCopyCodeBlocks={() => activeMenuMessage && handleCopyCodeBlocks(activeMenuMessage.content)}
          onShowInfo={() => activeMenuMessage && handleShowInfo(activeMenuMessage)}
          isRaw={activeMenuMessage ? (showRawMap[activeMenuMessage.id] || false) : false}
        />
  ```

- [ ] **Step 5: Add Styles for Action Bar**
  Add these stylesheet entries to `styles` in `client/app/index.tsx`:
  ```typescript
    actionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.05)',
      gap: 12,
    },
    actionBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: '500',
      color: '#a1a1aa',
    },
    rawScroll: {
      maxHeight: 200,
    },
    rawText: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
  ```

- [ ] **Step 6: Run existing tests and compile**
  Run:
  ```bash
  cd "D:\work\projects\Vela Client\client"
  npm test
  ```
  Expected: PASS.

- [ ] **Step 7: Commit Changes**
  Run:
  ```bash
  git add app/index.tsx
  git commit -m "feat: render action bar and MessageOptionsModal in ChatScreen"
  ```
