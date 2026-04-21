"use client";
import { useState, useMemo } from "react";
import { useFunding } from "@/lib/hooks/useFunding";
import type { FundingPair } from "@funding-monitor/types";
import Link from "next/link";

type SortKey = keyof Pick<
  FundingPair,
  "funding" | "basisReal" | "net" | "intervalHours"
>;

function getCountdown(ts: number | null): string {
  if (!ts) return "—";
  const ms = ts - Date.now();
  if (ms <= 0) return "0 хв";
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}г ${m % 60}хв` : `${m} хв`;
}

function Val({ v }: { v: number }) {
  const cls = v > 0 ? "text-green" : v < 0 ? "text-red" : "text-text-muted";
  return (
    <span className={`font-mono font-semibold text-xs ${cls}`}>
      {v > 0 ? "+" : ""}
      {v}%
    </span>
  );
}

export default function FundingTable() {
  const { report, loading } = useFunding();
  const [sortKey, setSortKey] = useState<SortKey>("funding");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const sorted = useMemo(() => {
    if (!report?.pairs) return [];
    return [...report.pairs].sort(
      (a, b) => sortDir * (a[sortKey] - b[sortKey]),
    );
  }, [report, sortKey, sortDir]);

  function sort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  function Th({ k, label }: { k?: SortKey; label: string }) {
    const active = k === sortKey;
    return (
      <th
        onClick={k ? () => sort(k) : undefined}
        className={`px-4 py-2.5 text-left text-[10px] font-mono uppercase tracking-widest
          ${k ? "cursor-pointer select-none" : ""}
          ${active ? "text-blue" : "text-text-dim hover:text-text-muted"}`}
      >
        {label} {k && (active ? (sortDir === -1 ? "↓" : "↑") : "↕")}
      </th>
    );
  }

  if (loading) {
    return (
      <div className="border border-border-bright rounded-lg overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-12 border-b border-border animate-pulse bg-surface"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="border border-border-bright rounded-lg overflow-hidden overflow-x-auto">
      <table className="w-full border-collapse text-sm min-w-[860px]">
        <thead>
          <tr className="bg-surface border-b border-border-bright">
            <Th label="#" />
            <Th label="Монета" />
            <Th k="funding" label="Фандинг" />
            <Th k="intervalHours" label="Частота" />
            <Th label="Наступна виплата" />
            <Th k="basisReal" label="Спред" />
            <Th k="net" label="Чистий" />
            <Th label="Avg Спот" />
            <Th label="Avg Ф'юч" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            const urgent = (p.minutesUntil ?? 999) <= 15;
            return (
              <tr
                key={p.coin}
                className="border-b border-border hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-2.5 font-mono text-[11px] text-text-dim">
                  {i + 1}
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/coin/${p.coin}`}
                    className="font-mono font-bold text-[14px] text-[#cdd9e5] hover:text-blue transition-colors"
                  >
                    {p.coin}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <Val v={p.funding} />
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1 bg-blue/10 border border-blue/20 text-blue px-2 py-0.5 rounded text-[11px] font-mono font-semibold">
                    ⏱ {p.intervalHours}г
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-mono text-xs text-[#cdd9e5]">
                    {p.nextFundingTime ?? "—"}
                  </div>
                  <div
                    className={`text-[11px] font-mono mt-0.5 ${urgent ? "text-red" : "text-yellow"}`}
                  >
                    через {getCountdown(p.nextFundingTs)}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Val v={p.basisReal} />
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold border
                    ${
                      p.net > 0
                        ? "bg-green/10 text-green border-green/20"
                        : "bg-red/10 text-red border-red/20"
                    }`}
                  >
                    {p.net > 0 ? "+" : ""}
                    {p.net}%
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-text-muted">
                  {p.avgSpotBuy}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-text-muted">
                  {p.avgFutSell}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
