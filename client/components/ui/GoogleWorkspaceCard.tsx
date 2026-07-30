import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useGoogleAuthStore, GoogleTokenSet } from '../../store/useGoogleAuthStore';
import { useConfigStore } from '../../store/useConfigStore';
import { useChatStore } from '../../store/useChatStore';

// Complete auth session on web (required by expo-auth-session)
WebBrowser.maybeCompleteAuthSession();

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

// Fetch user profile from Google using the access token
async function fetchGoogleUser(
  accessToken: string
): Promise<{ name: string; email: string; picture?: string; sub?: string } | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.warn('[GoogleWorkspace] Failed to fetch user info:', res.status);
      return null;
    }
    const data = await res.json();
    return {
      name: data.name || data.email || 'Google User',
      email: data.email || '',
      picture: data.picture || undefined,
      sub: data.sub || undefined,
    };
  } catch (err) {
    console.error('[GoogleWorkspace] Error fetching user info:', err);
    return null;
  }
}

// Get a conversation ID for token storage — uses active thread or a fallback
function getConversationId(): string {
  const activeId = useChatStore.getState().activeThreadId;
  if (activeId) return activeId;
  return 'vela-google-workspace-auth';
}

// ─── Inner component that uses the Google hook ──────────────────────────
// Only rendered when client IDs are configured, so the hook never throws.
function GoogleAuthButton({
  colors,
  sizes,
  accentHex,
  onSignInStart,
  onSignInEnd,
}: {
  colors: any;
  sizes: any;
  accentHex: string;
  onSignInStart: () => void;
  onSignInEnd: (tokenSet: GoogleTokenSet | null, error: string | null) => void;
}) {
  const { iosClientId, androidClientId, webClientId, scopes } = useGoogleAuthStore();

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: iosClientId || undefined,
    androidClientId: androidClientId || undefined,
    webClientId: webClientId || undefined,
    scopes: scopes as string[],
  });

  // Handle OAuth response
  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const { params } = response;
      const tokenSet: GoogleTokenSet = {
        accessToken: params.access_token || params.id_token || '',
        refreshToken: params.refresh_token || undefined,
        idToken: params.id_token || undefined,
        expiresAt: params.expires_in
          ? Date.now() + Number(params.expires_in) * 1000
          : Date.now() + 3600_000,
      };
      onSignInEnd(tokenSet, tokenSet.accessToken ? null : 'No access token received from Google.');
    } else if (response.type === 'error') {
      onSignInEnd(null, response.params?.error_description || 'Google sign-in failed.');
    }
  }, [response]);

  const handlePress = () => {
    onSignInStart();
    promptAsync().catch((err: any) => {
      onSignInEnd(null, err.message || 'Failed to start Google sign-in.');
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.signInButton,
        { backgroundColor: accentHex },
        pressed && { opacity: 0.8 },
      ]}
      onPress={handlePress}
    >
      <Text style={[styles.signInButtonText, { fontSize: sizes.text }]}>Sign in with Google</Text>
    </Pressable>
  );
}

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
    iosClientId,
    androidClientId,
    webClientId,
    setTokens,
    setUser,
    setSigningIn,
    setError,
    clearAuth,
  } = useGoogleAuthStore();

  const apiUrlRaw = useConfigStore((s) => s.apiUrl);
  const apiKey = useConfigStore((s) => s.apiKey);
  const tokensSentRef = useRef(false);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);

  const hasClientIds = !!(iosClientId || androidClientId || webClientId);

  // On mount, check backend for existing token status
  useEffect(() => {
    if (!apiUrlRaw || !apiKey) return;
    const convId = getConversationId();
    fetch(
      apiUrl(`/oauth/token/status?conversation_id=${encodeURIComponent(convId)}`, apiUrlRaw),
      { headers: { Authorization: `Bearer ${apiKey.trim()}` } }
    )
      .then((r) => r.json())
      .then((data) => setBackendConnected(data.connected === true))
      .catch(() => setBackendConnected(false));
  }, [apiUrlRaw, apiKey]);

  // Send Google tokens to the Vela backend via /oauth/token
  const sendTokensToBackend = useCallback(async () => {
    if (!apiUrlRaw || !apiKey) return;
    const token = useGoogleAuthStore.getState()._accessToken;
    const refreshToken = useGoogleAuthStore.getState()._refreshToken;
    const expiry = useGoogleAuthStore.getState()._tokenExpiresAt;
    if (!token) return;

    try {
      const res = await fetch(apiUrl('/oauth/token', apiUrlRaw), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          conversation_id: getConversationId(),
          access_token: token,
          refresh_token: refreshToken || '',
          expiry: expiry ? new Date(expiry).toISOString() : '',
          scopes: useGoogleAuthStore.getState().scopes,
        }),
      });
      if (!res.ok) {
        console.warn('[GoogleWorkspace] Backend rejected tokens, status:', res.status);
      } else {
        setBackendConnected(true);
      }
    } catch (err) {
      console.warn('[GoogleWorkspace] Failed to send tokens to backend:', err);
      throw err;
    }
  }, [apiUrlRaw, apiKey]);

  // Auto-send tokens to backend when they become available
  useEffect(() => {
    if (!isConnected || !apiUrlRaw || !apiKey || tokensSentRef.current) return;
    tokensSentRef.current = true;
    sendTokensToBackend().catch(() => {
      tokensSentRef.current = false;
    });
  }, [isConnected, apiUrlRaw, apiKey, sendTokensToBackend]);

  // Sign-in handlers
  const handleSignInStart = () => {
    setSigningIn(true);
    setError(null);
  };

  const handleSignInEnd = async (tokenSet: GoogleTokenSet | null, err: string | null) => {
    setSigningIn(false);
    if (err) {
      setError(err);
      return;
    }
    if (!tokenSet || !tokenSet.accessToken) {
      setError('No access token received from Google.');
      return;
    }
    setTokens(tokenSet);
    tokensSentRef.current = false;

    // Fetch user profile
    const profile = await fetchGoogleUser(tokenSet.accessToken);
    if (profile) setUser(profile);
  };

  // Sign-out handler
  const handleSignOut = async () => {
    clearAuth();
    tokensSentRef.current = false;
    setBackendConnected(false);

    if (apiUrlRaw && apiKey) {
      try {
        await fetch(apiUrl('/oauth/token/revoke', apiUrlRaw), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({ conversation_id: getConversationId() }),
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
            🤖 The Vela agent can access your Google Workspace (Gmail, Calendar, Drive) through backend-stored tokens.
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
        Sign in with Google to give your Vela agent access to Gmail, Calendar, and Drive.
      </Text>

      {error ? (
        <Text style={[styles.errorText, { color: '#ef4444', fontSize: sizes.sub }]}>{error}</Text>
      ) : null}

      {/* Only mount the Google hook when client IDs are configured */}
      {hasClientIds ? (
        <GoogleAuthButton
          colors={colors}
          sizes={sizes}
          accentHex={accentHex}
          onSignInStart={handleSignInStart}
          onSignInEnd={handleSignInEnd}
        />
      ) : (
        <Pressable
          style={[styles.signInButton, { backgroundColor: accentHex, opacity: 0.5 }]}
          disabled
        >
          <Text style={[styles.signInButtonText, { fontSize: sizes.text }]}>
            Set Client ID below first
          </Text>
        </Pressable>
      )}

      {/* Scopes preview (matching backend SCOPES) */}
      <View style={styles.scopesPreview}>
        <Text style={[styles.scopesLabel, { color: colors.textDark, fontSize: sizes.sub - 1 }]}>
          Agent will be able to:
        </Text>
        <Text style={[styles.scopeItem, { color: colors.textMuted, fontSize: sizes.sub - 1 }]}>
          • Send Gmail
        </Text>
        <Text style={[styles.scopeItem, { color: colors.textMuted, fontSize: sizes.sub - 1 }]}>
          • Manage Calendar events
        </Text>
        <Text style={[styles.scopeItem, { color: colors.textMuted, fontSize: sizes.sub - 1 }]}>
          • Upload to Drive
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
