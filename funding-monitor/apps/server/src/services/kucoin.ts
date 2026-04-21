import axios from 'axios';
import type { FundingPair } from '@funding-monitor/types';

const SPOT_FEE  = parseFloat(process.env.SPOT_FEE  || '0.001');
const FUT_FEE   = parseFloat(process.env.FUT_FEE   || '0.0006');
const TOTAL_FEE = (SPOT_FEE + FUT_FEE) * 2;

interface SpotTicker {
  symbol: string;
  buy: string;
}

interface FuturesContract {
  symbol: string;
  markPrice: string;
  fundingFeeRate: number;
  multiplier: number;
  currentFundingRateGranularity?: number;
  granularity?: number;
  effectiveFundingRateCycleStartTime?: number;
}

interface OrderBookEntry { asks: [string, string][]; bids: [string, string][]; }

// ── Середня ціна виконання по стакану ──
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

// ── Час наступної виплати ──
function getFundingTimeInfo(contract: FuturesContract) {
  const granularityMs =
    contract.currentFundingRateGranularity ||
    contract.granularity ||
    28800000;

  const intervalHours = granularityMs / 3600000;
  const now = Date.now();

  let nextFundingTs: number;

  const cycleStart = contract.effectiveFundingRateCycleStartTime;

  if (cycleStart) {
    // Рахуємо скільки інтервалів пройшло з cycleStart
    const elapsed = now - cycleStart;
    const intervalsPassed = Math.floor(elapsed / granularityMs);
    nextFundingTs = cycleStart + (intervalsPassed + 1) * granularityMs;
  } else {
    // Рахуємо по стандартних інтервалах від початку доби UTC
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const elapsed = now - startOfDay.getTime();
    const idx = Math.floor(elapsed / granularityMs);
    nextFundingTs = startOfDay.getTime() + (idx + 1) * granularityMs;
  }

  const msUntil = nextFundingTs - now;
  const minutesUntil = Math.max(0, Math.round(msUntil / 60000));
  const nextFundingTime = new Date(nextFundingTs).toLocaleTimeString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
  });

  return { intervalHours, nextFundingTime, minutesUntil, nextFundingTs };
}

// ── Ринкові дані ──
async function getMarketData() {
  const [spotRes, contractsRes] = await Promise.all([
    axios.get('https://api.kucoin.com/api/v1/market/allTickers'),
    axios.get('https://api-futures.kucoin.com/api/v1/contracts/active'),
  ]);
  return {
    spot:      spotRes.data.data.ticker      as SpotTicker[],
    contracts: contractsRes.data.data        as FuturesContract[],
  };
}

// ── Стакан ──
async function getOrderBook(
  spotSymbol: string,
  futSymbol: string
): Promise<OrderBookEntry | null> {
  try {
    const [spotOB, futOB] = await Promise.all([
      axios.get(`https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=${spotSymbol}`),
      axios.get(`https://api-futures.kucoin.com/api/v1/level2/depth20?symbol=${futSymbol}`),
    ]);
    return {
      asks: spotOB.data.data.asks,
      bids: futOB.data.data.bids,
    };
  } catch {
    return null;
  }
}

// ── Головна функція ──
export async function fetchKucoinFunding(orderSize: number): Promise<FundingPair[]> {
  const data = await getMarketData();
  const contractMap = new Map(data.contracts.map(c => [c.symbol, c]));

  // Крок 1 — кандидати по фандингу
  const candidates: Array<{
    coin: string; spotSymbol: string; futSymbol: string;
    is1000: boolean; multiplier: number; funding: number;
    intervalHours: number; nextFundingTime: string | null;
    minutesUntil: number | null; nextFundingTs: number | null;
  }> = [];

  data.spot.forEach(s => {
    if (!s.symbol.endsWith('-USDT')) return;
    const coin = s.symbol.replace('-USDT', '');
    let futSymbol = `${coin}USDTM`;
    if (coin === 'BTC') futSymbol = 'XBTUSDTM';

    const is1000 = !contractMap.has(futSymbol) && contractMap.has(`1000${coin}USDTM`);
    const resolvedSymbol = is1000 ? `1000${coin}USDTM` : futSymbol;
    const contract = contractMap.get(resolvedSymbol);
    if (!contract?.markPrice || !s.buy) return;

    const fundingRate = contract.fundingFeeRate != null
      ? parseFloat((contract.fundingFeeRate * 100).toFixed(4))
      : null;
    if (!fundingRate || fundingRate <= 0) return;

    const timeInfo = getFundingTimeInfo(contract);

    candidates.push({
      coin, spotSymbol: s.symbol, futSymbol: resolvedSymbol,
      is1000, multiplier: contract.multiplier || 1,
      funding: fundingRate, ...timeInfo,
    });
  });

  const top40 = candidates.sort((a, b) => b.funding - a.funding).slice(0, 40);

  // Крок 2 — стакани паралельно
  const books = await Promise.all(
    top40.map(c => getOrderBook(c.spotSymbol, c.futSymbol))
  );

  // Крок 3 — розрахунок
  const pairs: FundingPair[] = [];

  top40.forEach((c, i) => {
    const ob = books[i];
    if (!ob) return;

    const futMult    = c.is1000 ? 1000 : 1;
    const avgSpotBuy = getAvgFillPrice(ob.asks, orderSize, 1);
    const avgFutSell = getAvgFillPrice(ob.bids, orderSize, c.multiplier / futMult);
    if (!avgSpotBuy || !avgFutSell) return;

    const basisReal = ((avgFutSell - avgSpotBuy) / avgSpotBuy) * 100;
    const net       = c.funding + basisReal - TOTAL_FEE * 100;

    pairs.push({
      coin: c.coin,
      exchange: 'kucoin',
      funding: c.funding,
      intervalHours: c.intervalHours,
      nextFundingTime: c.nextFundingTime,
      nextFundingTs: c.nextFundingTs,
      minutesUntil: c.minutesUntil,
      basisReal: parseFloat(basisReal.toFixed(3)),
      net: parseFloat(net.toFixed(3)),
      avgSpotBuy: avgSpotBuy.toFixed(6),
      avgFutSell: avgFutSell.toFixed(6),
    });
  });

  return pairs.sort((a, b) => b.funding - a.funding).slice(0, 25);
}

// ── Деталі монети ──
export async function fetchCoinDetails(coin: string): Promise<any> {
  const futSymbol = coin === 'BTC' ? 'XBTUSDTM' : `${coin}USDTM`;
  const alt1000   = `1000${coin}USDTM`;

  const [contractRes, spotRes] = await Promise.all([
    axios.get(`https://api-futures.kucoin.com/api/v1/contracts/${futSymbol}`)
      .catch(() => axios.get(`https://api-futures.kucoin.com/api/v1/contracts/${alt1000}`)),
    axios.get(`https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=${coin}-USDT`),
  ]);

  const contract = contractRes.data.data;
  const is1000   = contract.symbol.startsWith('1000');
  const ob       = spotRes.data.data;

  const fundingRate = contract.fundingFeeRate != null
    ? parseFloat((contract.fundingFeeRate * 100).toFixed(4))
    : null;

  const timeInfo = getFundingTimeInfo(contract);

  return {
    coin,
    exchange: 'kucoin' as const,
    symbol: contract.symbol,
    markPrice: is1000
      ? parseFloat(contract.markPrice) / 1000
      : parseFloat(contract.markPrice),
    indexPrice: is1000
      ? parseFloat(contract.indexPrice) / 1000
      : parseFloat(contract.indexPrice),
    funding: fundingRate,
    ...timeInfo,
    maxLeverage: contract.maxLeverage,
    takerFeeRate: contract.takerFeeRate,
    makerFeeRate: contract.makerFeeRate,
    openInterest: contract.openInterest,
    volume24h: contract.volumeOf24h,
    turnover24h: contract.turnoverOf24h,
    // Стакан для калькулятора
    asks: ob.asks as [string, string][],
    bids: ob.bids as [string, string][],
  };
}

// ── Історія фандингу ──
export async function fetchFundingHistory(
  coin: string,
  days: number
): Promise<{ rate: number; time: number; timeStr: string }[]> {
  const futSymbol = coin === 'BTC' ? 'XBTUSDTM' : `${coin}USDTM`;
  const alt1000   = `1000${coin}USDTM`;

  const to   = Date.now();
  const from = to - days * 24 * 60 * 60 * 1000;

  // Пробуємо основний символ, якщо 404 — 1000-ний
  let symbol = futSymbol;
  let res;
  try {
    res = await axios.get(
      `https://api-futures.kucoin.com/api/v1/contract/funding-rates?symbol=${futSymbol}&from=${from}&to=${to}`
    );
  } catch {
    symbol = alt1000;
    res = await axios.get(
      `https://api-futures.kucoin.com/api/v1/contract/funding-rates?symbol=${alt1000}&from=${from}&to=${to}`
    );
  }

  const data = res.data.data as { fundingRate: number; timepoint: number }[];

  return data
    .map(d => ({
      rate: parseFloat((d.fundingRate * 100).toFixed(4)),
      time: d.timepoint,
      timeStr: new Date(d.timepoint).toLocaleString('uk-UA', {
        timeZone: 'Europe/Kyiv',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }))
    .sort((a, b) => a.time - b.time);
}

// ── Сума фандингу за період ──
export async function fetchFundingSummary(
  coin: string,
  days: number
): Promise<{ totalRate: number; count: number; avgRate: number; perDay: number }> {
  const history = await fetchFundingHistory(coin, days);

  const totalRate = parseFloat(
    history.reduce((sum, h) => sum + h.rate, 0).toFixed(4)
  );
  const count   = history.length;
  const avgRate = count > 0 ? parseFloat((totalRate / count).toFixed(4)) : 0;
  const perDay  = parseFloat((totalRate / days).toFixed(4));

  return { totalRate, count, avgRate, perDay };
}

// ── Графік ціни (klines) ──
export async function fetchPriceChart(
  coin: string,
  granularity: number = 60,    // хвилини: 1, 5, 15, 30, 60, 120, 240, 480, 720, 1440
  days: number = 1
): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]> {
  const futSymbol = coin === 'BTC' ? 'XBTUSDTM' : `${coin}USDTM`;
  const alt1000   = `1000${coin}USDTM`;

  const to   = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;

  let res;
  try {
    res = await axios.get(
      `https://api-futures.kucoin.com/api/v1/kline/query?symbol=${futSymbol}&granularity=${granularity}&from=${from * 1000}&to=${to * 1000}`
    );
  } catch {
    res = await axios.get(
      `https://api-futures.kucoin.com/api/v1/kline/query?symbol=${alt1000}&granularity=${granularity}&from=${from * 1000}&to=${to * 1000}`
    );
  }

  const raw = res.data.data as number[][];

  // KuCoin повертає [time, open, high, low, close, volume]
  return raw.map(k => ({
    time:   k[0],
    open:   k[1],
    high:   k[2],
    low:    k[3],
    close:  k[4],
    volume: k[5],
  }));
}

// ── Розрахунок спреду по кастомних цінах входу ──
export function calcSpreadByEntryPrice(
  spotEntryPrice: number,
  futEntryPrice: number,
  asks: [string, string][],
  bids: [string, string][],
  orderSize: number,
  multiplier: number = 1
): {
  avgSpotAsk: number | null;
  avgFutBid: number | null;
  basisReal: number | null;
  basisEntry: number;
  netEntry: number;
} {
  // Середня ціна купівлі спот (asks — ми купуємо)
  const avgSpotAsk = getAvgFillPrice(asks, orderSize, 1);
  // Середня ціна продажу ф'юч (bids — ми продаємо/шортимо)
  const avgFutBid  = getAvgFillPrice(bids, orderSize, multiplier);

  const basisReal = avgSpotAsk && avgFutBid
    ? parseFloat((((avgFutBid - avgSpotAsk) / avgSpotAsk) * 100).toFixed(3))
    : null;

  // Базис по цінах входу користувача
  const basisEntry = parseFloat(
    (((futEntryPrice - spotEntryPrice) / spotEntryPrice) * 100).toFixed(3)
  );

  const netEntry = parseFloat(
    (basisEntry - TOTAL_FEE * 100).toFixed(3)
  );

  return { avgSpotAsk, avgFutBid, basisReal, basisEntry, netEntry };
}

// ── Фандинг для дашборду (3д і 7д) ──
export async function fetchDashboardFundingSummaries(
  coins: string[]
): Promise<Record<string, { sum3d: number; sum7d: number }>> {
  const results: Record<string, { sum3d: number; sum7d: number }> = {};

  // Запити паралельно по 5 монет за раз щоб не перевантажити API
  const chunks = [];
  for (let i = 0; i < coins.length; i += 5) {
    chunks.push(coins.slice(i, i + 5));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async coin => {
        try {
          const [s3, s7] = await Promise.all([
            fetchFundingSummary(coin, 3),
            fetchFundingSummary(coin, 7),
          ]);
          results[coin] = { sum3d: s3.totalRate, sum7d: s7.totalRate };
        } catch {
          results[coin] = { sum3d: 0, sum7d: 0 };
        }
      })
    );
  }

  return results;
}