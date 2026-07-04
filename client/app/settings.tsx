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
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useConfigStore } from '../store/useConfigStore';
import { useChatStore } from '../store/useChatStore';

export default function SettingsScreen() {
  const { apiUrl: storedUrl, apiKey: storedKey, setConfig, clearConfig } = useConfigStore();
  const { clearStore } = useChatStore();
  const router = useRouter();

  const [apiUrl, setApiUrl] = useState(storedUrl);
  const [apiKey, setApiKey] = useState(storedKey);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    Keyboard.dismiss();
    setSuccess(false);

    if (!apiUrl.trim()) {
      setError('API URL is required');
      return;
    }
    if (!apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    let formattedUrl = apiUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    formattedUrl = formattedUrl.replace(/\/+$/, '');

    try {
      setIsTesting(true);
      setError('');

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
        setSuccess(true);
      } else {
        setError(`Connection failed. Server returned status: ${response.status}`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Connection timed out. Please verify your URL and network.');
      } else {
        setError(err.message || 'Failed to connect. Please check URL and credentials.');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    clearConfig();
    clearStore();
    router.replace('/setup');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
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
                pressed && styles.saveButtonPressed,
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

        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.sectionTitleDanger}>Danger Zone</Text>
          <Text style={styles.sectionSubtitle}>
            Resetting your connection will erase all local settings, threads, and cached chats.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
            onPress={handleReset}
          >
            <Text style={styles.resetButtonText}>Reset Server Connection</Text>
          </Pressable>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
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
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonPressed: {
    backgroundColor: '#4f46e5',
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
});
