'use client';
import { useAuth } from './AuthContext';
import { useCallback } from 'react';
import { getApiUrl } from '@/lib/api';

export function useAuthFetch() {
  const { accessToken, refreshToken, logout } = useAuth();

  const authFetch = useCallback(async (path: string, options: RequestInit = {}) => {
    const doFetch = (token: string) =>
      fetch(`${getApiUrl()}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });

    if (!accessToken) throw new Error('Не авторизований');

    let res = await doFetch(accessToken);

    // ── Якщо токен протух — оновлюємо і повторюємо ──
    if (res.status === 401) {
      const json = await res.json().catch(() => ({}));
      if (json.error === 'TOKEN_EXPIRED') {
        const refreshed = await refreshToken();
        if (!refreshed) { await logout(); throw new Error('Сесія закінчилась'); }
        // Повторний запит з новим токеном — беремо з контексту
        res = await doFetch(accessToken);
      }
    }

    return res;
  }, [accessToken, refreshToken, logout]);

  return { authFetch };
}