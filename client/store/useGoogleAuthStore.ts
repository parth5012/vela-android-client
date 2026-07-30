import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// --- Types ---

export interface GoogleUserInfo {
  name: string;
  email: string;
  picture?: string;
  sub?: string;
}

export interface GoogleTokenSet {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number; // epoch ms
}

export type GoogleWorkspaceScope =
  | 'openid'
  | 'profile'
  | 'email'
  | 'gmail.readonly'
  | 'gmail.modify'
  | 'calendar.readonly'
  | 'calendar.events'
  | 'drive.readonly'
  | 'drive.file'
  | 'docs.readonly'
  | 'sheets.readonly';

interface GoogleAuthState {
  /** Whether the user has completed Google sign-in at least once */
  isConnected: boolean;
  /** Whether a sign-in operation is in flight */
  isSigningIn: boolean;
  /** User profile info fetched after sign-in */
  user: GoogleUserInfo | null;
  /** Last known error message */
  error: string | null;
  /** Google Cloud OAuth client IDs (must be configured by the user) */
  iosClientId: string;
  androidClientId: string;
  webClientId: string;
  /** Requested scopes */
  scopes: GoogleWorkspaceScope[];
  /** Last resolved access token (not persisted — held in memory + SecureStore) */
  _accessToken: string;
  _refreshToken: string;
  _idToken: string;
  _tokenExpiresAt: number;

  // --- Actions ---
  setTokens: (tokens: GoogleTokenSet) => void;
  setUser: (user: GoogleUserInfo) => void;
  setSigningIn: (val: boolean) => void;
  setError: (err: string | null) => void;
  setClientIds: (ids: { ios?: string; android?: string; web?: string }) => void;
  setScopes: (scopes: GoogleWorkspaceScope[]) => void;
  clearAuth: () => void;
  getAccessToken: () => string;
  getRefreshToken: () => string;
  getIdToken: () => string;
  getStoredTokens: () => Promise<GoogleTokenSet | null>;
  storeTokens: (tokens: GoogleTokenSet) => Promise<void>;
  clearStoredTokens: () => Promise<void>;
}

// Secure-store keys
const SECURE_ACCESS_KEY = 'vela-google-access-token';
const SECURE_REFRESH_KEY = 'vela-google-refresh-token';
const SECURE_ID_KEY = 'vela-google-id-token';
const SECURE_EXPIRES_KEY = 'vela-google-expires-at';

// Workspace scopes for agent access
export const WORKSPACE_SCOPES: GoogleWorkspaceScope[] = [
  'openid',
  'profile',
  'email',
  'gmail.readonly',
  'calendar.readonly',
  'drive.readonly',
  'docs.readonly',
  'sheets.readonly',
];

// --- Secure-store helpers ---

async function persistTokens(tokens: GoogleTokenSet): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(SECURE_ACCESS_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(SECURE_REFRESH_KEY, tokens.refreshToken);
  }
  if (tokens.idToken) {
    await SecureStore.setItemAsync(SECURE_ID_KEY, tokens.idToken);
  }
  await SecureStore.setItemAsync(SECURE_EXPIRES_KEY, String(tokens.expiresAt));
}

async function readStoredTokens(): Promise<GoogleTokenSet | null> {
  if (Platform.OS === 'web') return null;
  try {
    const accessToken = await SecureStore.getItemAsync(SECURE_ACCESS_KEY);
    if (!accessToken) return null;
    const refreshToken = await SecureStore.getItemAsync(SECURE_REFRESH_KEY);
    const idToken = await SecureStore.getItemAsync(SECURE_ID_KEY);
    const expiresAtStr = await SecureStore.getItemAsync(SECURE_EXPIRES_KEY);
    const expiresAt = expiresAtStr ? Number(expiresAtStr) : 0;
    return { accessToken, refreshToken: refreshToken || undefined, idToken: idToken || undefined, expiresAt };
  } catch {
    return null;
  }
}

async function clearStoredTokens(): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.deleteItemAsync(SECURE_ACCESS_KEY);
  await SecureStore.deleteItemAsync(SECURE_REFRESH_KEY);
  await SecureStore.deleteItemAsync(SECURE_ID_KEY);
  await SecureStore.deleteItemAsync(SECURE_EXPIRES_KEY);
}

// --- Store ---

export const useGoogleAuthStore = create<GoogleAuthState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      isSigningIn: false,
      user: null,
      error: null,
      iosClientId: '',
      androidClientId: '',
      webClientId: '',
      scopes: WORKSPACE_SCOPES,
      _accessToken: '',
      _refreshToken: '',
      _idToken: '',
      _tokenExpiresAt: 0,

      setTokens: (tokens) => {
        set({
          _accessToken: tokens.accessToken,
          _refreshToken: tokens.refreshToken || '',
          _idToken: tokens.idToken || '',
          _tokenExpiresAt: tokens.expiresAt,
          isConnected: true,
          error: null,
        });
        persistTokens(tokens).catch((e) =>
          console.error('[GoogleAuth] Failed to persist tokens:', e)
        );
      },

      setUser: (user) => set({ user, isConnected: true }),

      setSigningIn: (val) => set({ isSigningIn: val }),

      setError: (err) => set({ error: err, isSigningIn: false }),

      setClientIds: (ids) => {
        const update: Partial<GoogleAuthState> = {};
        if (ids.ios !== undefined) update.iosClientId = ids.ios;
        if (ids.android !== undefined) update.androidClientId = ids.android;
        if (ids.web !== undefined) update.webClientId = ids.web;
        set(update);
      },

      setScopes: (scopes) => set({ scopes }),

      clearAuth: () => {
        set({
          isConnected: false,
          user: null,
          error: null,
          _accessToken: '',
          _refreshToken: '',
          _idToken: '',
          _tokenExpiresAt: 0,
          isSigningIn: false,
        });
        clearStoredTokens().catch((e) =>
          console.error('[GoogleAuth] Failed to clear tokens:', e)
        );
      },

      getAccessToken: () => get()._accessToken,
      getRefreshToken: () => get()._refreshToken,
      getIdToken: () => get()._idToken,

      getStoredTokens: async () => readStoredTokens(),

      storeTokens: async (tokens) => {
        set({
          _accessToken: tokens.accessToken,
          _refreshToken: tokens.refreshToken || '',
          _idToken: tokens.idToken || '',
          _tokenExpiresAt: tokens.expiresAt,
        });
        await persistTokens(tokens);
      },

      clearStoredTokens: async () => {
        set({
          _accessToken: '',
          _refreshToken: '',
          _idToken: '',
          _tokenExpiresAt: 0,
        });
        await clearStoredTokens();
      },
    }),
    {
      name: 'vela-google-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isConnected: state.isConnected,
        user: state.user,
        iosClientId: state.iosClientId,
        androidClientId: state.androidClientId,
        webClientId: state.webClientId,
        scopes: state.scopes,
      }),
    }
  )
);

// --- Async init: hydrate tokens from SecureStore on app launch ---

export async function hydrateGoogleTokens(): Promise<void> {
  const { isConnected, setTokens } = useGoogleAuthStore.getState();
  if (!isConnected) return;
  try {
    const stored = await readStoredTokens();
    if (stored) {
      setTokens(stored);
    }
  } catch (e) {
    console.error('[GoogleAuth] hydrate error:', e);
  }
}
