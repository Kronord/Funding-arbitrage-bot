'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTopBasis } from '@/lib/hooks/useTopBasis';
import type { FundingPair } from '@funding-monitor/types';

type SortKey = 'basisEntry' | 'basisExit' | 'funding' | 'net';

function Val({ v }: { v: number | null }) {
  if (v === null || v === undefined) return <span className="text-text-dim">—</span>;
  const cls = v > 0 ? 'text-green' : v < 0 ? 'text-red' : 'text-text-muted';
  return <span className={`font-mono font-semibold text-xs ${cls}`}>{v > 0 ? '+' : ''}{v}%</span>;
}

function getCountdown(ts: number | null): string {
  if (!ts) return '—';
  const ms = ts - Date.now();
  if (ms <= 0) return '0 хв';
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}г ${m % 60}хв` : `${m} хв`;
}

export default function TopBasisPage() {
  const [limit, setLimit]     = useState(25);
  const [sortKey, setSortKey] = useState<SortKey>('basisEntry');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const { report, loading } = useTopBasis(limit);

  const sorted = useMemo(() => {
    if (!report?.pairs) return [];
    return [...report.pairs].sort((a, b) => {
      const aVal = (a[sortKey] as number) ?? 0;
      const bVal = (b[sortKey] as number) ?? 0;
      return sortDir * (aVal - bVal);
    });
  }, [report, sortKey, sortDir]);

  function sort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortKey(key); setSortDir(-1); }
  }

  function Th({ k, label }: { k?: SortKey; label: string }) {
    const active = k === sortKey;
    return (
      <th
        onClick={k ? () => sort(k) : undefined}
        className={`px-4 py-2.5 text-left text-[10px] font-mono uppercase tracking-widest
          ${k ? 'cursor-pointer select-none' : ''}
          ${active ? 'text-blue' : 'text-text-dim hover:text-text-muted'}`}
      >
        {label}{k && (active ? (sortDir === -1 ? ' ↓' : ' ↑') : ' ↕')}
      </th>
    );
  }

  return (
    <div className="space-y-5">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#cdd9e5]">Топ базис</h2>
          <p className="text-sm text-text-muted font-mono mt-1">
            Монети з найвищим плюсовим базисом входу
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Ліміт */}
          <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5">
            <span className="text-[10px] font-mono text-text-dim">Показати</span>
            {[10, 25, 50].map(l => (
              <button
                key={l}
                onClick={() => setLimit(l)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors
                  ${limit === l
                    ? 'bg-blue/20 text-blue'
                    : 'text-text-muted hover:text-[#cdd9e5]'}`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Час оновлення */}
          {report?.updatedAt && (
            <span className="text-[11px] font-mono text-text-dim">
              Оновлено: {report.updatedAt}
            </span>
          )}
        </div>
      </div>

      {/* Статистика */}
      {report && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Монет з плюс базисом',
              value: report.pairs.length,
              cls:   'text-green',
            },
            {
              label: 'Макс базис входу',
              value: report.pairs[0]
                ? `+${report.pairs[0].basisEntry}%`
                : '—',
              cls: 'text-blue',
            },
            {
              label: 'Середній базис',
              value: report.pairs.length
                ? `+${(report.pairs.reduce((s, p) => s + p.basisEntry, 0) / report.pairs.length).toFixed(3)}%`
                : '—',
              cls: 'text-yellow',
            },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-lg px-4 py-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-dim mb-1">
                {s.label}
              </div>
              <div className={`text-lg font-mono font-bold ${s.cls}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Таблиця */}
      <div className="border border-border-bright rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse text-sm min-w-[800px]">
          <thead>
            <tr className="bg-surface border-b border-border-bright">
              <Th label="#" />
              <Th label="Монета" />
              <Th k="basisEntry" label="Базис входу" />
              <Th k="basisExit"  label="Базис виходу" />
              <Th k="funding"    label="Фандинг" />
              <Th k="net"        label="Чистий" />
              <Th label="Частота" />
              <Th label="Наступна виплата" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-surface rounded animate-pulse w-16" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center font-mono text-xs text-text-dim">
                  Немає монет з плюсовим базисом
                </td>
              </tr>
            ) : (
              sorted.map((p, i) => {
                const urgent = (p.minutesUntil ?? 999) <= 15;
                return (
                  <tr key={p.coin} className="border-b border-border hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-text-dim">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/coin/${p.coin}`}
                        className="font-mono font-bold text-[14px] text-[#cdd9e5] hover:text-blue transition-colors"
                      >
                        {p.coin}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5"><Val v={p.basisEntry} /></td>
                    <td className="px-4 py-2.5"><Val v={p.basisExit} /></td>
                    <td className="px-4 py-2.5"><Val v={p.funding} /></td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold border
                        ${p.net > 0
                          ? 'bg-green/10 text-green border-green/20'
                          : 'bg-red/10 text-red border-red/20'}`}>
                        {p.net > 0 ? '+' : ''}{p.net}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 bg-blue/10 border border-blue/20
                        text-blue px-2 py-0.5 rounded text-[11px] font-mono font-semibold">
                        ⏱ {p.intervalHours}г
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-mono text-xs text-[#cdd9e5]">{p.nextFundingTime ?? '—'}</div>
                      <div className={`text-[11px] font-mono mt-0.5 ${urgent ? 'text-red' : 'text-yellow'}`}>
                        через {getCountdown(p.nextFundingTs)}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}