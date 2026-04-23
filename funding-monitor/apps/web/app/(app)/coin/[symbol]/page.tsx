"use client";
import { use, useMemo } from "react";
import Link from "next/link";
import { useCoinDetails } from "@/lib/hooks/useCoin";
import CoinHeader from "@/components/coin/CoinHeader";
import PriceChart from "@/components/coin/PriceChart";
import FundingChart from "@/components/coin/FundingChart";
import EntryCalculator from "@/components/coin/EntryCalculator";
import FundingSummaryBlock from "@/components/coin/FundingSummaryBlock";

export default function CoinPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const symbol = resolvedParams?.symbol;
  const coin = useMemo(() => symbol?.toUpperCase() || "", [symbol]);

  const { data, loading, error } = useCoinDetails(coin);
  if (!coin || coin === "[OBJECT PROMISE]") {
    return <div className="animate-pulse h-10 bg-surface rounded" />;
  }
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-surface border border-border rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-text-muted font-mono">
        <div className="text-4xl mb-4">⚠️</div>
        <div className="text-sm">Монету {coin} не знайдено</div>
        <Link
          href="/dashboard"
          className="mt-4 text-blue text-xs hover:underline"
        >
          ← Повернутись на дашборд
        </Link>
      </div>
    );
  }

  if (error === 'not_found') {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-text-muted font-mono">
      <div className="text-4xl mb-4">⏳</div>
      <div className="text-sm text-[#cdd9e5]">Монету {coin} ще немає в базі даних</div>
      <p className="text-xs text-text-dim mt-2">
        Дані з'являться після наступного циклу моніторингу (кожні 2 хвилини)
      </p>
      <Link href="/dashboard" className="mt-4 text-blue text-xs hover:underline">
        ← Повернутись на дашборд
      </Link>
    </div>
  );
}

  return (
    <div className="space-y-5">
      {/* Хлібні крихти */}
      <div className="flex items-center gap-2 text-xs font-mono text-text-dim">
        <Link href="/dashboard" className="hover:text-blue transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-[#cdd9e5]">{coin}</span>
      </div>

      {/* Заголовок з основною інфо */}
      <CoinHeader d={data} />

      {/* Графік ціни */}
      <PriceChart coin={coin} />

      {/* Графік фандингу + список */}
      <FundingChart coin={coin} />

      {/* Сума виплат */}
      <FundingSummaryBlock coin={coin} />

      {/* Калькулятор входу */}
      <EntryCalculator coin={coin} details={data} />
    </div>
  );
}
