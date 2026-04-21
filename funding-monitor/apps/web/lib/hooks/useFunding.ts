'use client';
import { useState, useEffect, useCallback } from 'react';
import type { FundingReport } from '@funding-monitor/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useFunding(intervalMs = 10000) {
  const [report, setReport]   = useState<FundingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/funding`);
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
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, intervalMs);
    return () => clearInterval(id);
  }, [fetch_, intervalMs]);

  return { report, loading, error };
}