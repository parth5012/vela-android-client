import { useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState, Slot } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { ActivityIndicator, View, StyleSheet, Platform, Pressable, Text } from 'react-native';
import { useConfigStore } from '../store/useConfigStore';
import { useChatStore } from '../store/useChatStore';
import DrawerContent from '../components/ui/DrawerContent';
import HealthIndicator from '../components/ui/HealthIndicator';
import WebView from 'react-native-webview';
import {
  useBrowserStore,
  webViewRef,
  handleWebViewLoadEnd,
  handleWebViewMessage,
} from '../store/useBrowserStore';


function HeaderRightActions() {
  const router = useRouter();
  const segments = useSegments();
  const isBrowserRoute = segments[0] === 'browser';

  const handleToggle = () => {
    if (isBrowserRoute) {
      router.navigate('/');
    } else {
      router.navigate('/browser');
    }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isBrowserRoute ? '#312e81' : '#1e1b4b',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 6,
          marginRight: 8,
          borderWidth: 1,
          borderColor: isBrowserRoute ? '#818cf8' : '#4f46e5',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ color: '#e0e7ff', fontSize: 12, fontWeight: 'bold' }}>
          {isBrowserRoute ? '💬 Chat' : '🌐 Webview'}
        </Text>
      </Pressable>
      <HealthIndicator />
    </View>
  );
}

export default function RootLayout() {
  const isConfigured = useConfigStore((state) => state.isConfigured);
  const hasHydrated = useConfigStore((state) => state.hasHydrated);

  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const isRouterReady = navigationState?.key !== undefined;

  useEffect(() => {
    if (hasHydrated) {
      // Force user to land on the welcome/new conversation screen on app launch
      useChatStore.getState().selectThread(null);
    }
  }, [hasHydrated]);

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
    return <Slot />;
  }

  const currentUrl = useBrowserStore((s) => s.currentUrl);
  const isBrowserVisible = useBrowserStore((s) => s.isVisible);
  const isBrowserRoute = segments[0] === 'browser';
  const shouldShowWebview = isBrowserVisible && isBrowserRoute;

  return (
    <View style={{ flex: 1 }}>
      <Drawer
        drawerContent={() => <DrawerContent />}
        screenOptions={{
          drawerType: 'front',
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
        headerRight: () => <HeaderRightActions />,
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
            },
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
            },
          }}
        />
        <Drawer.Screen
          name="browser"
          options={{
            headerTitle: 'Browser',
            headerTitleStyle: {
              fontWeight: '600',
              color: '#e4e4e7',
              fontSize: 16,
            },
          }}
        />
      </Drawer>

      {/* Persistent WebView — always mounted, visibility toggled */}
      <View
        style={[
          styles.persistentWebview,
          { display: shouldShowWebview ? 'flex' : 'none' },
        ]}
        pointerEvents={shouldShowWebview ? 'auto' : 'none'}
      >
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          style={{ flex: 1 }}
          onLoadEnd={handleWebViewLoadEnd}
          onMessage={handleWebViewMessage}
          onNavigationStateChange={(navState) => {
            useBrowserStore.getState().setNavState(
              navState.canGoBack,
              navState.canGoForward,
              navState.url,
              navState.title || ''
            );
          }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  persistentWebview: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Leave space for header (~56px on Android, ~96px on iOS)
    // plus URL bar (~54px) and toolbar (~38px)
    top: Platform.OS === 'ios' ? 190 : 148,
  },
});
