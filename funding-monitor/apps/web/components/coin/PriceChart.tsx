"use client";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { usePriceChart } from "@/lib/hooks/useCoin";

const GRANULARITIES = [
  { label: "1хв", value: 1, days: 1 },
  { label: "15хв", value: 15, days: 1 },
  { label: "1г", value: 60, days: 3 },
  { label: "4г", value: 240, days: 7 },
  { label: "1д", value: 1440, days: 30 },
];

export default function PriceChart({ coin }: { coin: string }) {
  const [gran, setGran] = useState(GRANULARITIES[2]);
  const { data, loading } = usePriceChart(coin, gran.value, gran.days);

  const chartData = data.map((k) => ({
    time: new Date(k.time).toLocaleString("uk-UA", {
      timeZone: "Europe/Kyiv",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    price: k.close,
    high: k.high,
    low: k.low,
  }));

  const minPrice = Math.min(...data.map((k) => k.low));
  const maxPrice = Math.max(...data.map((k) => k.high));

  if (!data || data.length === 0) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <h3 className="text-sm font-bold text-[#cdd9e5] mb-4">Графік ціни</h3>
      <div className="h-52 flex items-center justify-center text-text-dim font-mono text-xs">
        Дані графіка ще завантажуються...
      </div>
    </div>
  );
}

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#cdd9e5]">Графік ціни</h3>
        <div className="flex gap-1">
          {GRANULARITIES.map((g) => (
            <button
              key={g.value}
              onClick={() => setGran(g)}
              className={`px-3 py-1 rounded text-[11px] font-mono transition-colors
                ${
                  gran.value === g.value
                    ? "bg-blue/20 text-blue border border-blue/30"
                    : "text-text-muted hover:text-[#cdd9e5] border border-transparent"
                }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-52 flex items-center justify-center text-text-dim font-mono text-xs">
          Завантаження...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1c2333"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{
                fill: "#37474f",
                fontSize: 10,
                fontFamily: "JetBrains Mono",
              }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(chartData.length / 6)}
            />
            <YAxis
              domain={[minPrice * 0.999, maxPrice * 1.001]}
              tick={{
                fill: "#37474f",
                fontSize: 10,
                fontFamily: "JetBrains Mono",
              }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v.toFixed(4)}`}
              width={80}
            />
            <Tooltip
              contentStyle={{
                background: "#0e1419",
                border: "1px solid #2d3a4a",
                borderRadius: 6,
                fontSize: 11,
                fontFamily: "JetBrains Mono",
              }}
              labelStyle={{ color: "#546e7a", marginBottom: 4 }}
              itemStyle={{ color: "#58a6ff" }}
              formatter={(v) => [`$${Number(v).toFixed(6)}`, "Ціна"]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#58a6ff"
              strokeWidth={1.5}
              fill="url(#priceGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
