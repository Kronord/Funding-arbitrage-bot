import prisma from "./client";
import type { FundingPair as FundingPairType } from "@funding-monitor/types";

// ── Зберегти новий знімок фандингу ──
export async function saveFundingSnapshot(
  pairs: FundingPairType[],
  orderSize: number,
) {
  return prisma.fundingSnapshot.create({
    data: {
      orderSize,
      exchange: "kucoin",
      pairs: {
        create: pairs.map((p) => ({
          coin: p.coin,
          exchange: p.exchange,
          funding: p.funding,
          intervalHours: p.intervalHours,
          nextFundingTs: p.nextFundingTs ? BigInt(p.nextFundingTs) : null,
          nextFundingTime: p.nextFundingTime,
          minutesUntil: p.minutesUntil,
          basisReal: p.basisReal,
          net: p.net,
          avgSpotBuy: p.avgSpotBuy,
          avgFutSell: p.avgFutSell,
        })),
      },
    },
    include: { pairs: true },
  });
}

// ── Отримати останній знімок ──
export async function getLatestSnapshot() {
  const snapshot = await prisma.fundingSnapshot.findFirst({
    orderBy: { createdAt: "desc" },
    include: { pairs: { orderBy: { funding: "desc" } } },
  });

  if (!snapshot) return null;

  return {
    updatedAt: snapshot.createdAt.toLocaleTimeString("uk-UA", {
      timeZone: "Europe/Kyiv",
    }),
    orderSize: snapshot.orderSize,
    pairs: snapshot.pairs.map((p) => ({
      coin: p.coin,
      exchange: p.exchange as "kucoin",
      funding: p.funding,
      intervalHours: p.intervalHours,
      nextFundingTs: p.nextFundingTs ? Number(p.nextFundingTs) : null,
      nextFundingTime: p.nextFundingTime,
      minutesUntil: p.minutesUntil,
      basisReal: p.basisReal,
      net: p.net,
      avgSpotBuy: p.avgSpotBuy,
      avgFutSell: p.avgFutSell,
    })),
  };
}

// ── Зберегти/оновити деталі контракту ──
export async function saveContractDetail(coin: string, details: any) {
  const data = {
    symbol: details.symbol,
    markPrice: parseFloat(details.markPrice) || 0,
    indexPrice: parseFloat(details.indexPrice) || 0,
    funding: details.funding != null ? parseFloat(details.funding) : null,
    intervalHours: parseFloat(details.intervalHours) || 0,
    nextFundingTs: details.nextFundingTs ? BigInt(details.nextFundingTs) : null,
    nextFundingTime: details.nextFundingTime ?? null,
    minutesUntil: details.minutesUntil ? parseInt(details.minutesUntil) : null,
    maxLeverage: details.maxLeverage ? parseFloat(details.maxLeverage) : null,
    takerFeeRate: details.takerFeeRate
      ? parseFloat(details.takerFeeRate)
      : null,
    makerFeeRate: details.makerFeeRate
      ? parseFloat(details.makerFeeRate)
      : null,
    openInterest: details.openInterest
      ? parseFloat(details.openInterest)
      : null,
    volume24h: details.volume24h ? parseFloat(details.volume24h) : null,
    turnover24h: details.turnover24h ? parseFloat(details.turnover24h) : null,
    asksJson: JSON.stringify(details.asks),
    bidsJson: JSON.stringify(details.bids),
  };

  return prisma.contractDetail.upsert({
    where: { coin_exchange: { coin, exchange: "kucoin" } },
    update: data,
    create: { coin, exchange: "kucoin", ...data },
  });
}

// ── Отримати деталі контракту з БД ──
export async function getContractDetail(coin: string) {
  const d = await prisma.contractDetail.findUnique({
    where: { coin_exchange: { coin: coin.toUpperCase(), exchange: "kucoin" } },
  });
  if (!d) return null;

  return {
    ...d,
    nextFundingTs: d.nextFundingTs ? Number(d.nextFundingTs) : null,
    asks: JSON.parse(d.asksJson),
    bids: JSON.parse(d.bidsJson),
  };
}

// ── Зберегти історію фандингу ──
export async function saveFundingHistory(
  coin: string,
  history: { rate: number; time: number; timeStr: string }[],
) {
  // upsert кожного запису — не дублюємо якщо вже є
  await Promise.all(
    history.map((h) =>
      prisma.fundingHistory.upsert({
        where: {
          coin_exchange_timepoint: {
            coin,
            exchange: "kucoin",
            timepoint: BigInt(h.time),
          },
        },
        update: {},
        create: {
          coin,
          exchange: "kucoin",
          rate: h.rate,
          timepoint: BigInt(h.time),
          timeStr: h.timeStr,
        },
      }),
    ),
  );
}

// ── Отримати історію фандингу з БД ──
export async function getFundingHistory(coin: string, days: number) {
  const from = BigInt(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.fundingHistory.findMany({
    where: {
      coin: coin.toUpperCase(),
      exchange: "kucoin",
      timepoint: { gte: from },
    },
    orderBy: { timepoint: "asc" },
  });

  return rows.map((r) => ({
    rate: r.rate,
    time: Number(r.timepoint),
    timeStr: r.timeStr,
  }));
}

// ── Зберегти klines ──
export async function saveKlines(
  coin: string,
  granularity: number,
  klines: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[],
) {
  await Promise.all(
    klines.map((k) =>
      prisma.kline.upsert({
        where: {
          coin_exchange_granularity_time: {
            coin,
            exchange: "kucoin",
            granularity,
            time: BigInt(k.time),
          },
        },
        update: {
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
        },
        create: {
          coin,
          exchange: "kucoin",
          granularity,
          time: BigInt(k.time),
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
        },
      }),
    ),
  );
}

// ── Отримати klines з БД ──
export async function getKlines(
  coin: string,
  granularity: number,
  days: number,
) {
  const from = BigInt(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.kline.findMany({
    where: {
      coin: coin.toUpperCase(),
      exchange: "kucoin",
      granularity,
      time: { gte: from },
    },
    orderBy: { time: "asc" },
  });

  return rows.map((r) => ({
    time: Number(r.time),
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
  }));
}

// ── Очистити старі знімки (залишаємо останні 100) ──
export async function cleanOldSnapshots() {
  const snapshots = await prisma.fundingSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true },
    skip: 100,
  });

  if (snapshots.length > 0) {
    await prisma.fundingSnapshot.deleteMany({
      where: { id: { in: snapshots.map((s) => s.id) } },
    });
  }
}

// ── Налаштування ──
export async function getSetting(key: string, defaultValue: string) {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? defaultValue;
}

export async function setSetting(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
