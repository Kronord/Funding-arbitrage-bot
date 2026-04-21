'use client';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, ReferenceLine
} from 'recharts';
import { useFundingHistory, useFundingSummary } from '@/lib/hooks/useCoin';

const PERIODS = [
  { label: '1 день',  days: 1  },
  { label: '3 дні',   days: 3  },
  { label: '7 днів',  days: 7  },
  { label: '14 днів', days: 14 },
  { label: '30 днів', days: 30 },
];

export default function FundingChart({ coin }: { coin: string }) {
  const [days, setDays] = useState(7);
  const { data, loading }    = useFundingHistory(coin, days);
  const { data: summary }    = useFundingSummary(coin, days);

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#cdd9e5]">Історія фандингу</h3>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`px-3 py-1 rounded text-[11px] font-mono transition-colors
                ${days === p.days
                  ? 'bg-green/20 text-green border border-green/30'
                  : 'text-text-muted hover:text-[#cdd9e5] border border-transparent'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Саммарі */}
      {summary && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Сума фандингу', value: `${summary.totalRate > 0 ? '+' : ''}${summary.totalRate}%`, cls: summary.totalRate > 0 ? 'text-green' : 'text-red' },
            { label: 'Виплат',        value: summary.count,    cls: 'text-[#cdd9e5]' },
            { label: 'Середній',      value: `${summary.avgRate}%`, cls: 'text-blue' },
            { label: 'На день',       value: `${summary.perDay}%`,  cls: 'text-yellow' },
          ].map(s => (
            <div key={s.label} className="bg-bg border border-border rounded px-3 py-2">
              <div className="text-[10px] font-mono text-text-dim uppercase tracking-wider mb-1">{s.label}</div>
              <div className={`text-sm font-mono font-bold ${s.cls}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Графік */}
      {loading ? (
        <div className="h-40 flex items-center justify-center text-text-dim font-mono text-xs">
          Завантаження...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2333" vertical={false} />
            <XAxis
              dataKey="timeStr"
              tick={{ fill: '#37474f', fontSize: 9, fontFamily: 'JetBrains Mono' }}
              tickLine={false} axisLine={false}
              interval={Math.floor(data.length / 8)}
            />
            <YAxis
              tick={{ fill: '#37474f', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              tickLine={false} axisLine={false}
              tickFormatter={v => `${v}%`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: '#0e1419', border: '1px solid #2d3a4a',
                borderRadius: 6, fontSize: 11, fontFamily: 'JetBrains Mono',
              }}
              formatter={(v) => [`$${Number(v).toFixed(6)}`, 'Ціна']}
            />
            <ReferenceLine y={0} stroke="#2d3a4a" />
            <Bar dataKey="rate" radius={[2, 2, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.rate >= 0 ? '#39d353' : '#f85149'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Список виплат */}
      <div className="mt-4 max-h-48 overflow-y-auto">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-text-dim py-1.5 font-normal">Час</th>
              <th className="text-right text-text-dim py-1.5 font-normal">Фандинг</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((h, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-white/[0.02]">
                <td className="text-text-muted py-1.5">{h.timeStr}</td>
                <td className={`text-right py-1.5 font-bold ${h.rate >= 0 ? 'text-green' : 'text-red'}`}>
                  {h.rate >= 0 ? '+' : ''}{h.rate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}