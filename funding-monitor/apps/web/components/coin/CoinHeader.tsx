"use client";
import type { CoinDetails } from "@funding-monitor/types";

function Stat({
  label,
  value,
  cls = "",
}: {
  label: string;
  value: string;
  cls?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-text-dim mb-1">
        {label}
      </div>
      <div className={`text-sm font-mono font-bold ${cls}`}>{value}</div>
    </div>
  );
}

function getCountdown(ts: number | null): string {
  if (!ts) return "—";
  const ms = ts - Date.now();
  if (ms <= 0) return "0 хв";
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}г ${m % 60}хв` : `${m} хв`;
}

export default function CoinHeader({ d }: { d: CoinDetails }) {
  const urgent = (d.minutesUntil ?? 999) <= 15;

  return (
    <div>
      {/* Назва і основна інфо */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue/20 to-blue/5 border border-blue/20 rounded-xl flex items-center justify-center font-mono font-bold text-blue text-lg">
          {d.coin.slice(0, 2)}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#cdd9e5] font-mono">
            {d.coin}
            <span className="text-text-muted font-normal text-base">/USDT</span>
          </h2>
          <div className="text-xs text-text-dim font-mono mt-0.5">
            {d.symbol} · KuCoin Futures
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-mono font-bold text-[#cdd9e5]">
            ${d.markPrice.toFixed(6)}
          </div>
          <div className="text-xs text-text-muted font-mono">Mark Price</div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Stat
          label="Фандинг"
          value={`${d.funding !== null ? (d.funding > 0 ? "+" : "") + d.funding : "—"}%`}
          cls={d.funding && d.funding > 0 ? "text-green" : "text-red"}
        />
        <Stat label="Частота" value={`${d.intervalHours}г`} cls="text-blue" />
        <Stat
          label="Виплата"
          value={d.nextFundingTime ?? "—"}
          cls={urgent ? "text-red" : "text-yellow"}
        />
        <Stat
          label="Через"
          value={getCountdown(d.nextFundingTs)}
          cls={urgent ? "text-red" : "text-[#cdd9e5]"}
        />
        <Stat label="Index Price" value={`$${d.indexPrice.toFixed(6)}`} />
        <Stat
          label="Об'єм 24г"
          value={`$${(d.turnover24h / 1e6).toFixed(2)}M`}
        />
        <Stat label="Плече" value={`${d.maxLeverage}x`} />
      </div>
    </div>
  );
}
