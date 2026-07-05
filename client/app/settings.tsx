import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useConfigStore } from '../store/useConfigStore';
import { useChatStore } from '../store/useChatStore';
import { syncHistoryWithBackend } from '../utils/history';

const ACCENT_COLORS = {
  indigo: '#6366f1',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
};

const PRESET_MODELS = ['gemini-1.5-pro', 'gemini-1.5-flash', 'claude-3-5-sonnet', 'gpt-4o'];

export default function SettingsScreen() {
  const {
    apiUrl: storedUrl,
    apiKey: storedKey,
    setConfig,
    clearConfig,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    accentColor,
    setAccentColor,
    systemPrompt,
    setSystemPrompt,
    temperature,
    setTemperature,
    modelName,
    setModelName,
  } = useConfigStore();
  const { clearStore } = useChatStore();
  const router = useRouter();

  const [apiUrl, setApiUrl] = useState(storedUrl);
  const [apiKey, setApiKey] = useState(storedKey);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isMounted = React.useRef(true);
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSave = async () => {
    Keyboard.dismiss();
    if (isMounted.current) setSuccess(false);

    if (!apiUrl.trim()) {
      if (isMounted.current) setError('API URL is required');
      return;
    }
    if (!apiKey.trim()) {
      if (isMounted.current) setError('API Key is required');
      return;
    }

    let formattedUrl = apiUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    formattedUrl = formattedUrl.replace(/\/+$/, '');

    try {
      if (isMounted.current) {
        setIsTesting(true);
        setError('');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${formattedUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setConfig(formattedUrl, apiKey.trim());
        if (isMounted.current) {
          setSuccess(true);
          setIsTesting(false);
        }
        syncHistoryWithBackend(formattedUrl, apiKey.trim());
        return;
      } else {
        if (isMounted.current) {
          setError(`Connection failed. Server returned status: ${response.status}`);
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        setSuccess(false);
        if (err.name === 'AbortError') {
          setError('Connection timed out. Please verify your URL and network.');
        } else {
          setError(err.message || 'Failed to connect. Please check URL and credentials.');
        }
      }
    } finally {
      if (isMounted.current) {
        setIsTesting(false);
      }
    }
  };

  const handleReset = () => {
    clearConfig();
    clearStore();
    router.replace('/setup');
  };

  const handleResetPress = () => {
    Alert.alert(
      'Reset Server Connection',
      'Are you sure you want to reset your connection? This will erase all local settings, threads, and cached chats.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: handleReset }
      ]
    );
  };

  const activeAccentHex = ACCENT_COLORS[accentColor] || ACCENT_COLORS.indigo;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
    >
      {/* Node Configuration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Node Configuration</Text>
        <Text style={styles.sectionSubtitle}>
          Update the remote endpoint and auth token used to connect to your Vela FastAPI node.
        </Text>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://api.vela.local"
              placeholderTextColor="#71717a"
              value={apiUrl}
              onChangeText={(text) => {
                setApiUrl(text);
                if (error) setError('');
                if (success) setSuccess(false);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>API Access Key</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your API access token"
              placeholderTextColor="#71717a"
              value={apiKey}
              onChangeText={(text) => {
                setApiKey(text);
                if (error) setError('');
                if (success) setSuccess(false);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>✓ Settings saved successfully!</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: activeAccentHex },
              pressed && { opacity: 0.8 },
              isTesting && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save & Test Connection</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* UI & Aesthetics Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>UI & Aesthetics</Text>
        <Text style={styles.sectionSubtitle}>
          Customize the appearance and layout of the Vela client.
        </Text>

        <View style={styles.formContainer}>
          {/* App Theme */}
          <View style={styles.controlGroup}>
            <Text style={styles.label}>App Theme</Text>
            <View style={styles.row}>
              {(['deep', 'slate', 'cyberpunk'] as const).map((t) => {
                const isSelected = theme === t;
                return (
                  <Pressable
                    key={t}
                    style={[
                      styles.pillButton,
                      isSelected && { borderColor: activeAccentHex },
                      isSelected && styles.pillButtonActive,
                    ]}
                    onPress={() => setTheme(t)}
                  >
                    <Text style={[styles.pillButtonText, isSelected && styles.pillButtonTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Font Size */}
          <View style={styles.controlGroup}>
            <Text style={styles.label}>Font Size</Text>
            <View style={styles.row}>
              {(['small', 'medium', 'large'] as const).map((size) => {
                const isSelected = fontSize === size;
                return (
                  <Pressable
                    key={size}
                    style={[
                      styles.pillButton,
                      isSelected && { borderColor: activeAccentHex },
                      isSelected && styles.pillButtonActive,
                    ]}
                    onPress={() => setFontSize(size)}
                  >
                    <Text style={[styles.pillButtonText, isSelected && styles.pillButtonTextActive]}>
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Accent Color */}
          <View style={[styles.controlGroup, { marginBottom: 0 }]}>
            <Text style={styles.label}>Accent Color</Text>
            <View style={[styles.row, { gap: 16, marginTop: 8 }]}>
              {(Object.keys(ACCENT_COLORS) as Array<keyof typeof ACCENT_COLORS>).map((color) => {
                const isSelected = accentColor === color;
                const colorHex = ACCENT_COLORS[color];
                return (
                  <Pressable
                    key={color}
                    style={[
                      styles.accentDot,
                      { backgroundColor: colorHex },
                      isSelected && { borderColor: '#ffffff', borderWidth: 2.5 },
                    ]}
                    onPress={() => setAccentColor(color)}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Agent Configuration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Agent Configuration</Text>
        <Text style={styles.sectionSubtitle}>
          Configure the behavior, prompts, and model parameters for the Vela research agent.
        </Text>

        <View style={styles.formContainer}>
          {/* Default Model */}
          <View style={styles.controlGroup}>
            <Text style={styles.label}>Default Model</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter model name (e.g. gemini-1.5-pro)"
              placeholderTextColor="#71717a"
              value={modelName}
              onChangeText={setModelName}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={[styles.row, { flexWrap: 'wrap', marginTop: 8, gap: 6 }]}>
              {PRESET_MODELS.map((model) => {
                const isSelected = modelName === model;
                return (
                  <Pressable
                    key={model}
                    style={[
                      styles.chip,
                      isSelected && { borderColor: activeAccentHex, borderWidth: 1 },
                      isSelected && styles.chipActive,
                    ]}
                    onPress={() => setModelName(model)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {model}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Temperature */}
          <View style={styles.controlGroup}>
            <Text style={styles.label}>Temperature ({temperature.toFixed(1)})</Text>
            <View style={styles.tempControlRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.tempStepButton,
                  pressed && styles.tempStepButtonPressed,
                  temperature <= 0 && styles.tempStepButtonDisabled,
                ]}
                onPress={() => {
                  const next = Math.max(0, Math.round((temperature - 0.1) * 10) / 10);
                  setTemperature(next);
                }}
                disabled={temperature <= 0}
              >
                <Text style={styles.tempStepButtonText}>-</Text>
              </Pressable>

              <View style={styles.tempTrackBg}>
                <View
                  style={[
                    styles.tempTrackFill,
                    {
                      width: `${temperature * 100}%`,
                      backgroundColor: activeAccentHex,
                    },
                  ]}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.tempStepButton,
                  pressed && styles.tempStepButtonPressed,
                  temperature >= 1.0 && styles.tempStepButtonDisabled,
                ]}
                onPress={() => {
                  const next = Math.min(1.0, Math.round((temperature + 0.1) * 10) / 10);
                  setTemperature(next);
                }}
                disabled={temperature >= 1.0}
              >
                <Text style={styles.tempStepButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* System Prompt */}
          <View style={[styles.controlGroup, { marginBottom: 0 }]}>
            <Text style={styles.label}>System Prompt</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="You are an autonomous research agent."
              placeholderTextColor="#71717a"
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>

      {/* Danger Zone Section */}
      <View style={[styles.section, styles.dangerSection]}>
        <Text style={styles.sectionTitleDanger}>Danger Zone</Text>
        <Text style={styles.sectionSubtitle}>
          Resetting your connection will erase all local settings, threads, and cached chats.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
          onPress={handleResetPress}
        >
          <Text style={styles.resetButtonText}>Reset Server Connection</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  dangerSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#18181b',
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f4f4f5',
    marginBottom: 6,
  },
  sectionTitleDanger: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f87171',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 18,
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f4f4f5',
    fontSize: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    color: '#34d399',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#3730a3',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  resetButtonText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '600',
  },
  controlGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  pillButton: {
    flex: 1,
    backgroundColor: '#09090b',
    borderWidth: 2,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButtonActive: {
    backgroundColor: '#18181b',
  },
  pillButtonText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '500',
  },
  pillButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  accentDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  chip: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: '#18181b',
  },
  chipText: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '500',
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tempControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  tempStepButton: {
    width: 36,
    height: 36,
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempStepButtonPressed: {
    backgroundColor: '#18181b',
  },
  tempStepButtonDisabled: {
    opacity: 0.4,
  },
  tempStepButtonText: {
    color: '#f4f4f5',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tempTrackBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#09090b',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
  },
  tempTrackFill: {
    height: '100%',
    borderRadius: 4,
  },
});
