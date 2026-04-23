"use client";
import { useState } from "react";
import { useFundingSummary } from "@/lib/hooks/useCoin";

const PERIODS = [1, 2, 3, 5, 7, 14, 30];

export default function FundingSummaryBlock({ coin }: { coin: string }) {
  const [days, setDays] = useState(3);
  const { data, loading } = useFundingSummary(coin, days);

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#cdd9e5]">
          Сума виплат фандингу
        </h3>
        <div className="flex gap-1 flex-wrap">
          {PERIODS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors
                ${
                  days === d
                    ? "bg-yellow/20 text-yellow border border-yellow/30"
                    : "text-text-muted hover:text-[#cdd9e5] border border-transparent"
                }`}
            >
              {d}д
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-20 flex items-center justify-center text-text-dim font-mono text-xs">
          Завантаження...
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: `Сума за ${days}д`,
              value: `${data.totalRate > 0 ? "+" : ""}${data.totalRate}%`,
              cls: data.totalRate > 0 ? "text-green" : "text-red",
              desc: "Загальний фандинг за період",
            },
            {
              label: "Виплат",
              value: data.count,
              cls: "text-[#cdd9e5]",
              desc: `По ${24 / (days > 0 ? 24 : 8)} на день`,
            },
            {
              label: "Середній",
              value: `${data.avgRate}%`,
              cls: "text-blue",
              desc: "Середня виплата",
            },
            {
              label: "На день",
              value: `${data.perDay}%`,
              cls: "text-yellow",
              desc: `≈ ${(data.perDay * 365).toFixed(1)}% APY`,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-bg border border-border rounded-lg px-4 py-3"
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-text-dim mb-1">
                {s.label}
              </div>
              <div className={`text-lg font-mono font-bold ${s.cls}`}>
                {s.value}
              </div>
              <div className="text-[10px] font-mono text-text-dim mt-1">
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
