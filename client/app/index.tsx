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
  Share,
  Alert,
  ScrollView,
  Animated,
  Image,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import MessageOptionsModal from '../components/ui/MessageOptionsModal';
import { useConfigStore } from '../store/useConfigStore';
import { useChatStore, Message } from '../store/useChatStore';
import { THEME_COLORS, FONT_SIZES, ACCENT_COLORS } from '../utils/theme';
import RichText from '../components/chat/RichText';
import { streamAgentResponse } from '../utils/sse';
import CollapsibleBlock from '../components/chat/CollapsibleBlock';
import { parseMessage } from '../utils/messageParser';
import { parseSearchContent, SearchSource } from '../utils/sourceParser';
import { healXmlTags } from '../utils/xmlHealer';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const DEFAULT_PERSONAS = [
  { id: 'personal assistant', name: 'Personal Assistant', description: 'Warm, approachable, and direct general assistant.', icon: '🤖' },
  { id: 'teacher', name: 'Teacher', description: 'Patient, encouraging pedagogical guide that explains concepts clearly.', icon: '👩‍🏫' },
  { id: 'analyst', name: 'Analyst', description: 'Structured, logical, data-driven analyst focusing on facts and risk assessment.', icon: '📊' },
  { id: 'prompt builder', name: 'Prompt Builder', description: 'Specialized assistant designed to help craft, structure, and refine AI agent prompts.', icon: '✍️' }
];

const QUOTES = [
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Science is organized knowledge. Wisdom is organized life.", author: "Immanuel Kant" },
  { text: "The important thing is not to stop questioning.", author: "Albert Einstein" },
  { text: "Research is creating new knowledge.", author: "Neil Armstrong" },
  { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan" },
  { text: "Data! Data! Data! I can't make bricks without clay.", author: "Arthur Conan Doyle" },
  { text: "Knowledge has to be improved, challenged, and increased constantly.", author: "Peter Drucker" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent Van Gogh" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" }
];

const generateId = (prefix: string) => {
  return prefix + '_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
};

function SourceCard({ src, colors, sizes, accentHex }: { src: SearchSource; colors: any; sizes: any; accentHex: string }) {
  const [imgError, setImgError] = React.useState(false);

  const handlePress = async () => {
    try {
      await Linking.openURL(src.url);
    } catch (error) {
      Alert.alert('Error', 'Could not open link in browser.');
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.sourceCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      onPress={handlePress}
    >
      {!imgError ? (
        <Image
          source={{ uri: `https://www.google.com/s2/favicons?sz=64&domain=${src.domain}` }}
          style={styles.sourceFavicon}
          onError={() => setImgError(true)}
        />
      ) : (
        <Text style={[styles.sourceIconEmoji, { fontSize: sizes.sub }]}>🌐</Text>
      )}
      <View style={styles.sourceTextContainer}>
        <Text numberOfLines={1} style={[styles.sourceTitle, { color: colors.text, fontSize: sizes.sub - 1 }]}>
          {src.title}
        </Text>
        <Text numberOfLines={1} style={[styles.sourceDomain, { color: colors.textDark, fontSize: sizes.sub - 3 }]}>
          {src.domain}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ChatScreen() {
  const { apiUrl, apiKey, theme, fontSize, accentColor, modelName, defaultPersona, userName, suggestionStarters } = useConfigStore();
  const colors = THEME_COLORS[theme] || THEME_COLORS.deep;
  const sizes = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const accentHex = ACCENT_COLORS[accentColor] || ACCENT_COLORS.indigo;
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
    truncateThreadHistory,
    branchThread,
    setThreadPersona,
    setHistory,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [activeMenuMessage, setActiveMenuMessage] = useState<Message | null>(null);
  const [showRawMap, setShowRawMap] = useState<Record<string, boolean>>({});
  const [personas, setPersonas] = useState<any[]>(DEFAULT_PERSONAS);

  // Animated values and references for collapsing persona selector bar
  const personaBarHeight = React.useRef(new Animated.Value(58)).current;
  const lastOffsetY = React.useRef(0);
  const isPersonaBarVisible = React.useRef(true);

  const [welcomeQuote, setWelcomeQuote] = useState(QUOTES[0]);
  const [welcomeGreeting, setWelcomeGreeting] = useState('Hello');
  const [selectedPersona, setSelectedPersona] = useState(defaultPersona || 'personal assistant');

  const pendingTokensRef = React.useRef('');
  const throttleTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const cleanUpThrottleAndHeal = useCallback((threadId: string) => {
    if (throttleTimerRef.current) {
      clearInterval(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    
    // Flush any leftover tokens
    if (pendingTokensRef.current) {
      appendToken(threadId, pendingTokensRef.current);
      pendingTokensRef.current = '';
    }

    // Heal XML tags for the last assistant message
    const threadMsgs = useChatStore.getState().messages[threadId] || [];
    if (threadMsgs.length > 0) {
      const last = threadMsgs[threadMsgs.length - 1];
      if (last.role === 'assistant') {
        const healed = healXmlTags(last.content);
        if (healed !== last.content) {
          const updatedHistory = [...threadMsgs.slice(0, -1), { ...last, content: healed }];
          setHistory(threadId, updatedHistory);
        }
      }
    }
  }, [appendToken, setHistory]);

  const handleScroll = useCallback((event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const diff = currentOffset - lastOffsetY.current;

    // Only collapse if we have scrolled past a small offset threshold
    if (currentOffset > 30) {
      if (diff > 10 && isPersonaBarVisible.current) {
        // Scrolling down (towards older messages) -> Hide persona bar
        isPersonaBarVisible.current = false;
        Animated.timing(personaBarHeight, {
          toValue: 0,
          duration: 180,
          useNativeDriver: false,
        }).start();
      } else if (diff < -10 && !isPersonaBarVisible.current) {
        // Scrolling up (towards newer messages) -> Show persona bar
        isPersonaBarVisible.current = true;
        Animated.timing(personaBarHeight, {
          toValue: 58,
          duration: 180,
          useNativeDriver: false,
        }).start();
      }
    } else if (currentOffset <= 5 && !isPersonaBarVisible.current) {
      // Always show when back at the bottom
      isPersonaBarVisible.current = true;
      Animated.timing(personaBarHeight, {
        toValue: 58,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }

    lastOffsetY.current = currentOffset;
  }, [personaBarHeight]);

  React.useEffect(() => {
    // Select random quote on mount
    const randomIdx = Math.floor(Math.random() * QUOTES.length);
    setWelcomeQuote(QUOTES[randomIdx]);

    // Choose greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) {
      setWelcomeGreeting("Good morning");
    } else if (hour < 17) {
      setWelcomeGreeting("Good afternoon");
    } else {
      setWelcomeGreeting("Good evening");
    }

    setStreaming(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearInterval(throttleTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (apiUrl && apiKey) {
      const fetchPersonas = async () => {
        try {
          const res = await fetch(`${apiUrl}/chat/personas`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          if (res.ok) {
            const data = await res.json();
            const mapped = data.map((p: any) => {
              let icon = '🤖';
              if (p.id === 'teacher') icon = '👩‍🏫';
              else if (p.id === 'analyst') icon = '📊';
              else if (p.id === 'prompt builder') icon = '✍️';
              return { ...p, icon };
            });
            setPersonas(mapped);
          }
        } catch (err) {
          console.error('[fetchPersonas] Failed:', err);
        }
      };
      fetchPersonas();
    }
  }, [apiUrl, apiKey]);

  const activeMessages = activeThreadId ? messages[activeThreadId] || [] : [];
  const reversedMessages = useMemo(() => {
    return [...activeMessages].reverse();
  }, [activeMessages]);

  const handleCopyText = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Success', 'Copied to clipboard');
  }, []);

  const handleShareText = useCallback(async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  const handleDownloadMd = useCallback(async (message: Message) => {
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
  }, []);

  const handleRegenerate = useCallback(async (message: Message) => {
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
        pendingTokensRef.current += chunk;
        if (!throttleTimerRef.current) {
          throttleTimerRef.current = setInterval(() => {
            if (pendingTokensRef.current) {
              appendToken(activeThreadId, pendingTokensRef.current);
              pendingTokensRef.current = '';
            }
          }, 100);
        }
      },
      (newTitle) => {
        setStreaming(false);
        cleanUpThrottleAndHeal(activeThreadId);
        if (newTitle) {
          const updatedThreads = threads.map((t) =>
            t.id === activeThreadId ? { ...t, title: newTitle } : t
          );
          setThreads(updatedThreads);
        }
      },
      (error) => {
        setStreaming(false);
        cleanUpThrottleAndHeal(activeThreadId);
        const errMsg = error?.message || (typeof error === 'string' ? error : '') || 'Failed to stream response.';
        appendToken(activeThreadId, `\n\n⚠️ **Error:** ${errMsg}`);
      }
    );
  }, [
    isStreaming,
    activeThreadId,
    messages,
    apiUrl,
    apiKey,
    threads,
    truncateThreadHistory,
    addMessage,
    setStreaming,
    appendToken,
    setThreads,
    cleanUpThrottleAndHeal,
  ]);

  const handleBranch = useCallback(async (message: Message) => {
    if (!activeThreadId) return;
    const newThreadId = generateUUID();
    await branchThread(activeThreadId, message.id, newThreadId, 'Branched Conversation');
    Alert.alert('Success', 'Branched to a new conversation.');
  }, [activeThreadId, branchThread]);

  const handleCopyCodeBlocks = useCallback(async (text: string) => {
    const codeBlockRegex = /```[\s\S]*?```/g;
    const matches = text.match(codeBlockRegex);
    if (!matches || matches.length === 0) {
      Alert.alert('Info', 'No code blocks found in this message.');
      return;
    }

    const cleanedCodes = matches.map((m) => {
      return m.replace(/^```[a-zA-Z0-9+#-]*\n/, '').replace(/```$/, '');
    }).join('\n\n---\n\n');

    await Clipboard.setStringAsync(cleanedCodes);
    Alert.alert('Success', 'Copied code blocks to clipboard.');
  }, []);

  const handleShowInfo = useCallback((message: Message) => {
    const wordCount = message.content.trim().split(/\s+/).filter(Boolean).length;
    const charCount = message.content.length;
    Alert.alert(
      'Response Metadata',
      `Model: ${modelName || 'gemini-1.5-flash'}\nWords: ${wordCount}\nCharacters: ${charCount}`
    );
  }, [modelName]);

  const toggleRaw = useCallback((msgId: string) => {
    setShowRawMap(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  }, []);

  const renderSkillJson = useCallback((children: any[], name?: string) => {
    const rawContent = children.map(c => c.content || '').join('');
    let formattedJson = rawContent;
    try {
      const parsed = JSON.parse(rawContent.trim());
      formattedJson = JSON.stringify(parsed, null, 2);
    } catch (e) {
      // Keep raw
    }

    return (
      <View style={[styles.skillPanel, { borderColor: accentHex + '40', backgroundColor: accentHex + '08' }]}>
        <View style={[styles.skillHeader, { borderBottomColor: accentHex + '20', backgroundColor: accentHex + '10' }]}>
          <View style={styles.skillBadge}>
            <Text style={{ fontSize: sizes.text - 2, marginRight: 4 }}>🧩</Text>
            <Text style={[styles.skillBadgeText, { color: accentHex, fontSize: sizes.sub - 1, fontWeight: 'bold' }]}>
              SKILL: {(name || 'Skill').toUpperCase()}
            </Text>
          </View>
          <Pressable 
            style={({ pressed }) => [styles.skillCopyBtn, pressed && { opacity: 0.7 }]} 
            onPress={async () => {
              await Clipboard.setStringAsync(rawContent);
              Alert.alert('Copied', 'Skill output JSON copied to clipboard.');
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: sizes.sub - 2, fontWeight: 'bold' }}>Copy Output</Text>
          </Pressable>
        </View>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
          <Text style={[styles.skillBodyText, { color: colors.text, fontSize: sizes.sub, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
            {formattedJson}
          </Text>
        </ScrollView>
      </View>
    );
  }, [colors, sizes, accentHex]);

  const renderItem = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isCompleted = item.content !== '' && (!isStreaming || activeMessages[activeMessages.length - 1]?.id !== item.id);
    const showActionBar = item.role === 'assistant' && isCompleted;

    const activeThread = threads.find((t) => t.id === activeThreadId);
    const threadPersonaId = activeThread?.persona || 'personal assistant';
    const currentPersona = personas.find(p => p.id === threadPersonaId);

    const renderSegment = (segment: any, idx: number): React.ReactNode => {
      if (segment.type === 'text') {
        return (
          <RichText 
            key={idx}
            content={segment.content || ''} 
            theme={theme}
            fontSize={fontSize}
            accentColor={accentColor}
          />
        );
      } else {
        const hasChildren = segment.children && segment.children.length > 0;
        const isThoughtOrIntent = segment.type === 'thought' || segment.type === 'intent';
        return (
          <CollapsibleBlock
            key={idx}
            type={segment.type}
            name={segment.name}
            input={segment.input}
            isClosed={segment.isClosed}
            themeColors={colors}
            themeSizes={sizes}
            accentHex={accentHex}
          >
            {segment.type === 'skill' ? (
              renderSkillJson(segment.children || [], segment.name)
            ) : hasChildren ? (
              <View style={{ gap: 4, width: '100%' }}>
                {segment.children.map((child: any, childIdx: number) => renderSegment(child, childIdx))}
              </View>
            ) : isThoughtOrIntent ? (
              null
            ) : (
              <Text style={[styles.rawText, { color: colors.text, fontSize: sizes.sub, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                {segment.type === 'skill' ? '(Executing skill...)' : '(Executing...)'}
              </Text>
            )}
          </CollapsibleBlock>
        );
      }
    };

    const segments = isUser ? [] : parseMessage(item.content);
    const headerSegments = segments.filter(s => s.type === 'thought' || s.type === 'intent');
    const bubbleContent = segments.filter(s => s.type !== 'thought' && s.type !== 'intent');

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        <View style={{ flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', width: '100%' }}>
          
          {/* Render thoughts uniquely above the main message bubble */}
          {/* Render thought and intent blocks uniquely above the main message bubble */}
          {!isUser && headerSegments.length > 0 && (
            <View style={{ maxWidth: '85%', width: '100%', marginBottom: 6 }}>
              {headerSegments.map((segment, idx) => (
                <CollapsibleBlock
                  key={`${segment.type}-${idx}`}
                  type={segment.type as 'thought' | 'intent'}
                  isClosed={segment.isClosed}
                  themeColors={colors}
                  themeSizes={sizes}
                  accentHex={accentHex}
                >
                  {segment.children && segment.children.length > 0 ? (
                    <View style={{ gap: 4, width: '100%' }}>
                      {segment.children.map((child: any, childIdx: number) => renderSegment(child, childIdx))}
                    </View>
                  ) : null}
                </CollapsibleBlock>
              ))}
            </View>
          )}

          {/* Main Bubble */}
          <View style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            isUser 
              ? { backgroundColor: colors.bubbleUser, borderColor: colors.bubbleUserBorder }
              : { backgroundColor: accentHex + '0a', borderColor: accentHex + '26' }
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: sizes.sub + 2, marginRight: 6 }}>
                {isUser ? '👤' : (currentPersona?.icon || '🤖')}
              </Text>
              <Text style={[styles.senderLabel, { color: colors.textDark, fontSize: sizes.sub, marginBottom: 0 }]}>
                {isUser ? 'User' : `Vela Agent (${currentPersona?.name || 'Personal Assistant'})`}
              </Text>
            </View>

            {showRawMap[item.id] ? (
              <ScrollView style={styles.rawScroll} nestedScrollEnabled={true}>
                <Text style={[styles.rawText, { color: colors.text, fontSize: sizes.text }]}>
                  {item.content}
                </Text>
              </ScrollView>
            ) : item.content === '' && isStreaming && activeMessages[activeMessages.length - 1]?.id === item.id ? (
              <ActivityIndicator size="small" color={accentHex} style={styles.loader} />
            ) : isUser ? (
              <RichText 
                content={item.content} 
                theme={theme}
                fontSize={fontSize}
                accentColor={accentColor}
              />
            ) : (
              <View style={{ gap: 4, width: '100%' }}>
                {bubbleContent.map((segment, idx) => {
                  const node = renderSegment(segment, idx);
                  const isLast = idx === bubbleContent.length - 1;
                  if (segment.type === 'skill' && !isLast) {
                    return (
                      <View key={idx} style={{ width: '100%' }}>
                        {node}
                        <View style={{ height: sizes.text }} />
                      </View>
                    );
                  }
                  return node;
                })}
                {(() => {
                  if (isUser || segments.length === 0) return null;
                  
                  // Filter the already-parsed segments for search tool calls
                  const searchSegments = segments.filter(
                    (s) =>
                      s.type === 'tool_call' &&
                      s.name &&
                      (s.name.toLowerCase().includes('search') || s.name.toLowerCase().includes('google'))
                  );

                  if (searchSegments.length === 0) return null;

                  const lastSearchSegment = searchSegments[searchSegments.length - 1];
                  if (!lastSearchSegment.children || lastSearchSegment.children.length === 0) return null;

                  const rawContent = lastSearchSegment.children.map((c) => c.content || '').join('');
                  const sources = parseSearchContent(rawContent);

                  if (sources.length > 0) {
                    return (
                      <View style={{ width: '100%' }}>
                        <View style={[styles.sourceDivider, { borderTopColor: colors.border }]} />
                        <View style={styles.sourcesHeader}>
                          <Text style={[styles.sourcesHeaderTitle, { color: colors.text, fontSize: sizes.sub - 1 }]}>
                            🌐 Sources Used
                          </Text>
                        </View>
                        <View style={styles.sourcesContainer}>
                          {sources.map((src, srcIdx) => (
                            <SourceCard
                              key={srcIdx}
                              src={src}
                              colors={colors}
                              sizes={sizes}
                              accentHex={accentHex}
                            />
                          ))}
                        </View>
                      </View>
                    );
                  }
                  return null;
                })()}
              </View>
            )}

            {!isUser && isStreaming && activeMessages[activeMessages.length - 1]?.id === item.id && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 }}>
                <View style={[styles.typingDot, { backgroundColor: accentHex }]} />
                <View style={[styles.typingDot, { backgroundColor: accentHex, opacity: 0.6 }]} />
                <View style={[styles.typingDot, { backgroundColor: accentHex, opacity: 0.3 }]} />
                <Text style={{ color: colors.textDark, fontSize: sizes.sub - 1, marginLeft: 4, fontWeight: 'bold' }}>VELA IS COMPILING...</Text>
              </View>
            )}

            {showActionBar && (
              <View style={styles.actionBar}>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  onPress={() => handleCopyText(item.content)}
                >
                  <Text style={[styles.actionBtnText, { color: colors.textDark, fontSize: sizes.sub }]}>Copy</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  onPress={() => handleShareText(item.content)}
                >
                  <Text style={[styles.actionBtnText, { color: colors.textDark, fontSize: sizes.sub }]}>Share</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  onPress={() => setActiveMenuMessage(item)}
                >
                  <Text style={[styles.actionBtnText, { color: colors.textDark, fontSize: sizes.sub }]}>︙</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [
    isStreaming,
    activeMessages,
    colors,
    sizes,
    accentHex,
    theme,
    fontSize,
    accentColor,
    showRawMap,
    handleCopyText,
    handleShareText,
    setActiveMenuMessage,
    threads,
    personas,
    renderSkillJson,
  ]);


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

    const activeThread = threads.find((t) => t.id === activeThreadId);
    const selectedPersona = activeThread?.persona || 'personal assistant';

    // 3. Connect to backend stream
    await streamAgentResponse(
      apiUrl,
      apiKey,
      activeThreadId,
      userText,
      (chunk) => {
        pendingTokensRef.current += chunk;
        if (!throttleTimerRef.current) {
          throttleTimerRef.current = setInterval(() => {
            if (pendingTokensRef.current) {
              appendToken(activeThreadId, pendingTokensRef.current);
              pendingTokensRef.current = '';
            }
          }, 100);
        }
      },
      (newTitle) => {
        setStreaming(false);
        cleanUpThrottleAndHeal(activeThreadId);
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
        cleanUpThrottleAndHeal(activeThreadId);
        const errMsg = error?.message || (typeof error === 'string' ? error : '') || 'Failed to stream response.';
        appendToken(
          activeThreadId,
          `\n\n⚠️ **Error:** ${errMsg}`
        );
      },
      undefined,
      selectedPersona
    );
  };


  const handleSendWelcome = async (textToSend: string, personaId?: string) => {
    if (!textToSend.trim() || isStreaming) return;
    Keyboard.dismiss();

    const newThreadId = generateUUID();
    const persona = personaId || selectedPersona;

    // 1. Create thread in store
    createThread('New Conversation', newThreadId, persona);
    setInput('');

    const userMsgId = generateId('msg_user');
    const assistantMsgId = generateId('msg_assistant');

    // 2. Add user message
    addMessage(newThreadId, {
      id: userMsgId,
      role: 'user',
      content: textToSend.trim(),
    });

    // 3. Add empty assistant message
    addMessage(newThreadId, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
    });

    setStreaming(true);

    // 4. Stream response
    await streamAgentResponse(
      apiUrl,
      apiKey,
      newThreadId,
      textToSend.trim(),
      (chunk) => {
        pendingTokensRef.current += chunk;
        if (!throttleTimerRef.current) {
          throttleTimerRef.current = setInterval(() => {
            if (pendingTokensRef.current) {
              appendToken(newThreadId, pendingTokensRef.current);
              pendingTokensRef.current = '';
            }
          }, 100);
        }
      },
      (newTitle) => {
        setStreaming(false);
        cleanUpThrottleAndHeal(newThreadId);
        if (newTitle) {
          useChatStore.getState().renameThread(newThreadId, newTitle);
        }
      },
      (error) => {
        setStreaming(false);
        cleanUpThrottleAndHeal(newThreadId);
        const errMsg = error?.message || (typeof error === 'string' ? error : '') || 'Failed to stream response.';
        appendToken(
          newThreadId,
          `\n\n⚠️ **Error:** ${errMsg}`
        );
      },
      undefined,
      persona
    );
  };

  const handleSendPress = () => {
    if (activeThreadId) {
      handleSend();
    } else {
      handleSendWelcome(input);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {activeThreadId ? (
        <>
          {/* Horizontal Persona Selector Bar with animated height & right fade-out gradient */}
          <Animated.View style={{ height: personaBarHeight, overflow: 'hidden' }}>
            <View style={[styles.personaBar, { borderBottomColor: colors.border, backgroundColor: colors.background, height: '100%', justifyContent: 'center' }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.personaBarContent}>
                {personas.map((p) => {
                  const activeThread = threads.find((t) => t.id === activeThreadId);
                  const isSelected = (activeThread?.persona || 'personal assistant') === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      style={[
                        styles.personaPill,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        isSelected && { backgroundColor: accentHex, borderColor: accentHex }
                      ]}
                      onPress={() => activeThreadId && setThreadPersona(activeThreadId, p.id)}
                      disabled={isStreaming}
                    >
                      <Text style={[
                        styles.personaPillText, 
                        { color: colors.textMuted, fontSize: sizes.sub },
                        isSelected && { color: '#ffffff', fontWeight: 'bold' }
                      ]}>
                        {p.icon} {p.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Right edge fade-out gradient */}
              <LinearGradient
                colors={['transparent', colors.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.rightFadeGradient}
                pointerEvents="none"
              />
            </View>
          </Animated.View>

          <FlatList
            style={styles.flatList}
            data={reversedMessages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            inverted={true}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={[styles.emptyChat, { transform: [{ scaleY: -1 }] }]}>
                <Text style={[styles.emptyText, { color: colors.textDark, fontSize: sizes.text }]}>
                  Thread initialized. Say hello to get started.
                </Text>
              </View>
            }
          />
        </>
      ) : (
        /* Gemini Landing / Welcome View */
        <ScrollView 
          contentContainerStyle={styles.welcomeScrollContent} 
          style={styles.welcomeScrollView} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.welcomeContent}>
            {/* Header Greeting */}
            <Text style={[styles.welcomeGreeting, { color: colors.text, fontSize: sizes.title + 4 }]}>
              {welcomeGreeting}, <Text style={{ color: accentHex, fontWeight: '800' }}>{userName}</Text>
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textMuted, fontSize: sizes.text }]}>
              How can I help you research today?
            </Text>

            {/* Random Quote */}
            <View style={[styles.quoteContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.quoteText, { color: colors.text }]}>“{welcomeQuote.text}”</Text>
              <Text style={[styles.quoteAuthor, { color: colors.textMuted }]}>— {welcomeQuote.author}</Text>
            </View>

            {/* Suggestion Starter Cards */}
            <Text style={[styles.sectionTitleLabel, { color: colors.text, fontSize: sizes.text }]}>Suggestions</Text>
            <View style={styles.suggestionsContainer}>
              {suggestionStarters.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [
                    styles.suggestionCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => handleSendWelcome(item.text, item.persona)}
                >
                  <Text style={[styles.suggestionText, { color: colors.text, fontSize: sizes.text - 1 }]}>
                    {item.label}: <Text style={{ color: colors.textMuted }}>"{item.text}"</Text>
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Persona Quick Selector */}
            <Text style={[styles.sectionTitleLabel, { color: colors.text, fontSize: sizes.text, marginTop: 12 }]}>
              Choose Persona
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.personaScrollContainer}>
              {personas.map((p) => {
                const isSelected = selectedPersona === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.personaPill,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isSelected && { backgroundColor: accentHex, borderColor: accentHex }
                    ]}
                    onPress={() => setSelectedPersona(p.id)}
                  >
                    <Text style={[
                      styles.personaPillText,
                      { color: colors.textMuted, fontSize: sizes.sub },
                      isSelected && { color: '#ffffff', fontWeight: 'bold' }
                    ]}>
                      {p.icon} {p.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* Unifying Input container at the bottom */}
      <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, fontSize: sizes.text }]}
          placeholder={activeThreadId ? "Ask a question or request a task..." : "Ask Vela anything..."}
          placeholderTextColor={colors.textDark}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!isStreaming}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: accentHex },
            (!input.trim() || isStreaming) && styles.sendButtonDisabled,
            (!input.trim() || isStreaming) && { backgroundColor: colors.border },
            pressed && styles.sendButtonPressed,
            pressed && { backgroundColor: accentHex + 'cc' },
          ]}
          onPress={handleSendPress}
          disabled={!input.trim() || isStreaming}
        >
          <Text style={[styles.sendButtonText, { fontSize: sizes.text }]}>Send</Text>
        </Pressable>
      </View>

      <MessageOptionsModal
        visible={activeMenuMessage !== null}
        onClose={() => setActiveMenuMessage(null)}
        onDownloadMd={() => activeMenuMessage && handleDownloadMd(activeMenuMessage)}
        onRegenerate={() => activeMenuMessage && handleRegenerate(activeMenuMessage)}
        onToggleRaw={() => activeMenuMessage && toggleRaw(activeMenuMessage.id)}
        onBranch={() => activeMenuMessage && handleBranch(activeMenuMessage)}
        onCopyCodeBlocks={() => activeMenuMessage && handleCopyCodeBlocks(activeMenuMessage.content)}
        onShowInfo={() => activeMenuMessage && handleShowInfo(activeMenuMessage)}
        isRaw={activeMenuMessage ? !!showRawMap[activeMenuMessage.id] : false}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  flatList: {
    flex: 1,
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
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
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
    marginBottom: 16,
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
  actionBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  welcomeScrollView: {
    flex: 1,
    width: '100%',
  },
  welcomeScrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  welcomeGreeting: {
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 4,
    textAlign: 'center',
  },
  quoteContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 16,
    width: '100%',
  },
  quoteText: {
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
  },
  quoteAuthor: {
    textAlign: 'right',
    fontSize: 10,
    marginTop: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  sectionTitleLabel: {
    alignSelf: 'flex-start',
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsContainer: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  suggestionCard: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  suggestionText: {
    fontWeight: '600',
    lineHeight: 18,
  },
  personaScrollContainer: {
    gap: 8,
    paddingVertical: 4,
    marginBottom: 20,
  },
  personaBar: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  personaBarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  personaPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  personaPillText: {
    fontWeight: '500',
  },
  rightFadeGradient: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  skillPanel: {
    borderWidth: 1,
    borderRadius: 10,
    marginVertical: 4,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillBadgeText: {
    letterSpacing: 0.5,
  },
  skillCopyBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  skillBodyText: {
    padding: 12,
    lineHeight: 16,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceDivider: {
    borderTopWidth: 1,
    marginTop: 10,
    marginBottom: 8,
    width: '100%',
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sourcesHeaderTitle: {
    fontWeight: 'bold',
  },
  sourcesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: '100%',
    flexGrow: 0,
    flexShrink: 1,
  },
  sourceFavicon: {
    width: 14,
    height: 14,
    marginRight: 6,
    borderRadius: 2,
  },
  sourceIconEmoji: {
    marginRight: 6,
  },
  sourceTextContainer: {
    flexDirection: 'column',
    maxWidth: 160,
  },
  sourceTitle: {
    fontWeight: '500',
  },
  sourceDomain: {
    marginTop: 1,
  },
});

