'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getApiUrl } from '@/lib/api';

interface User {
  id:        string;
  email:     string;
  name?:     string;
  avatarUrl?: string;
  role:      string;
  createdAt:  string;
}

interface AuthContextType {
  user:         User | null;
  accessToken:  string | null;
  loading:      boolean;
  login:        (email: string, password: string) => Promise<void>;
  register:     (email: string, password: string, name?: string) => Promise<void>;
  logout:       () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);

  // ── Отримати профіль ──
  const fetchMe = useCallback(async (token: string) => {
  try {
    const res = await fetch(`${getApiUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      // Тільки при 401 скидаємо токени
      setUser(null);
      setAccessToken(null);
      return;
    }

    const json = await res.json();
    if (json.ok) {
      setUser(json.data);
    }
    // При інших помилках НЕ скидаємо токени
  } catch {
    // Мережева помилка — не скидаємо токени
    console.error('fetchMe network error');
  }
}, []);

  // ── Оновити токен ──
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const res  = await fetch(`${getApiUrl()}/api/auth/refresh`, {
        method:      'POST',
        credentials: 'include', // відправляємо cookie
      });
      const json = await res.json();
      if (json.ok && json.data.accessToken) {
        setAccessToken(json.data.accessToken);
        await fetchMe(json.data.accessToken);
        return true;
      }
    } catch {}
    return false;
  }, [fetchMe]);

  // ── Ініціалізація — спробувати відновити сесію ──
  useEffect(() => {
    refreshToken().finally(() => setLoading(false));
  }, [refreshToken]);

  // ── Авто-оновлення токена кожні 14 хвилин ──
  useEffect(() => {
    if (!accessToken) return;
    const id = setInterval(() => refreshToken(), 14 * 60 * 1000);
    return () => clearInterval(id);
  }, [accessToken, refreshToken]);

  // ── Логін ──
  const login = useCallback(async (email: string, password: string) => {
    const res  = await fetch(`${getApiUrl()}/api/auth/login`, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);

    setAccessToken(json.data.accessToken);
    await fetchMe(json.data.accessToken);
  }, [fetchMe]);

  // ── Реєстрація ──
  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res  = await fetch(`${getApiUrl()}/api/auth/register`, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ email, password, name }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);

    setAccessToken(json.data.accessToken);
    await fetchMe(json.data.accessToken);
  }, [fetchMe]);

  // ── Логаут ──
  const logout = useCallback(async () => {
    await fetch(`${getApiUrl()}/api/auth/logout`, {
      method:      'POST',
      credentials: 'include',
    }).catch(console.error);

    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}