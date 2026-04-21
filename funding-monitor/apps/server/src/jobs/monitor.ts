import { fetchKucoinFunding } from '../services/kucoin';
import { sendTelegramReport } from '../services/telegram';
import type { FundingReport } from '@funding-monitor/types';

const ORDER_SIZE = parseFloat(process.env.ORDER_SIZE_USDT || '100');
const INTERVAL_MS = 2 * 60 * 1000; // 2 хвилини

export let lastReport: FundingReport | null = null;

async function run() {
  try {
    const pairs = await fetchKucoinFunding(ORDER_SIZE);
    const now = new Date().toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv' });

    lastReport = { pairs, updatedAt: now, orderSize: ORDER_SIZE };
    console.log(`[${now}] Оновлено: ${pairs.length} монет`);

    await sendTelegramReport(pairs, now);
  } catch (e) {
    console.error('Monitor error:', e);
  }
}

export function startMonitor() {
  run();
  setInterval(run, INTERVAL_MS);
}