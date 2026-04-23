'use client';
import { useState, useEffect, useCallback } from 'react';
import type { FundingReport } from '@funding-monitor/types';
import { getApiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';

export function useFunding(intervalMs = 10000) {
  const { accessToken, refreshToken: refresh } = useAuth();
  const [report, setReport]   = useState<FundingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;

    try {
      const res = await fetch(`${getApiUrl()}/api/funding`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Токен протух — оновлюємо
      if (res.status === 401) {
        const json = await res.json().catch(() => ({}));
        if (json.error === 'TOKEN_EXPIRED') {
          await refresh();
        }
        return;
      }

      const json = await res.json();
      if (json.ok) {
        setReport(json.data);
        setError(null);
      }
    } catch (e) {
      setError('Помилка з\'єднання');
    } finally {
      setLoading(false);
    }
  }, [accessToken, refresh]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, intervalMs);
    return () => clearInterval(id);
  }, [fetch_, intervalMs]);

  return { report, loading, error, refetch: fetch_ };
}