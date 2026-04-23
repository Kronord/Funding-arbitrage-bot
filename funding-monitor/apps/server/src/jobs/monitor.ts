import { fetchKucoinFunding, fetchCoinDetails, fetchFundingHistory, fetchPriceChart } from '../services/kucoin';
import { sendTelegramReport }  from '../services/telegram';
import {
  saveFundingSnapshot, getLatestSnapshot,
  saveContractDetail,  saveFundingHistory,
  saveKlines,          cleanOldSnapshots,
  getSetting,          setSetting,
} from '../db/funding';
import type { FundingReport } from '@funding-monitor/types';

const INTERVAL_MS = parseInt(process.env.MONITOR_INTERVAL_MS || '120000');

export let lastReport: FundingReport | null = null;
let monitorInterval: NodeJS.Timeout | null  = null;
let isRunning = false;

export function getOrderSize() {
  return parseFloat(process.env.ORDER_SIZE_USDT || '100');
}

async function run() {
  if (isRunning) {
    console.log('Monitor already running, skipping...');
    return;
  }

  isRunning = true;
  try {
    const orderSize = getOrderSize();
    console.log(`[Monitor] Запуск циклу | orderSize: ${orderSize}`);

    // ── 1. Отримати фандинг з біржі ──
    const pairs = await fetchKucoinFunding(orderSize);

    // ── 2. Зберегти знімок в БД ──
    await saveFundingSnapshot(pairs, orderSize);

    // ── 3. Оновити lastReport з БД ──
    lastReport = await getLatestSnapshot();

    const now = new Date().toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv' });
    console.log(`[${now}] Збережено: ${pairs.length} монет`);

    // ── 4. Оновити деталі контрактів та історію для топ монет в фоні ──
    updateCoinDataInBackground(pairs.map(p => p.coin));

    // ── 5. Очистити старі знімки ──
    await cleanOldSnapshots();

    // ── 6. Telegram ──
    // await sendTelegramReport(pairs, now);

  } catch (e) {
    console.error('Monitor error:', e);
  } finally {
    isRunning = false;
  }
}

// Оновлення деталей і klines в фоні без блокування основного циклу
async function updateCoinDataInBackground(coins: string[]) {
  for (const coin of coins.slice(0, 10)) { // тільки топ-10 щоб не навантажувати API
    try {
      // Деталі контракту
      const details = await fetchCoinDetails(coin);
      await saveContractDetail(coin, details);

      // Історія фандингу за 30 днів
      const history = await fetchFundingHistory(coin, 30);
      await saveFundingHistory(coin, history);

      // Klines 1г за 7 днів
      const klines = await fetchPriceChart(coin, 60, 7);
      await saveKlines(coin, 60, klines);

      // Пауза між монетами
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`[Background] Помилка для ${coin}:`, e);
    }
  }
}

export function startMonitor() {
  run();
  if (monitorInterval) clearInterval(monitorInterval);
  monitorInterval = setInterval(run, INTERVAL_MS);
}