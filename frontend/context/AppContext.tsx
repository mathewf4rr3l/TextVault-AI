import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, UserType, setAuthToken } from '../utils/api';

interface AppContextType {
  user: UserType | null;
  sessionToken: string | null;
  isAuthLoading: boolean;
  login: (token: string, user: UserType) => Promise<void>;
  logout: () => Promise<void>;
  ensureSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppCtx = createContext<AppContextType>({
  user: null,
  sessionToken: null,
  isAuthLoading: true,
  login: async () => {},
  logout: async () => {},
  ensureSession: async () => {},
  refreshUser: async () => {},
});

const TOKEN_KEY = 'promptveer_session_token';
const DEVICE_KEY = 'promptveer_device_id';

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

async function getOrCreateDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return 'web_' + Date.now();
      const stored = localStorage.getItem(DEVICE_KEY);
      if (stored) return stored;
      const id = 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      localStorage.setItem(DEVICE_KEY, id);
      return id;
    }
    const stored = await SecureStore.getItemAsync(DEVICE_KEY);
    if (stored) return stored;
    const id = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    await SecureStore.setItemAsync(DEVICE_KEY, id);
    return id;
  } catch {
    return 'fallback_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      setIsAuthLoading(true);
      try {
        // WEB ONLY: handle Google OAuth redirect (session_id in URL)
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const hash = window.location.hash || '';
          const search = window.location.search || '';
          const combined = hash + (search.length > 1 ? '&' + search.slice(1) : '');
          const match = combined.match(/[#?&]session_id=([^&#]+)/);
          if (match) {
            const sessionId = decodeURIComponent(match[1]);
            try {
              const data = await api.exchangeSession(sessionId);
              if (!mounted) return;
              await storeToken(data.session_token);
              setAuthToken(data.session_token);
              setUser(data.user);
              setSessionToken(data.session_token);
              window.history.replaceState(window.history.state, '', window.location.pathname);
              setIsAuthLoading(false);
              return;
            } catch { /* fall through */ }
          }
        }

        const token = await getStoredToken();
        if (token && mounted) {
          setAuthToken(token);
          try {
            const me = await api.getMe();
            if (mounted) { setUser(me); setSessionToken(token); }
          } catch {
            await removeStoredToken();
            if (mounted) { setAuthToken(null); setUser(null); setSessionToken(null); }
          }
        }
      } catch {
        if (mounted) { setAuthToken(null); setUser(null); setSessionToken(null); }
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    };

    const safetyTimer = setTimeout(() => { if (mounted) setIsAuthLoading(false); }, 8000);
    initAuth().finally(() => clearTimeout(safetyTimer));
    return () => { mounted = false; clearTimeout(safetyTimer); };
  }, []);

  const login = async (token: string, userObj: UserType) => {
    await storeToken(token);
    setAuthToken(token);
    setUser(userObj);
    setSessionToken(token);
  };

  const ensureSession = async () => {
    if (sessionToken) return;
    const deviceId = await getOrCreateDeviceId();
    const data = await api.createGuestSession(deviceId);
    await storeToken(data.session_token);
    setAuthToken(data.session_token);
    setUser(data.user);
    setSessionToken(data.session_token);
  };

  const refreshUser = async () => {
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {}
  };

  const logout = async () => {
    try { await api.logoutUser(); } catch {}
    await removeStoredToken();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try { localStorage.removeItem(DEVICE_KEY); } catch {}
    } else {
      try { await SecureStore.deleteItemAsync(DEVICE_KEY); } catch {}
    }
    setAuthToken(null);
    setUser(null);
    setSessionToken(null);
  };

  return (
    <AppCtx.Provider value={{ user, sessionToken, isAuthLoading, login, logout, ensureSession, refreshUser }}>
      {children}
    </AppCtx.Provider>
  );
}

export const useApp = () => useContext(AppCtx);
