# Client UX & Personalization Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement new themes, custom accent colors, copy-to-clipboard code block actions, dynamic agent persona headers, typing indicators, custom Suggestion Starter cards manager, and a dedicated, formatted UI block for skill execution JSON outputs with newline separating space.

**Architecture:** Extend the Zustand config store to hold custom suggestions, update the theme configuration file, construct custom Markdown rendering rules in `RichText.tsx`, and enhance segment rendering in `index.tsx` to handle the formatted skill JSON component and dynamic styling.

**Tech Stack:** React Native, Expo, Zustand, react-native-markdown-display, expo-clipboard

---

### Task 1: Extend Theme Utility

**Files:**
- Modify: `client/utils/theme.ts`

- [ ] **Step 1: Write implementation code for theme extensions**
  Update `client/utils/theme.ts` to define the new themes (`nordic`, `dracula`, `oled`) and new accent colors (`violet`, `pink`, `orange`, `blue`).

  Code to replace in `client/utils/theme.ts`:
  ```typescript
  export const ACCENT_COLORS = {
    indigo: '#6366f1',
    emerald: '#10b981',
    rose: '#f43f5e',
    amber: '#f59e0b',
    violet: '#8b5cf6',
    pink: '#ec4899',
    orange: '#f97316',
    blue: '#3b82f6',
  };

  export const THEME_COLORS = {
    deep: {
      background: '#09090b',
      card: '#18181b',
      border: '#27272a',
      text: '#f4f4f5',
      textMuted: '#a1a1aa',
      textDark: '#71717a',
      bubbleUser: '#18181b',
      bubbleUserBorder: '#27272a',
      bubbleAssistant: 'rgba(99, 102, 241, 0.05)',
      bubbleAssistantBorder: 'rgba(99, 102, 241, 0.2)',
    },
    slate: {
      background: '#0f172a',
      card: '#1e293b',
      border: '#334155',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      textDark: '#64748b',
      bubbleUser: '#1e293b',
      bubbleUserBorder: '#334155',
      bubbleAssistant: 'rgba(99, 102, 241, 0.05)',
      bubbleAssistantBorder: 'rgba(99, 102, 241, 0.2)',
    },
    cyberpunk: {
      background: '#080015',
      card: '#14002c',
      border: '#f59e0b',
      text: '#00ffcc',
      textMuted: '#ff00ff',
      textDark: '#8b5cf6',
      bubbleUser: '#14002c',
      bubbleUserBorder: '#ff00ff',
      bubbleAssistant: 'rgba(0, 255, 204, 0.05)',
      bubbleAssistantBorder: 'rgba(0, 255, 204, 0.2)',
    },
    oled: {
      background: '#000000',
      card: '#09090b',
      border: '#18181b',
      text: '#f4f4f5',
      textMuted: '#a1a1aa',
      textDark: '#71717a',
      bubbleUser: '#09090b',
      bubbleUserBorder: '#18181b',
      bubbleAssistant: 'rgba(99, 102, 241, 0.03)',
      bubbleAssistantBorder: 'rgba(99, 102, 241, 0.15)',
    },
    dracula: {
      background: '#282a36',
      card: '#44475a',
      border: '#6272a4',
      text: '#f8f8f2',
      textMuted: '#ff79c6',
      textDark: '#8be9fd',
      bubbleUser: '#44475a',
      bubbleUserBorder: '#6272a4',
      bubbleAssistant: 'rgba(189, 147, 249, 0.05)',
      bubbleAssistantBorder: 'rgba(189, 147, 249, 0.2)',
    },
    nordic: {
      background: '#2e3440',
      card: '#3b4252',
      border: '#4c566a',
      text: '#d8dee9',
      textMuted: '#88c0d0',
      textDark: '#81a1c1',
      bubbleUser: '#3b4252',
      bubbleUserBorder: '#4c566a',
      bubbleAssistant: 'rgba(136, 192, 208, 0.05)',
      bubbleAssistantBorder: 'rgba(136, 192, 208, 0.2)',
    },
  };
  ```

- [ ] **Step 2: Commit theme extensions**
  Run:
  ```bash
  git add client/utils/theme.ts
  git commit -m "feat: add oled, dracula, nordic themes and new accent colors"
  ```

---

### Task 2: Extend Configuration Store

**Files:**
- Modify: `client/store/useConfigStore.ts`
- Test: `client/__tests__/useConfigStore.test.ts`

- [ ] **Step 1: Update type definitions and default values in the config store**
  Open `client/store/useConfigStore.ts` and modify the state interface and setters to support the new theme types, accent types, and suggestion starters list.

  Replace the `ConfigState` interface with:
  ```typescript
  export interface SuggestionStarter {
    label: string;
    text: string;
    persona: string;
  }

  interface ConfigState {
    apiUrl: string;
    apiKey: string;
    isConfigured: boolean;
    hasHydrated: boolean;
    setConfig: (url: string, key: string) => void;
    clearConfig: () => void;
    setHasHydrated: (val: boolean) => void;
    theme: 'deep' | 'slate' | 'cyberpunk' | 'nordic' | 'dracula' | 'oled';
    fontSize: 'small' | 'medium' | 'large';
    accentColor: 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' | 'pink' | 'orange' | 'blue';
    systemPrompt: string;
    temperature: number;
    modelName: string;
    defaultPersona: string;
    userName: string;
    suggestionStarters: SuggestionStarter[];
    setTheme: (theme: 'deep' | 'slate' | 'cyberpunk' | 'nordic' | 'dracula' | 'oled') => void;
    setFontSize: (size: 'small' | 'medium' | 'large') => void;
    setAccentColor: (color: 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' | 'pink' | 'orange' | 'blue') => void;
    setSystemPrompt: (prompt: string) => void;
    setTemperature: (temp: number) => void;
    setModelName: (model: string) => void;
    setDefaultPersona: (persona: string) => void;
    setUserName: (name: string) => void;
    setSuggestionStarters: (starters: SuggestionStarter[]) => void;
  }
  ```

  And add default values and setter implementation:
  ```typescript
      theme: 'deep',
      fontSize: 'medium',
      accentColor: 'indigo',
      systemPrompt: 'You are an autonomous research agent.',
      temperature: 0.7,
      modelName: 'gemini-1.5-pro',
      defaultPersona: 'personal assistant',
      userName: 'Parth',
      suggestionStarters: [
        { label: '👩‍🏫 Teach Concept', text: 'Teach me the intuition behind binary search and trace an example', persona: 'teacher' },
        { label: '📊 Data Analyst', text: 'Analyze the key features of the 2026 FIFA World Cup matches', persona: 'analyst' },
        { label: '✍️ Prompt Architect', text: 'Help me draft a detailed system prompt for a weather assistant bot', persona: 'prompt builder' }
      ],
      setConfig: (url, key) => set({ apiUrl: url, apiKey: key, isConfigured: true }),
      clearConfig: () =>
        set({
          apiUrl: '',
          apiKey: '',
          isConfigured: false,
          theme: 'deep',
          fontSize: 'medium',
          accentColor: 'indigo',
          systemPrompt: 'You are an autonomous research agent.',
          temperature: 0.7,
          modelName: 'gemini-1.5-pro',
          defaultPersona: 'personal assistant',
          userName: 'Parth',
          suggestionStarters: [
            { label: '👩‍🏫 Teach Concept', text: 'Teach me the intuition behind binary search and trace an example', persona: 'teacher' },
            { label: '📊 Data Analyst', text: 'Analyze the key features of the 2026 FIFA World Cup matches', persona: 'analyst' },
            { label: '✍️ Prompt Architect', text: 'Help me draft a detailed system prompt for a weather assistant bot', persona: 'prompt builder' }
          ],
        }),
      setHasHydrated: (val) => set({ hasHydrated: val }),
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
      setTemperature: (temperature) => set({ temperature }),
      setModelName: (modelName) => set({ modelName }),
      setDefaultPersona: (defaultPersona) => set({ defaultPersona }),
      setUserName: (userName) => set({ userName }),
      setSuggestionStarters: (suggestionStarters) => set({ suggestionStarters }),
  ```

- [ ] **Step 2: Add unit tests for suggestion starters in config store**
  Open `client/__tests__/useConfigStore.test.ts` and add tests to verify the `suggestionStarters` state and `setSuggestionStarters` modifier.

  ```typescript
    it('should have default suggestion starters', () => {
      const state = useConfigStore.getState();
      expect(state.suggestionStarters.length).toBe(3);
      expect(state.suggestionStarters[0].label).toBe('👩‍🏫 Teach Concept');
    });

    it('should update suggestion starters correctly', () => {
      useConfigStore.getState().setSuggestionStarters([
        { label: 'Test Label', text: 'Test text', persona: 'teacher' }
      ]);
      expect(useConfigStore.getState().suggestionStarters.length).toBe(1);
      expect(useConfigStore.getState().suggestionStarters[0].label).toBe('Test Label');
    });
  ```

- [ ] **Step 3: Run config store tests**
  Run: `npm test __tests__/useConfigStore.test.ts`
  Expected: PASS

- [ ] **Step 4: Commit config store additions**
  Run:
  ```bash
  git add client/store/useConfigStore.ts client/__tests__/useConfigStore.test.ts
  git commit -m "feat: add suggestionStarters and new theme types to useConfigStore"
  ```

---

### Task 3: Rich Code Block Customization

**Files:**
- Modify: `client/components/chat/RichText.tsx`

- [ ] **Step 1: Implement copy action and custom fence/code_block rendering**
  Open `client/components/chat/RichText.tsx` and import `Pressable`, `Text`, `ScrollView`, and `Clipboard` to implement custom Markdown rules.

  Add imports:
  ```typescript
  import { View, StyleSheet, Platform, Text, Pressable, ScrollView } from 'react-native';
  import * as Clipboard from 'expo-clipboard';
  ```

  Add rules inside `RichText`:
  ```typescript
    const rules = {
      fence: (node: any) => {
        const codeText = node.content || '';
        const lang = node.info || '';
        return (
          <View key={node.key} style={[styles.codeBlockWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.codeBlockHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.codeBlockLang, { color: colors.textDark }]}>
                {lang.toUpperCase() || 'CODE'}
              </Text>
              <Pressable 
                style={({ pressed }) => [styles.codeCopyBtn, pressed && { opacity: 0.7 }]} 
                onPress={async () => {
                  await Clipboard.setStringAsync(codeText);
                }}
              >
                <Text style={{ color: colors.textMuted, fontSize: sizes.sub - 1, fontWeight: 'bold' }}>Copy</Text>
              </Pressable>
            </View>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
              <Text style={[styles.codeText, { color: colors.text, fontSize: sizes.text - 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                {codeText.replace(/\n$/, '')}
              </Text>
            </ScrollView>
          </View>
        );
      },
      code_block: (node: any) => {
        const codeText = node.content || '';
        return (
          <View key={node.key} style={[styles.codeBlockWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.codeBlockHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.codeBlockLang, { color: colors.textDark }]}>CODE</Text>
              <Pressable 
                style={({ pressed }) => [styles.codeCopyBtn, pressed && { opacity: 0.7 }]} 
                onPress={async () => {
                  await Clipboard.setStringAsync(codeText);
                }}
              >
                <Text style={{ color: colors.textMuted, fontSize: sizes.sub - 1, fontWeight: 'bold' }}>Copy</Text>
              </Pressable>
            </View>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
              <Text style={[styles.codeText, { color: colors.text, fontSize: sizes.text - 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                {codeText.replace(/\n$/, '')}
              </Text>
            </ScrollView>
          </View>
        );
      }
    };
  ```

  Pass `rules` prop to the `<Markdown>` component:
  ```typescript
  return <Markdown key={index} rules={rules} style={dynamicMarkdownStyles}>{segment.content}</Markdown>;
  ```

  And define the styles at the bottom:
  ```typescript
    codeBlockWrapper: {
      borderWidth: 1,
      borderRadius: 8,
      marginVertical: 8,
      overflow: 'hidden',
      alignSelf: 'stretch',
    },
    codeBlockHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderBottomWidth: 1,
    },
    codeBlockLang: {
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    codeCopyBtn: {
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    codeText: {
      padding: 12,
      lineHeight: 18,
    },
  ```

- [ ] **Step 2: Run RichText tests**
  Run: `npm test __tests__/RichText.test.tsx`
  Expected: PASS

- [ ] **Step 3: Commit RichText changes**
  Run:
  ```bash
  git add client/components/chat/RichText.tsx
  git commit -m "feat: customize Markdown code blocks with copy-to-clipboard buttons"
  ```

---

### Task 4: Setup Suggestion manager and New Themes Selection

**Files:**
- Modify: `client/app/settings.tsx`

- [ ] **Step 1: Add new theme selections, accent colors, and custom suggestions editor**
  Open `client/app/settings.tsx`. Update the theme mapping options list to include `nordic`, `dracula`, and `oled`.
  Define new state hooks for the Suggestion Creator form:
  ```typescript
    const {
      // existing
      suggestionStarters,
      setSuggestionStarters,
    } = useConfigStore();
    
    const [newStarterLabel, setNewStarterLabel] = useState('');
    const [newStarterText, setNewStarterText] = useState('');
    const [newStarterPersona, setNewStarterPersona] = useState('personal assistant');
  ```

  Update the App Theme selectors:
  ```typescript
  {(['deep', 'slate', 'cyberpunk', 'nordic', 'dracula', 'oled'] as const).map((t) => {
  ```

  Add the custom suggestions manager UI section in settings template inside the `scrollView` (above the Danger Zone):
  ```tsx
            {/* Custom Suggestions Manager */}
            <View style={[styles.controlGroup, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20, marginTop: 20 }]}>
              <Text style={[styles.label, { color: colors.textMuted, fontSize: sizes.sub }]}>Suggestion Starters</Text>
              
              <View style={{ gap: 8, marginTop: 8 }}>
                {suggestionStarters.map((starter, sIdx) => (
                  <View key={sIdx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ color: colors.text, fontSize: sizes.text - 1, fontWeight: 'bold' }}>{starter.label}</Text>
                      <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: sizes.sub }}>{starter.text}</Text>
                    </View>
                    <Pressable 
                      onPress={() => {
                        const updated = suggestionStarters.filter((_, idx) => idx !== sIdx);
                        setSuggestionStarters(updated);
                      }}
                      style={{ padding: 4 }}
                    >
                      <Text style={{ color: '#ef4444', fontSize: sizes.sub, fontWeight: 'bold' }}>Delete</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              
              <View style={{ marginTop: 12, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <Text style={{ color: colors.text, fontSize: sizes.text - 1, fontWeight: 'bold', marginBottom: 8 }}>Add New Suggestion</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, fontSize: sizes.text - 1, marginBottom: 8, height: 36, paddingVertical: 6 }]}
                  placeholder="Label (e.g. 📊 Data Analyst)"
                  placeholderTextColor={colors.textDark}
                  value={newStarterLabel}
                  onChangeText={setNewStarterLabel}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, fontSize: sizes.text - 1, marginBottom: 8, height: 36, paddingVertical: 6 }]}
                  placeholder="Prompt text"
                  placeholderTextColor={colors.textDark}
                  value={newStarterText}
                  onChangeText={setNewStarterText}
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {[
                    { id: 'personal assistant', name: 'Assistant' },
                    { id: 'teacher', name: 'Teacher' },
                    { id: 'analyst', name: 'Analyst' },
                    { id: 'prompt builder', name: 'Builder' },
                  ].map(p => (
                    <Pressable
                      key={p.id}
                      onPress={() => setNewStarterPersona(p.id)}
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        borderRadius: 4,
                        borderWidth: 1,
                        borderColor: newStarterPersona === p.id ? accentHex : colors.border,
                        backgroundColor: newStarterPersona === p.id ? accentHex + '20' : colors.background
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: sizes.sub }}>{p.name}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  onPress={() => {
                    if (!newStarterLabel.trim() || !newStarterText.trim()) {
                      Alert.alert('Error', 'Please fill in both the label and prompt text.');
                      return;
                    }
                    const updated = [...suggestionStarters, { label: newStarterLabel.trim(), text: newStarterText.trim(), persona: newStarterPersona }];
                    setSuggestionStarters(updated);
                    setNewStarterLabel('');
                    setNewStarterText('');
                  }}
                  style={{ backgroundColor: accentHex, padding: 8, borderRadius: 6, alignItems: 'center' }}
                >
                  <Text style={{ color: '#ffffff', fontSize: sizes.sub, fontWeight: 'bold' }}>Add Suggestion</Text>
                </Pressable>
              </View>
            </View>
  ```

- [ ] **Step 2: Run settings tests**
  Run: `npm test __tests__/setup.test.tsx`
  Expected: PASS

- [ ] **Step 3: Commit settings upgrades**
  Run:
  ```bash
  git add client/app/settings.tsx
  git commit -m "feat: add suggestion starters editor and new themes to settings screen"
  ```

---

### Task 5: Chat UI, Dynamic Headers & Custom Skill JSON Rendering

**Files:**
- Modify: `client/app/index.tsx`

- [ ] **Step 1: Read custom suggestions and render dynamic headers**
  Open `client/app/index.tsx`.
  Add `suggestionStarters` to the config store hook variables:
  ```typescript
  const { apiUrl, apiKey, theme, fontSize, accentColor, modelName, defaultPersona, userName, suggestionStarters } = useConfigStore();
  ```

  Use `suggestionStarters` inside the welcome screen template loop:
  ```tsx
  {suggestionStarters.map((item, idx) => (
  ```

  Render dynamic avatar icon and persona header in the message bubble sender label section:
  ```tsx
  // Inside renderItem:
      const activeThread = threads.find((t) => t.id === activeThreadId);
      const threadPersonaId = activeThread?.persona || 'personal assistant';
      const currentPersona = personas.find(p => p.id === threadPersonaId);
  ```
  Replace `<Text style={[styles.senderLabel...` inside `index.tsx`:
  ```tsx
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: sizes.sub + 2, marginRight: 6 }}>
                  {isUser ? '👤' : (currentPersona?.icon || '🤖')}
                </Text>
                <Text style={[styles.senderLabel, { color: colors.textDark, fontSize: sizes.sub, marginBottom: 0 }]}>
                  {isUser ? 'User' : `Vela Agent (${currentPersona?.name || 'Personal Assistant'})`}
                </Text>
              </View>
  ```

- [ ] **Step 2: Add custom Skill JSON component and separator spacing**
  Write a custom `renderSkillJson` rendering function inside `ChatScreen` in `index.tsx`:
  ```tsx
    const renderSkillJson = (children: any[], name?: string) => {
      const rawContent = children.map(c => c.content || '').join('');
      let formattedJson = rawContent;
      try {
        const parsed = JSON.parse(rawContent.trim());
        formattedJson = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // Keep raw text
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
    };
  ```

  Update `renderSegment` for `segment.type === 'skill'` to render the new JSON panel component:
  ```tsx
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
            {hasChildren ? (
              segment.type === 'skill' ? (
                renderSkillJson(segment.children, segment.name)
              ) : (
                <View style={{ gap: 4, width: '100%' }}>
                  {segment.children.map((child: any, childIdx: number) => renderSegment(child, childIdx))}
                </View>
              )
            ) : isThoughtOrIntent ? (
              null
            ) : (
              <Text style={[styles.rawText, { color: colors.text, fontSize: sizes.sub, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                {segment.type === 'skill' ? '(Executing skill...)' : '(Executing...)'}
              </Text>
            )}
          </CollapsibleBlock>
  ```

  Update the main segment array rendering mapping (line 424) to insert the newline separator `<View style={{ height: sizes.text }} />` if a skill block is followed by another segment (agent text response):
  ```tsx
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
              </View>
  ```

- [ ] **Step 3: Add pulsing typing indicator during streaming**
  Inside `index.tsx`, when `isStreaming` is active for the current message, render three pulsing typing indicator dots:
  ```tsx
                {!isUser && isStreaming && activeMessages[activeMessages.length - 1]?.id === item.id && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 }}>
                    <View style={[styles.typingDot, { backgroundColor: accentHex }]} />
                    <View style={[styles.typingDot, { backgroundColor: accentHex, opacity: 0.6 }]} />
                    <View style={[styles.typingDot, { backgroundColor: accentHex, opacity: 0.3 }]} />
                    <Text style={{ color: colors.textDark, fontSize: sizes.sub - 1, marginLeft: 4, fontWeight: 'bold' }}>VELA IS COMPILING...</Text>
                  </View>
                )}
  ```

  Add styling for these new components at the bottom in `StyleSheet`:
  ```typescript
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
  ```

- [ ] **Step 4: Run full test suite**
  Run: `npm test`
  Expected: PASS

- [ ] **Step 5: Force add ignored docs file and commit changes**
  Run:
  ```bash
  git add client/app/index.tsx
  git commit -m "feat: implement dynamic headers, custom skill JSON panel, and typing indicators"
  ```
