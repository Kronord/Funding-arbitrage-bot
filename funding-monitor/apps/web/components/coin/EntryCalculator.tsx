'use client';
import { useState } from 'react';
import type { CoinDetails, CalcResult } from '@funding-monitor/types';
import { calcSpread } from '@/lib/hooks/useCoin';

export default function EntryCalculator({ coin, details }: { coin: string; details: CoinDetails }) {
  const [spotPrice, setSpotPrice]   = useState('');
  const [futPrice, setFutPrice]     = useState('');
  const [orderSize, setOrderSize]   = useState('100');
  const [result, setResult]         = useState<CalcResult | null>(null);
  const [loading, setLoading]       = useState(false);

  // Підставити поточні ціни
  function fillCurrent() {
    setSpotPrice(details.markPrice.toFixed(6));
    setFutPrice(details.markPrice.toFixed(6));
  }

  async function calculate() {
    if (!spotPrice || !futPrice) return;
    setLoading(true);
    const r = await calcSpread(coin, parseFloat(spotPrice), parseFloat(futPrice), parseFloat(orderSize));
    setResult(r);
    setLoading(false);
  }

  function Val({ v, suffix = '%' }: { v: number | null; suffix?: string }) {
    if (v === null) return <span className="text-text-muted">—</span>;
    const cls = v > 0 ? 'text-green' : v < 0 ? 'text-red' : 'text-text-muted';
    return <span className={`font-bold ${cls}`}>{v > 0 ? '+' : ''}{v}{suffix}</span>;
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <h3 className="text-sm font-bold text-[#cdd9e5] mb-4">Калькулятор входу</h3>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Ціна входу Спот', value: spotPrice, set: setSpotPrice, placeholder: details.markPrice.toFixed(6) },
          { label: 'Ціна входу Ф\'юч', value: futPrice, set: setFutPrice, placeholder: details.markPrice.toFixed(6) },
          { label: 'Об\'єм (USDT)',    value: orderSize, set: setOrderSize, placeholder: '100' },
        ].map(f => (
          <div key={f.label}>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-dim mb-1.5">
              {f.label}
            </label>
            <input
              type="number"
              value={f.value}
              onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="w-full bg-bg border border-border-bright text-[#cdd9e5] font-mono text-sm
                px-3 py-2 rounded-md focus:outline-none focus:border-blue/50 transition-colors"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={fillCurrent}
          className="px-4 py-2 text-xs font-mono border border-border-bright text-text-muted
            hover:text-[#cdd9e5] hover:border-blue/30 rounded-md transition-colors"
        >
          ← Поточна ціна
        </button>
        <button
          onClick={calculate}
          disabled={loading || !spotPrice || !futPrice}
          className="px-6 py-2 text-xs font-mono bg-blue/10 border border-blue/30 text-blue
            hover:bg-blue/20 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Розрахунок...' : 'Розрахувати'}
        </button>
      </div>

      {result && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Avg Спот (ask)',   value: <Val v={result.avgSpotAsk} suffix="" /> },
            { label: 'Avg Ф\'юч (bid)',  value: <Val v={result.avgFutBid}  suffix="" /> },
            { label: 'Спред (стакан)',   value: <Val v={result.basisReal} /> },
            { label: 'Спред (вхід)',     value: <Val v={result.basisEntry} /> },
            { label: 'Чистий (вхід)',    value: <Val v={result.netEntry} /> },
          ].map(s => (
            <div key={s.label} className="bg-bg border border-border rounded px-3 py-2.5">
              <div className="text-[10px] font-mono text-text-dim uppercase tracking-wider mb-1">{s.label}</div>
              <div className="text-sm font-mono">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] font-mono text-text-dim mt-4">
        * Спред (стакан) — середня ціна по відкритих ордерах на поточний об'єм · Спред (вхід) — по вашим цінам входу
      </p>
    </div>
  );
}