import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { ApiError, api, setToken } from './api';
import type { User } from './types';

const KEY = 'tradehub_token';

// SecureStore has no web implementation, so the browser falls back to localStorage.
const storage = {
  get: async () => {
    if (Platform.OS !== 'web') return SecureStore.getItemAsync(KEY);
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set: async (value: string | null) => {
    if (Platform.OS !== 'web') {
      return value ? SecureStore.setItemAsync(KEY, value) : SecureStore.deleteItemAsync(KEY);
    }
    try {
      if (value) window.localStorage.setItem(KEY, value);
      else window.localStorage.removeItem(KEY);
    } catch {
      // Private browsing can block storage; the session then lasts until reload.
    }
  },
};

type Session = { token: string; user: User };

type AuthState = {
  user: User | null;
  // True until the saved session has been checked on startup.
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (form: {
    name: string;
    email: string;
    password: string;
    city: string;
    phone: string;
    acceptTerms: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const start = useCallback(async (session: Session) => {
    setToken(session.token);
    await storage.set(session.token);
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    await storage.set(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setUser((await api<{ user: User }>('/me')).user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) await logout();
    }
  }, [logout]);

  useEffect(() => {
    (async () => {
      const saved = await storage.get();
      if (saved) {
        setToken(saved);
        await refresh();
      }
      setLoading(false);
    })();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => start(await api<Session>('/auth/login', { body: { email, password } })),
      register: async (form) => start(await api<Session>('/auth/register', { body: form })),
      logout,
      refresh,
    }),
    [user, loading, start, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
