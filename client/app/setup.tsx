import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useConfigStore } from '../store/useConfigStore';
import { syncHistoryWithBackend } from '../utils/history';

export default function SetupScreen() {
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');

  const isMounted = React.useRef(true);
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  const setConfig = useConfigStore((state) => state.setConfig);
  const router = useRouter();

  const handleConnect = async () => {
    Keyboard.dismiss();
    
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
    // Remove trailing slashes
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
          setIsTesting(false); // Stop loading before navigation transition starts
        }
        syncHistoryWithBackend(formattedUrl, apiKey.trim());
        return;
      } else {
        if (isMounted.current) {
          setError(`Failed to connect. Server returned status: ${response.status}`);
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
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

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.innerContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.logo}>VELA</Text>
            <Text style={styles.title}>Connect to Server</Text>
            <Text style={styles.subtitle}>
              Configure your Vela instance credentials to synchronize and manage tasks.
            </Text>
          </View>

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
                }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                isTesting && styles.buttonDisabled,
              ]}
              onPress={handleConnect}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Connect & Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  innerContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 24,
    fontWeight: '900',
    color: '#818cf8',
    letterSpacing: 4,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f4f4f5',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f4f4f5',
    fontSize: 15,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    backgroundColor: '#4f46e5',
  },
  buttonDisabled: {
    backgroundColor: '#3730a3',
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
