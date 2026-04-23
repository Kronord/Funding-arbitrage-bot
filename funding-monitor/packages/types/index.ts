// ── Біржі ──
export type Exchange = "kucoin" | "binance" | "bybit";

// ── Пара фандингу ──
export interface FundingPair {
  coin: string;
  exchange: Exchange;
  funding: number;
  intervalHours: number;
  nextFundingTime: string | null;
  nextFundingTs: number | null;
  minutesUntil: number | null;
  basisReal: number;
  net: number;
  avgSpotBuy: string;
  avgFutSell: string;
}

// ── Звіт ──
export interface FundingReport {
  pairs: FundingPair[];
  updatedAt: string;
  orderSize: number;
}

// ── Алерт ──
export type AlertCondition =
  | "funding_gt"
  | "funding_lt"
  | "net_gt"
  | "basis_gt";

export interface Alert {
  id: string;
  coin: string;
  exchange: Exchange;
  condition: AlertCondition;
  threshold: number;
  notifyTelegram: boolean;
  notifyWeb: boolean;
  active: boolean;
  createdAt: string;
  triggeredAt: string | null;
}

// ── Користувач ──
export interface User {
  id: string;
  email: string;
  telegramChatId: string | null;
  orderSize: number;
  createdAt: string;
}

// ── API відповіді ──
export interface ApiResponse<T> {
  data: T;
  ok: boolean;
  error?: string;
}

// ── Деталі монети ──
export interface CoinDetails {
  coin: string;
  exchange: Exchange;
  symbol: string;
  markPrice: number;
  indexPrice: number;
  funding: number | null;
  intervalHours: number;
  nextFundingTime: string | null;
  nextFundingTs: number | null;
  minutesUntil: number | null;
  maxLeverage: number;
  takerFeeRate: number;
  makerFeeRate: number;
  openInterest: number;
  volume24h: number;
  turnover24h: number;
  asks: [string, string][];
  bids: [string, string][];
}

// ── Історія фандингу ──
export interface FundingHistoryItem {
  rate: number;
  time: number;
  timeStr: string;
}

// ── Сума фандингу ──
export interface FundingSummary {
  totalRate: number;
  count: number;
  avgRate: number;
  perDay: number;
}

// ── Свічка графіка ──
export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ── Результат калькулятора ──
export interface CalcResult {
  avgSpotAsk: number | null;
  avgFutBid: number | null;
  basisReal: number | null;
  basisEntry: number;
  netEntry: number;
}

// ── Фандинг саммарі для дашборду ──
export interface DashboardSummary {
  sum3d: number;
  sum7d: number;
}
