import prisma from "./client";
import type { FundingPair as FundingPairType } from "@funding-monitor/types";

const SPOT_FEE  = parseFloat(process.env.SPOT_FEE  || '0.001');
const FUT_FEE   = parseFloat(process.env.FUT_FEE   || '0.0006');
const TOTAL_FEE = (SPOT_FEE + FUT_FEE) * 2;
const ORDER_SIZE = parseFloat(process.env.ORDER_SIZE_USDT || '100');

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
          basisReal: p.basisEntry, 
          basisEntry: p.basisEntry,
          basisExit: p.basisExit ?? null,
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
      basisEntry: p.basisEntry ?? p.basisReal,
      basisExit: p.basisExit ?? null,          
      net: p.net,
      avgSpotBuy: p.avgSpotBuy,
      avgFutSell: p.avgFutSell,
    })),
  };
}

function getAvgFillPrice(
  orders: [string, string][],
  usdtAmount: number,
  multiplier = 1
): number | null {
  let remaining = usdtAmount;
  let totalCoins = 0;
  let totalUsdt = 0;

  for (const [priceStr, sizeStr] of orders) {
    const price = parseFloat(priceStr);
    const size  = parseFloat(sizeStr) * multiplier;
    const levelUsdt = price * size;
    if (remaining <= 0) break;

    if (levelUsdt >= remaining) {
      totalCoins += remaining / price;
      totalUsdt  += remaining;
      remaining   = 0;
    } else {
      totalCoins += size;
      totalUsdt  += levelUsdt;
      remaining  -= levelUsdt;
    }
  }
  return remaining > 0 ? null : totalUsdt / totalCoins;
}

export async function saveContractDetail(coin: string, details: any) {
  // ── Розрахунок базису зі стакану ──
  let basisEntry: number | null = null;
  let basisExit:  number | null = null;

  const asks: [string, string][] = details.asks || [];
  const bids: [string, string][] = details.bids || [];

  if (asks.length > 0 && bids.length > 0) {
    // Вхід: купуємо спот по asks, шортимо ф'юч по bids
    const avgSpotAsk = getAvgFillPrice(asks, ORDER_SIZE, 1);
    const avgFutBid  = getAvgFillPrice(bids, ORDER_SIZE, 1);

    if (avgSpotAsk && avgFutBid) {
      basisEntry = parseFloat(
        (((avgFutBid - avgSpotAsk) / avgSpotAsk) * 100).toFixed(3)
      );
    }

    // Вихід: продаємо спот по bids, закриваємо ф'юч по asks
    const avgSpotBid = getAvgFillPrice(bids, ORDER_SIZE, 1);
    const avgFutAsk  = getAvgFillPrice(asks, ORDER_SIZE, 1);

    if (avgSpotBid && avgFutAsk) {
      basisExit = parseFloat(
        (((avgSpotBid - avgFutAsk) / avgFutAsk) * 100).toFixed(3)
      );
    }
  }

  const data = {
    symbol:          details.symbol,
    markPrice:       parseFloat(details.markPrice)     || 0,
    indexPrice:      parseFloat(details.indexPrice)    || 0,
    funding:         details.funding  != null ? parseFloat(details.funding)  : null,
    intervalHours:   parseFloat(details.intervalHours) || 0,
    nextFundingTs:   details.nextFundingTs   ? BigInt(Math.round(details.nextFundingTs))   : null,
    nextFundingTime: details.nextFundingTime ?? null,
    minutesUntil:    details.minutesUntil    ? parseInt(details.minutesUntil)  : null,
    maxLeverage:     details.maxLeverage     ? parseFloat(details.maxLeverage) : null,
    takerFeeRate:    details.takerFeeRate    ? parseFloat(details.takerFeeRate): null,
    makerFeeRate:    details.makerFeeRate    ? parseFloat(details.makerFeeRate): null,
    openInterest:    details.openInterest    ? parseFloat(details.openInterest): null,
    volume24h:       details.volume24h       ? parseFloat(details.volume24h)   : null,
    turnover24h:     details.turnover24h     ? parseFloat(details.turnover24h) : null,
    asksJson:        JSON.stringify(asks),
    bidsJson:        JSON.stringify(bids),
    basisEntry,   // ← новий
    basisExit,    // ← новий
  };

  return prisma.contractDetail.upsert({
    where:  { coin_exchange: { coin, exchange: 'kucoin' } },
    update: data,
    create: { coin, exchange: 'kucoin', ...data },
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
  if (!history.length) return;
  // createMany з skipDuplicates замість N окремих upsert
  await prisma.fundingHistory.createMany({
    data: history.map((h) => ({
      coin,
      exchange: "kucoin",
      rate: h.rate,
      timepoint: BigInt(h.time),
      timeStr: h.timeStr,
    })),
    skipDuplicates: true,
  });
}

// ── Зберегти історію фандингу для багатьох монет одним запитом ──
export async function saveFundingHistoryBatch(
  batch: Record<string, { rate: number; time: number; timeStr: string }[]>,
) {
  const rows = Object.entries(batch).flatMap(([coin, history]) =>
    history.map((h) => ({
      coin,
      exchange: "kucoin",
      rate: h.rate,
      timepoint: BigInt(h.time),
      timeStr: h.timeStr,
    })),
  );
  if (!rows.length) return;
  await prisma.fundingHistory.createMany({ data: rows, skipDuplicates: true });
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
  if (!klines.length) return;
  await prisma.kline.createMany({
    data: klines.map((k) => ({
      coin,
      exchange: "kucoin",
      granularity,
      time: BigInt(k.time),
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
    })),
    skipDuplicates: true,
  });
}

// ── Зберегти klines для багатьох монет одним запитом ──
export async function saveKlinesBatch(
  batch: Record<
    string,
    {
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[]
  >,
  granularity: number,
) {
  const rows = Object.entries(batch).flatMap(([coin, klines]) =>
    klines.map((k) => ({
      coin,
      exchange: "kucoin",
      granularity,
      time: BigInt(k.time),
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
    })),
  );
  if (!rows.length) return;
  await prisma.kline.createMany({ data: rows, skipDuplicates: true });
}

// ── Зберегти деталі контрактів для багатьох монет ──
export async function saveContractDetailsBatch(detailsList: any[]) {
  // Prisma не підтримує upsertMany, тому паралельно але без затримок між монетами
  await Promise.all(
    detailsList.map((details) => saveContractDetail(details.coin, details)),
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
