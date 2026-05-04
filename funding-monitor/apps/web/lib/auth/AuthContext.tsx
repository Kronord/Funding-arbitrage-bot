"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { getApiUrl } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const REFRESH_TOKEN_KEY = 'fm_refresh_token';
const ACCESS_TOKEN_KEY  = 'fm_access_token';

// ── Перевірка чи є токени ДО першого рендеру ──
function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    localStorage.getItem(ACCESS_TOKEN_KEY) &&
    localStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // ── Отримати профіль ──
  const fetchMe = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        clearTokens();
        return false;
      }
      const json = await res.json();
      if (json.ok) {
        setUser(json.data);
        return true;
      }
    } catch {}
    return false;
  }, []);

  function saveTokens(access: string, refresh: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, access);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    }
    setAccessToken(access);
  }

  function clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    setAccessToken(null);
    setUser(null);
  }

  // ── Оновити токен ──
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const storedRefresh = typeof window !== 'undefined'
        ? localStorage.getItem(REFRESH_TOKEN_KEY)
        : null;
      if (!storedRefresh) return false;

      const res = await fetch(`${getApiUrl()}/api/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: storedRefresh }),
      });

      if (!res.ok) { clearTokens(); return false; }

      const json = await res.json();
      if (json.ok && json.data?.accessToken && json.data?.refreshToken) {
        saveTokens(json.data.accessToken, json.data.refreshToken);
        await fetchMe(json.data.accessToken);
        return true;
      }
    } catch {}
    clearTokens();
    return false;
  }, [fetchMe]);

  // ── Ініціалізація ──
  useEffect(() => {
    async function init() {
      const storedAccess  = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (storedAccess && storedRefresh) {
        setAccessToken(storedAccess);
        // Спробуємо з access токеном
        const ok = await fetchMe(storedAccess);
        if (!ok) {
          // Access протух — пробуємо refresh
          await refreshToken();
        }
      }
      // Завершуємо ініціалізацію
      setLoading(false);
      setInitialized(true);
    }

    init();
  }, []);

  // ── Авто-оновлення токена кожні 14 хвилин ──
  useEffect(() => {
    if (!accessToken) return;
    const id = setInterval(() => refreshToken(), 14 * 60 * 1000);
    return () => clearInterval(id);
  }, [accessToken, refreshToken]);

  const login = useCallback(async (email: string, password: string) => {
    const res  = await fetch(`${getApiUrl()}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    saveTokens(json.data.accessToken, json.data.refreshToken);
    await fetchMe(json.data.accessToken);
  }, [fetchMe]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res  = await fetch(`${getApiUrl()}/api/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, name }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    saveTokens(json.data.accessToken, json.data.refreshToken);
    await fetchMe(json.data.accessToken);
  }, [fetchMe]);

  const logout = useCallback(async () => {
    const storedRefresh = typeof window !== 'undefined'
      ? localStorage.getItem(REFRESH_TOKEN_KEY)
      : null;

    await fetch(`${getApiUrl()}/api/auth/logout`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    }).catch(console.error);

    clearTokens();
  }, [accessToken]);

  return (
    <AuthContext.Provider value={{
      user, accessToken, loading,
      login, register, logout, refreshToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
