import {
  fetchKucoinFunding,
  fetchAllCoinDetails,
  fetchFundingHistoryBatch,
  fetchPriceChartBatch,
} from "../services/kucoin";
import {
  saveFundingSnapshot,
  getLatestSnapshot,
  saveContractDetailsBatch,
  saveFundingHistoryBatch,
  saveKlinesBatch,
  cleanOldSnapshots,
} from "../db/funding";
import type { FundingReport } from "@funding-monitor/types";

const INTERVAL_MS = parseInt(process.env.MONITOR_INTERVAL_MS || "120000");

export let lastReport: FundingReport | null = null;
let monitorInterval: NodeJS.Timeout | null = null;
let isRunning = false;

export function getOrderSize() {
  return parseFloat(process.env.ORDER_SIZE_USDT || "100");
}

async function run() {
  if (isRunning) {
    console.log("Monitor already running, skipping...");
    return;
  }

  isRunning = true;
  try {
    const orderSize = getOrderSize();
    console.log(`[Monitor] Запуск циклу | orderSize: ${orderSize}`);
    // ── 1. Один запит до біржі: фандинг + контракти ──
    const { pairs, contracts } = await fetchKucoinFunding(orderSize);
    // ── 2. Зберегти знімок ──
    await saveFundingSnapshot(pairs, orderSize);

    // ── 3. Оновити lastReport з БД ──
    lastReport = await getLatestSnapshot();

    const now = new Date().toLocaleTimeString("uk-UA", {
      timeZone: "Europe/Kyiv",
    });
    console.log(`[${now}] Збережено: ${pairs.length} монет`);

    // ── 4. Оновити деталі і klines в фоні ──
    await cleanOldSnapshots();

    updateCoinDataInBackground(
      pairs.map((p) => p.coin),
      contracts,
    );
  } catch (e) {
    console.error("Monitor error:", e);
  } finally {
    isRunning = false;
  }
}

async function updateCoinDataInBackground(coins: string[], contracts: any[]) {
  try {
    console.log(`[Background] Оновлення ${coins.length} монет...`);
    // Всі API запити паралельно
    const [details, historyBatch, klinesBatch] = await Promise.all([
      fetchAllCoinDetails(coins, contracts),
      fetchFundingHistoryBatch(coins, 30),
      fetchPriceChartBatch(coins, 60, 7),
    ]);
    // Три батчеві записи в БД
    await Promise.all([
      saveContractDetailsBatch(details),
      saveFundingHistoryBatch(historyBatch),
      saveKlinesBatch(klinesBatch, 60),
    ]);
    console.log(`[Background] Готово: ${details.length} монет оновлено`);
  } catch (e) {
    console.error('[Background] Помилка:', e);
  }
}

export function startMonitor() {
  run();
  if (monitorInterval) clearInterval(monitorInterval);
  monitorInterval = setInterval(run, INTERVAL_MS);
}
