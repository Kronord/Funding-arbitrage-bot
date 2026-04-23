'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';

interface Props {
  coin: string;
  onCancel: () => void;
}

export default function CoinLoader({ coin, onCancel }: Props) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const check = useCallback(async () => {
    if (!accessToken) return false;
    try {
      const res = await fetch(`${getApiUrl()}/api/funding/${coin}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          router.push(`/coin/${coin}`);
          return true;
        }
      }
    } catch {}
    return false;
  }, [coin, router, accessToken]);

  useEffect(() => {
    check();

    const pollId = setInterval(async () => {
      setAttempt(a => a + 1);
      const found = await check();
      if (found) clearInterval(pollId);
    }, 2000);

    const timerId = setInterval(() => {
      setElapsed(e => e + 1);
    }, 1000);

    return () => {
      clearInterval(pollId);
      clearInterval(timerId);
    };
  }, [check]);

  return (
    <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-surface border border-border-bright rounded-xl p-8 flex flex-col items-center gap-5 min-w-64">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-border" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-blue text-sm">
            {coin.slice(0, 3)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-bold text-[#cdd9e5] mb-1">Завантаження {coin}</div>
          <div className="text-xs font-mono text-text-muted">Дані завантажуються в БД...</div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-text-dim">
          <span className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse" />
          <span>Перевірка #{attempt + 1} · {elapsed}с</span>
        </div>

        <button
          onClick={onCancel}
          className="text-xs font-mono text-text-muted hover:text-red transition-colors"
        >
          Скасувати
        </button>
      </div>
    </div>
  );
}