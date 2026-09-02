import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, UserType, setAuthToken } from '../utils/api';

interface AppContextType {
  // Auth
  user: UserType | null;
  sessionToken: string | null;
  isAuthLoading: boolean;
  login: (token: string, user: UserType) => Promise<void>;
  logout: () => Promise<void>;
  // Vault lock
  isUnlocked: boolean;
  setUnlocked: (val: boolean) => void;
}

const AppCtx = createContext<AppContextType>({
  user: null,
  sessionToken: null,
  isAuthLoading: true,
  login: async () => {},
  logout: async () => {},
  isUnlocked: false,
  setUnlocked: () => {},
});

const TOKEN_KEY = 'textvault_session_token';

async function storeToken(token: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
  } else {
    try { await SecureStore.setItemAsync(TOKEN_KEY, token); } catch {}
  }
}

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
}

async function removeStoredToken() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
  } else {
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isUnlocked, setUnlocked] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const processedSessionIds = useRef(new Set<string>());

  // Lock on background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current === 'active' && nextState.match(/inactive|background/)) {
        setUnlocked(false);
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // Init auth on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      setIsAuthLoading(true);
      try {
        // WEB ONLY: Check for session_id in URL FIRST
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const hash = window.location.hash || '';
          const search = window.location.search || '';
          const combined = hash + (search.length > 1 ? '&' + search.slice(1) : '');
          const match = combined.match(/[#?&]session_id=([^&#]+)/);

          if (match) {
            const sessionId = decodeURIComponent(match[1]);
            if (!processedSessionIds.current.has(sessionId)) {
              processedSessionIds.current.add(sessionId);
              const data = await api.exchangeSession(sessionId);
              if (!mounted) return;
              await storeToken(data.session_token);
              setAuthToken(data.session_token);
              setUser(data.user);
              setSessionToken(data.session_token);
              // Clean URL after successful exchange
              window.history.replaceState(window.history.state, '', window.location.pathname);
              setIsAuthLoading(false);
              return;
            }
          }
        }

        // Check for existing stored token
        const token = await getStoredToken();
        if (token && mounted) {
          setAuthToken(token);
          try {
            const me = await api.getMe(); // has 10s timeout via AbortController
            if (mounted) {
              setUser(me);
              setSessionToken(token);
            }
          } catch {
            // Token expired or invalid — clear it
            await removeStoredToken();
            if (mounted) {
              setAuthToken(null);
              setUser(null);
              setSessionToken(null);
            }
          }
        }
      } catch {
        await removeStoredToken();
        if (mounted) {
          setAuthToken(null);
          setUser(null);
          setSessionToken(null);
        }
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
        }
      }
    };

    // Safety net: ensure isAuthLoading resolves within 8 seconds no matter what
    const safetyTimer = setTimeout(() => {
      if (mounted) setIsAuthLoading(false);
    }, 8000);

    initAuth().finally(() => clearTimeout(safetyTimer));

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  const login = async (token: string, userObj: UserType) => {
    await storeToken(token);
    setAuthToken(token);
    setUser(userObj);
    setSessionToken(token);
  };

  const logout = async () => {
    try { await api.logoutUser(); } catch {}
    await removeStoredToken();
    setAuthToken(null);
    setUser(null);
    setSessionToken(null);
    setUnlocked(false);
  };

  return (
    <AppCtx.Provider value={{
      user, sessionToken, isAuthLoading, login, logout,
      isUnlocked, setUnlocked,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

export const useApp = () => useContext(AppCtx);
