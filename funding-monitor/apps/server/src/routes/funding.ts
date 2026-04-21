import { Router } from 'express';
import { lastReport } from '../jobs/monitor';
import {
  fetchCoinDetails,
  fetchFundingHistory,
  fetchFundingSummary,
  fetchPriceChart,
  calcSpreadByEntryPrice,
  fetchDashboardFundingSummaries,
} from '../services/kucoin';

const router = Router();

// ── GET /api/funding ── Головний дашборд
router.get('/', (_, res) => {
  if (!lastReport) {
    return res.json({ ok: true, data: { pairs: [], updatedAt: null, orderSize: 100 } });
  }
  res.json({ ok: true, data: lastReport });
});

// ── GET /api/funding/summaries?coins=BTC,ETH ── Фандинг 3д/7д для дашборду
router.get('/summaries', async (req, res) => {
  try {
    const coins = String(req.query.coins || '').split(',').filter(Boolean);
    if (!coins.length) return res.json({ ok: true, data: {} });

    const data = await fetchDashboardFundingSummaries(coins);
    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/funding/:coin ── Деталі монети
router.get('/:coin', async (req, res) => {
  try {
    const { coin } = req.params;
    const orderSize = parseFloat(String(req.query.orderSize || '100'));

    const details = await fetchCoinDetails(coin.toUpperCase());
    res.json({ ok: true, data: details });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/funding/:coin/history?days=7 ── Історія фандингу
router.get('/:coin/history', async (req, res) => {
  try {
    const { coin } = req.params;
    const days = parseInt(String(req.query.days || '7'));

    const data = await fetchFundingHistory(coin.toUpperCase(), days);
    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/funding/:coin/summary?days=3 ── Сума фандингу за період
router.get('/:coin/summary', async (req, res) => {
  try {
    const { coin } = req.params;
    const days = parseInt(String(req.query.days || '3'));

    const data = await fetchFundingSummary(coin.toUpperCase(), days);
    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/funding/:coin/chart?granularity=60&days=1 ── Графік ціни
router.get('/:coin/chart', async (req, res) => {
  try {
    const { coin } = req.params;
    const granularity = parseInt(String(req.query.granularity || '60'));
    const days        = parseInt(String(req.query.days || '1'));

    const data = await fetchPriceChart(coin.toUpperCase(), granularity, days);
    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /api/funding/:coin/calc ── Калькулятор спреду
router.post('/:coin/calc', async (req, res) => {
  try {
    const { coin }  = req.params;
    const { spotEntryPrice, futEntryPrice, orderSize } = req.body;

    if (!spotEntryPrice || !futEntryPrice) {
      return res.status(400).json({ ok: false, error: 'Потрібні spotEntryPrice та futEntryPrice' });
    }

    const details = await fetchCoinDetails(coin.toUpperCase());
    const result  = calcSpreadByEntryPrice(
      parseFloat(spotEntryPrice),
      parseFloat(futEntryPrice),
      details.asks,
      details.bids,
      parseFloat(orderSize || '100'),
      1
    );

    res.json({ ok: true, data: result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;