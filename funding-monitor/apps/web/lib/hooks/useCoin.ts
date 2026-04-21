'use client';
import { useState, useEffect, useCallback } from 'react';
import type {
  CoinDetails, FundingHistoryItem,
  FundingSummary, Kline, CalcResult
} from '@funding-monitor/types';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useCoinDetails(coin: string) {
  const [data, setData]     = useState<CoinDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/funding/${coin}`);
      console.log(coin)
      const json = await res.json();
      if (json.ok) setData(json.data);
    } catch { setError('Помилка завантаження'); }
    finally { setLoading(false); }
  }, [coin]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 30000); // оновлення кожні 30 сек
    return () => clearInterval(id);
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export function useFundingHistory(coin: string, days: number) {
  const [data, setData]       = useState<FundingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/funding/${coin}/history?days=${days}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setData(j.data); })
      .finally(() => setLoading(false));
  }, [coin, days]);

  return { data, loading };
}

export function useFundingSummary(coin: string, days: number) {
  const [data, setData]       = useState<FundingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/funding/${coin}/summary?days=${days}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setData(j.data); })
      .finally(() => setLoading(false));
  }, [coin, days]);

  return { data, loading };
}

export function usePriceChart(coin: string, granularity: number, days: number) {
  const [data, setData]       = useState<Kline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/funding/${coin}/chart?granularity=${granularity}&days=${days}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setData(j.data); })
      .finally(() => setLoading(false));
  }, [coin, granularity, days]);

  return { data, loading };
}

export async function calcSpread(
  coin: string,
  spotEntryPrice: number,
  futEntryPrice: number,
  orderSize: number
): Promise<CalcResult | null> {
  try {
    const res  = await fetch(`${API}/api/funding/${coin}/calc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spotEntryPrice, futEntryPrice, orderSize }),
    });
    const json = await res.json();
    return json.ok ? json.data : null;
  } catch { return null; }
}