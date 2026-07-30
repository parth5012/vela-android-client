import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useGoogleAuthStore } from '../../store/useGoogleAuthStore';
import { useConfigStore } from '../../store/useConfigStore';

interface GoogleWorkspaceCardProps {
  colors: {
    background: string;
    card: string;
    border: string;
    text: string;
    textMuted: string;
    textDark: string;
  };
  sizes: {
    text: number;
    sub: number;
    title: number;
  };
  accentHex: string;
}

// Backend URL helper
function apiUrl(path: string, base: string): string {
  let formatted = (base || '').trim();
  if (!/^https?:\/\//i.test(formatted)) formatted = 'https://' + formatted;
  formatted = formatted.replace(/\/+$/, '');
  return `${formatted}${path}`;
}

// The redirect URI the backend will send us back to after OAuth completes
const OAUTH_REDIRECT_URI = 'vela-client://oauth/callback';

// ─── Main component ─────────────────────────────────────────────────────

export default function GoogleWorkspaceCard({
  colors,
  sizes,
  accentHex,
}: GoogleWorkspaceCardProps) {
  const {
    isConnected,
    isSigningIn,
    user,
    error,
    backendConnected,
    setTokens,
    setUser,
    setSigningIn,
    setError,
    setBackendConnected,
    clearAuth,
  } = useGoogleAuthStore();

  const apiUrlRaw = useConfigStore((s) => s.apiUrl);
  const apiKey = useConfigStore((s) => s.apiKey);
  const sessionStartedRef = useRef(false);

  // On mount, check backend for existing token status
  useEffect(() => {
    if (!apiUrlRaw || !apiKey) return;
    checkTokenStatus();
  }, [apiUrlRaw, apiKey]);

  const checkTokenStatus = useCallback(async () => {
    if (!apiUrlRaw || !apiKey) return;
    try {
      const res = await fetch(
        apiUrl(`/oauth/token/status`, apiUrlRaw),
        { headers: { Authorization: `Bearer ${apiKey.trim()}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setBackendConnected(data.connected === true);
        // If backend reports connected but we don't have local user, fetch it
        if (data.connected && data.user) {
          const currentUser = useGoogleAuthStore.getState().user;
          if (!currentUser) {
            setUser({
              name: data.user.name || 'Google User',
              email: data.user.email || '',
              picture: data.user.picture || undefined,
            });
            // Also set any tokens returned by backend for SSE streaming
            if (data.access_token) {
              setTokens({
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                idToken: data.id_token,
                expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : 0,
              });
            }
          }
        }
      } else {
        setBackendConnected(false);
      }
    } catch {
      setBackendConnected(false);
    }
  }, [apiUrlRaw, apiKey, setBackendConnected, setUser, setTokens]);

  // After OAuth redirect returns, poll backend to confirm connection
  useEffect(() => {
    if (!sessionStartedRef.current) return;
    // Poll a few times after the OAuth browser closes
    const timer = setInterval(() => {
      checkTokenStatus().then(() => {
        const state = useGoogleAuthStore.getState();
        if (state.isConnected && state.backendConnected) {
          clearInterval(timer);
        }
      });
    }, 1500);
    // Stop polling after 30 seconds
    setTimeout(() => clearInterval(timer), 30_000);
    return () => clearInterval(timer);
  }, [checkTokenStatus]);

  // Sign-in: open backend-managed OAuth flow in browser
  const handleSignIn = async () => {
    if (!apiUrlRaw) {
      setError('Server URL is not configured. Please configure your Vela node first.');
      return;
    }

    setSigningIn(true);
    setError(null);

    try {
      const authUrl = apiUrl(
        `/oauth/google/authorize?redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}`,
        apiUrlRaw
      );

      // Note: we still need the API key for the backend to associate the OAuth
      // state with this user. The backend reads it from the Authorization header.
      // We pass it as a query param since WebBrowser can't set custom headers.
      const result = await WebBrowser.openAuthSessionAsync(
        `${authUrl}&api_key=${encodeURIComponent(apiKey || '')}`,
        OAUTH_REDIRECT_URI
      );

      if (result.type === 'success') {
        // The backend successfully completed the OAuth flow and redirected back.
        // Poll the token status endpoint to get user info and confirm.
        sessionStartedRef.current = true;
        await checkTokenStatus();
      } else if (result.type === 'cancel') {
        setError('Google sign-in was cancelled.');
      } else if (result.type === 'dismiss') {
        setError('Google sign-in was dismissed.');
      }
    } catch (err: any) {
      const msg = err?.message || 'An error occurred during Google sign-in.';
      setError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  // Sign-out handler
  const handleSignOut = async () => {
    clearAuth();
    sessionStartedRef.current = false;

    if (apiUrlRaw && apiKey) {
      try {
        await fetch(apiUrl('/oauth/token/revoke', apiUrlRaw), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
        });
      } catch {
        // Ignore network errors on revoke
      }
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  // Connected state — show user card
  if (isConnected && user) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.connectedBanner}>
          <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
          <Text style={[styles.connectedLabel, { color: '#22c55e', fontSize: sizes.sub }]}>
            Google Workspace Connected
          </Text>
          {backendConnected === true && (
            <Text style={[styles.backendDot, { color: '#22c55e', fontSize: sizes.sub - 2 }]}>
              {'  •  Synced'}
            </Text>
          )}
          {backendConnected === false && (
            <Text style={[styles.backendDot, { color: '#f59e0b', fontSize: sizes.sub - 2 }]}>
              {'  •  Not synced'}
            </Text>
          )}
        </View>

        <View style={styles.userRow}>
          {user.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: accentHex }]}>
              <Text style={[styles.avatarInitial, { fontSize: sizes.text }]}>
                {(user.name || user.email || '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text, fontSize: sizes.text }]} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textMuted, fontSize: sizes.sub }]} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
        </View>

        <View style={[styles.agentNote, { backgroundColor: accentHex + '12', borderColor: accentHex + '30' }]}>
          <Text style={[styles.agentNoteText, { color: colors.textMuted, fontSize: sizes.sub - 1 }]}>
            The Vela agent can access your Google Workspace (Gmail, Calendar, Drive) through backend-stored tokens.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            { borderColor: '#ef444440' },
            pressed && { backgroundColor: '#ef444415' },
          ]}
          onPress={handleSignOut}
        >
          <Text style={[styles.signOutText, { fontSize: sizes.text }]}>Disconnect Google Account</Text>
        </Pressable>
      </View>
    );
  }

  // Disconnected state — show sign-in card
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.cardTitle, { color: colors.text, fontSize: sizes.text }]}>
          Google Workspace
        </Text>
        <Text style={[styles.cardBadge, { fontSize: sizes.sub }]}>Optional</Text>
      </View>
      <Text style={[styles.cardSubtitle, { color: colors.textMuted, fontSize: sizes.sub }]}>
        Sign in with Google to give your Vela agent access to Gmail, Calendar, and Drive. The OAuth flow is handled by your Vela backend.
      </Text>

      {error ? (
        <Text style={[styles.errorText, { color: '#ef4444', fontSize: sizes.sub }]}>{error}</Text>
      ) : null}

      {isSigningIn ? (
        <View style={[styles.signInButton, { backgroundColor: accentHex }]}>
          <ActivityIndicator color="#ffffff" size="small" />
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.signInButton,
            { backgroundColor: accentHex },
            pressed && { opacity: 0.8 },
            !apiUrlRaw && styles.buttonDisabled,
          ]}
          onPress={handleSignIn}
          disabled={!apiUrlRaw}
        >
          <Text style={[styles.signInButtonText, { fontSize: sizes.text }]}>
            {apiUrlRaw ? 'Sign in with Google' : 'Configure Server URL first'}
          </Text>
        </Pressable>
      )}

      {/* Scopes preview (matching backend scopes) */}
      <View style={styles.scopesPreview}>
        <Text style={[styles.scopesLabel, { color: colors.textDark, fontSize: sizes.sub - 1 }]}>
          Agent will be able to:
        </Text>
        <Text style={[styles.scopeItem, { color: colors.textMuted, fontSize: sizes.sub - 1 }]}>
          • Read Gmail messages
        </Text>
        <Text style={[styles.scopeItem, { color: colors.textMuted, fontSize: sizes.sub - 1 }]}>
          • Manage Calendar events
        </Text>
        <Text style={[styles.scopeItem, { color: colors.textMuted, fontSize: sizes.sub - 1 }]}>
          • View Drive files
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: '700',
  },
  cardBadge: {
    color: '#a1a1aa',
    backgroundColor: '#27272a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    overflow: 'hidden',
  },
  cardSubtitle: {
    lineHeight: 18,
    marginBottom: 16,
  },
  errorText: {
    marginBottom: 10,
    textAlign: 'center',
  },
  signInButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  scopesPreview: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  scopesLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  scopeItem: {
    lineHeight: 18,
    paddingLeft: 4,
  },
  connectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  backendDot: {
    fontWeight: '500',
  },
  connectedLabel: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
  },
  userEmail: {},
  agentNote: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  agentNoteText: {
    lineHeight: 16,
  },
  signOutButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: '#ef4444',
    fontWeight: '600',
  },
});
