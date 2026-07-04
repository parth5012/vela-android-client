import { useEffect } from 'react';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useConfigStore } from '../store/useConfigStore';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const { fetch: polyfilledFetch } = require('react-native-fetch-api');
  (globalThis as any).fetch = polyfilledFetch;
}

export default function RootLayout() {
  const isConfigured = useConfigStore((state) => state.isConfigured);
  const hasHydrated = useConfigStore((state) => state.hasHydrated);
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const isRouterReady = navigationState?.key !== undefined;

  useEffect(() => {
    if (!hasHydrated || !isRouterReady) return;

    const inSetupGroup = segments[0] === 'setup';

    if (!isConfigured && !inSetupGroup) {
      // User is not configured and not on setup, redirect to /setup
      router.replace('/setup');
    } else if (isConfigured && inSetupGroup) {
      // User is configured but on setup, redirect back to home /
      router.replace('/');
    }
  }, [isConfigured, hasHydrated, isRouterReady, segments]);

  const inSetupGroup = segments[0] === 'setup';

  if (!hasHydrated || !isRouterReady || (!isConfigured && !inSetupGroup) || (isConfigured && inSetupGroup)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#818cf8" />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
