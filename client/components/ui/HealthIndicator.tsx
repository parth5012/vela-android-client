import React, { useState, useEffect } from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useConfigStore } from '../../store/useConfigStore';

export default function HealthIndicator() {
  const { apiUrl, apiKey, isConfigured } = useConfigStore();
  const [status, setStatus] = useState<'unknown' | 'checking' | 'online' | 'offline'>('unknown');
  const [latency, setLatency] = useState<number | null>(null);

  const checkHealth = async (showFeedback = false) => {
    if (!isConfigured || !apiUrl) {
      if (showFeedback) {
        Alert.alert(
          'Node Status',
          'Vela node is not configured yet. Please configure it in Settings.'
        );
      }
      setStatus('offline');
      return;
    }

    let formattedUrl = apiUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    formattedUrl = formattedUrl.replace(/\/+$/, '');

    try {
      setStatus('checking');
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${formattedUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (response.ok) {
        setStatus('online');
        setLatency(duration);
        if (showFeedback) {
          Alert.alert(
            'Node Status',
            `✓ Connected successfully!\n\nNode: ${formattedUrl.replace(/^https?:\/\//, '')}\nLatency: ${duration}ms`
          );
        }
      } else {
        setStatus('offline');
        setLatency(null);
        if (showFeedback) {
          Alert.alert(
            'Node Status',
            `⚠️ Connection failed.\n\nServer returned status: ${response.status}`
          );
        }
      }
    } catch (err: any) {
      setStatus('offline');
      setLatency(null);
      if (showFeedback) {
        const errMsg = err.name === 'AbortError' 
          ? 'Connection timed out after 5s.' 
          : (err.message || 'Failed to connect. Please check your URL and network.');
        Alert.alert('Node Status', `❌ Offline\n\n${errMsg}`);
      }
    }
  };

  useEffect(() => {
    checkHealth();

    // Periodically check connection every 30 seconds
    const interval = setInterval(() => {
      checkHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, [apiUrl, apiKey, isConfigured]);

  const getDotStyle = () => {
    switch (status) {
      case 'online':
        return styles.dotOnline;
      case 'offline':
        return styles.dotOffline;
      case 'checking':
        return styles.dotChecking;
      default:
        return styles.dotUnknown;
    }
  };

  if (!isConfigured) return null;

  return (
    <Pressable
      onPress={() => checkHealth(true)}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      {status === 'checking' ? (
        <ActivityIndicator size="small" color="#818cf8" style={styles.loader} />
      ) : (
        <View style={[styles.dot, getDotStyle()]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerPressed: {
    opacity: 0.7,
  },
  loader: {
    width: 10,
    height: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOnline: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  dotOffline: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  dotChecking: {
    backgroundColor: '#f59e0b',
  },
  dotUnknown: {
    backgroundColor: '#71717a',
  },
});
