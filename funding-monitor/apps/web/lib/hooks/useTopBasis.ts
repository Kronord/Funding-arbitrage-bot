'use client';
import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';
import type { FundingPair } from '@funding-monitor/types';

interface TopBasisReport {
  pairs:     FundingPair[];
  updatedAt: string | null;
}

export function useTopBasis(limit = 25, intervalMs = 10000) {
  const { accessToken, refreshToken } = useAuth();
  const [report, setReport]   = useState<TopBasisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(
        `${getApiUrl()}/api/funding/top-basis?limit=${limit}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (res.status === 401) {
        await refreshToken();
        return;
      }

      const json = await res.json();
      if (json.ok) { setReport(json.data); setError(null); }
    } catch {
      setError('Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [accessToken, limit, refreshToken]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, intervalMs);
    return () => clearInterval(id);
  }, [fetch_, intervalMs]);

  return { report, loading, error, refetch: fetch_ };
}