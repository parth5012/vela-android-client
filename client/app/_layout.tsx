import { useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useConfigStore } from '../store/useConfigStore';
import DrawerContent from '../components/ui/DrawerContent';
import { Platform } from 'react-native';



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

  // If we are in the setup screen, render it directly without the Drawer UI
  if (inSetupGroup) {
    const { Slot } = require('expo-router');
    return <Slot />;
  }

  return (
    <Drawer
      drawerContent={() => <DrawerContent />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#09090b',
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: '900',
          color: '#818cf8',
          fontSize: 16,
        },
        headerTintColor: '#e4e4e7',
        drawerStyle: {
          backgroundColor: '#09090b',
          width: 280,
        },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerTitle: 'VELA',
          headerTitleStyle: {
            fontWeight: '900',
            letterSpacing: 3,
            color: '#818cf8',
            fontSize: 16,
          }
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          headerTitle: 'Settings',
          headerTitleStyle: {
            fontWeight: '600',
            color: '#e4e4e7',
            fontSize: 16,
          }
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
