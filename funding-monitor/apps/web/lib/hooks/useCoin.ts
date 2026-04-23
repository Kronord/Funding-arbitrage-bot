'use client';
import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';
import type { FundingHistoryItem, FundingSummary, Kline, CalcResult } from '@funding-monitor/types';

// ── Утиліта fetch з токеном ──
function useApiFetch() {
  const { accessToken, refreshToken } = useAuth();

  return useCallback(async (url: string, options: RequestInit = {}) => {
    if (!accessToken) throw new Error('Не авторизований');

    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.status === 401) {
      const json = await res.json().catch(() => ({}));
      if (json.error === 'TOKEN_EXPIRED') await refreshToken();
      throw new Error('TOKEN_EXPIRED');
    }

    return res;
  }, [accessToken, refreshToken]);
}

// ── useCoinFull ──
interface CoinFullData {
  detail:  any;
  history: FundingHistoryItem[];
  klines:  Kline[];
  summary: FundingSummary;
}

export function useCoinFull(coin: string, historyDays = 7, granularity = 60, chartDays = 7) {
  const apiFetch = useApiFetch();
  const [data, setData]       = useState<CoinFullData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await apiFetch(
        `${getApiUrl()}/api/funding/${coin}/full?historyDays=${historyDays}&granularity=${granularity}&chartDays=${chartDays}`
      );

      if (res.status === 404) { setError('not_found'); return; }

      const json = await res.json();
      if (json.ok) { setData(json.data); setError(null); }
      else setError(json.error);
    } catch (e: any) {
      if (e.message !== 'TOKEN_EXPIRED') setError('Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, coin, historyDays, granularity, chartDays]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 30000);
    return () => clearInterval(id);
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export function useCoinDetails(coin: string) {
  const apiFetch = useApiFetch();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res  = await apiFetch(`${getApiUrl()}/api/funding/${coin}`);
      const json = await res.json();
      if (json.ok) { setData(json.data); setError(null); }
    } catch { setError('Помилка завантаження'); }
    finally { setLoading(false); }
  }, [apiFetch, coin]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 30000);
    return () => clearInterval(id);
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export function useFundingHistory(coin: string, days: number) {
  const apiFetch = useApiFetch();
  const [data, setData]       = useState<FundingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coin) return;
    setLoading(true);
    apiFetch(`${getApiUrl()}/api/funding/${coin}/history?days=${days}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setData(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coin, days]);

  return { data, loading };
}

export function useFundingSummary(coin: string, days: number) {
  const apiFetch = useApiFetch();
  const [data, setData]       = useState<FundingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coin) return;
    setLoading(true);
    apiFetch(`${getApiUrl()}/api/funding/${coin}/summary?days=${days}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setData(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coin, days]);

  return { data, loading };
}

export function usePriceChart(coin: string, granularity: number, days: number) {
  const apiFetch = useApiFetch();
  const [data, setData]       = useState<Kline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coin) return;
    setLoading(true);
    apiFetch(`${getApiUrl()}/api/funding/${coin}/chart?granularity=${granularity}&days=${days}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setData(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coin, granularity, days]);

  return { data, loading };
}

export async function calcSpread(
  coin: string,
  spotEntryPrice: number,
  futEntryPrice: number,
  orderSize: number,
  accessToken: string
): Promise<CalcResult | null> {
  try {
    const res = await fetch(`${getApiUrl()}/api/funding/${coin}/calc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ spotEntryPrice, futEntryPrice, orderSize }),
    });
    const json = await res.json();
    return json.ok ? json.data : null;
  } catch { return null; }
}