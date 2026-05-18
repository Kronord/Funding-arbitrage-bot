import { Router } from "express";
import prisma from '../db/client';
import { lastReport } from "../jobs/monitor";
import {
  getLatestSnapshot,
  getContractDetail,
  getFundingHistory,
  getKlines,
  saveContractDetail,
  saveFundingHistory,
  saveKlines,
} from "../db/funding";
import { calcSpreadByEntryPrice, fetchCoinDetails, fetchFundingHistory, fetchPriceChart } from "../services/kucoin";

const router = Router();
const SPOT_FEE  = parseFloat(process.env.SPOT_FEE  || '0.001');
const FUT_FEE   = parseFloat(process.env.FUT_FEE   || '0.0006');
const TOTAL_FEE = (SPOT_FEE + FUT_FEE) * 2;

// ── GET /api/funding ── з БД
router.get("/", async (_, res) => {
  try {
    // Спочатку пробуємо з БД
    const snapshot = await getLatestSnapshot();
    if (snapshot) return res.json({ ok: true, data: snapshot });

    // Fallback на lastReport якщо БД порожня
    if (lastReport) return res.json({ ok: true, data: lastReport });

    res.json({
      ok: true,
      data: { pairs: [], updatedAt: null, orderSize: 100 },
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/funding/summaries ──
router.get("/summaries", async (req, res) => {
  try {
    const coins = String(req.query.coins || "")
      .split(",")
      .filter(Boolean);
    if (!coins.length) return res.json({ ok: true, data: {} });

    const result: Record<string, { sum3d: number; sum7d: number }> = {};

    await Promise.all(
      coins.map(async (coin) => {
        const [h3, h7] = await Promise.all([
          getFundingHistory(coin, 3),
          getFundingHistory(coin, 7),
        ]);
        result[coin] = {
          sum3d: parseFloat(h3.reduce((s, h) => s + h.rate, 0).toFixed(4)),
          sum7d: parseFloat(h7.reduce((s, h) => s + h.rate, 0).toFixed(4)),
        };
      }),
    );

    res.json({ ok: true, data: result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/funding/top-basis ──
router.get('/top-basis', async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit || '25'));

    // Беремо всі монети з ContractDetail
    const contracts = await prisma.contractDetail.findMany({
      where: {
        exchange: 'kucoin',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!contracts.length) {
      return res.json({ ok: true, data: { pairs: [], updatedAt: null } });
    }

    // Беремо останній snapshot для часу оновлення
    const snapshot = await getLatestSnapshot();

    // Фільтруємо монети з плюсовим базисом
    const pairs = contracts
      .filter(c => c.basisEntry !== null && c.basisEntry > 0)
      .sort((a, b) => (b.basisEntry ?? 0) - (a.basisEntry ?? 0))
      .slice(0, limit)
      .map(c => ({
        coin:            c.coin,
        exchange:        c.exchange as 'kucoin',
        funding:         c.funding ?? 0,
        intervalHours:   c.intervalHours,
        nextFundingTs:   c.nextFundingTs ? Number(c.nextFundingTs) : null,
        nextFundingTime: c.nextFundingTime,
        minutesUntil:    c.minutesUntil,
        basisReal:       c.basisEntry ?? 0,
        basisEntry:      c.basisEntry ?? 0,
        basisExit:       c.basisExit ?? null,
        net:             c.funding && c.basisEntry
          ? parseFloat((c.funding + c.basisEntry - (TOTAL_FEE * 100)).toFixed(3))
          : 0,
        avgSpotBuy:      '',
        avgFutSell:      '',
      }));

    res.json({
      ok:   true,
      data: { pairs, updatedAt: snapshot?.updatedAt ?? null },
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/funding/:coin ── з БД
router.get("/:coin", async (req, res) => {
  try {
    const coin = req.params.coin.toUpperCase();
    let detail = await getContractDetail(coin);
      // Монета ще не в БД — тягнемо з біржі і зберігаємо
      try {
        const fetched = await fetchCoinDetails(coin);
        await saveContractDetail(coin, fetched);
        detail = await getContractDetail(coin);
      } catch {
        return res.status(404).json({ ok: false, error: `Монету ${coin} не знайдено` });
      }

    if (!detail) {
      return res
        .status(404)
        .json({ ok: false, error: `Монету ${coin} не знайдено в БД` });
    }

    res.json({ ok: true, data: detail });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/funding/:coin/history ── з БД
router.get("/:coin/history", async (req, res) => {
  try {
    const coin = req.params.coin.toUpperCase();
    const days = parseInt(String(req.query.days || "7"));
    const data = await getFundingHistory(coin, days);
    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/funding/:coin/summary ── з БД
router.get("/:coin/summary", async (req, res) => {
  try {
    const coin = req.params.coin.toUpperCase();
    const days = parseInt(String(req.query.days || "3"));
    const history = await getFundingHistory(coin, days);

    const totalRate = parseFloat(
      history.reduce((s, h) => s + h.rate, 0).toFixed(4),
    );
    const count = history.length;
    const avgRate = count > 0 ? parseFloat((totalRate / count).toFixed(4)) : 0;
    const perDay = parseFloat((totalRate / Math.max(days, 1)).toFixed(4));

    res.json({ ok: true, data: { totalRate, count, avgRate, perDay } });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/funding/:coin/chart ── з БД
router.get("/:coin/chart", async (req, res) => {
  try {
    const coin = req.params.coin.toUpperCase();
    const granularity = parseInt(String(req.query.granularity || "60"));
    const days = parseInt(String(req.query.days || "7"));
    const data = await getKlines(coin, granularity, days);
    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /api/funding/:coin/calc ── рахуємо зі стакану в БД
router.post("/:coin/calc", async (req, res) => {
  try {
    const coin = req.params.coin.toUpperCase();
    const { spotEntryPrice, futEntryPrice, orderSize } = req.body;

    if (!spotEntryPrice || !futEntryPrice) {
      return res
        .status(400)
        .json({ ok: false, error: "Потрібні spotEntryPrice та futEntryPrice" });
    }

    const detail = await getContractDetail(coin);
    if (!detail) {
      return res
        .status(404)
        .json({ ok: false, error: `Монету ${coin} не знайдено в БД` });
    }

    const result = calcSpreadByEntryPrice(
      parseFloat(spotEntryPrice),
      parseFloat(futEntryPrice),
      detail.asks,
      detail.bids,
      parseFloat(orderSize || "100"),
      1,
    );

    res.json({ ok: true, data: result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/funding/:coin/full ── всі дані одним запитом
router.get("/:coin/full", async (req, res) => {
  try {
    const coin = req.params.coin.toUpperCase();
    const historyDays = parseInt(String(req.query.historyDays || "7"));
    const chartGran = parseInt(String(req.query.granularity || "60"));
    const chartDays = parseInt(String(req.query.chartDays || "7"));

    // Всі запити до БД паралельно
    let [detail, history, klines] = await Promise.all([
      getContractDetail(coin),
      getFundingHistory(coin, historyDays),
      getKlines(coin, chartGran, chartDays),
    ]);

    if (!detail || history.length === 0 || klines.length === 0) {
      try {
        const [fetchedDetail, fetchedHistory, fetchedKlines] = await Promise.all([
          !detail ? fetchCoinDetails(coin) : Promise.resolve(null),
          history.length === 0 ? fetchFundingHistory(coin, historyDays) : Promise.resolve(null),
          klines.length === 0 ? fetchPriceChart(coin, chartGran, chartDays) : Promise.resolve(null),
        ]);

        await Promise.all([
          fetchedDetail   ? saveContractDetail(coin, fetchedDetail) : Promise.resolve(),
          fetchedHistory  ? saveFundingHistory(coin, fetchedHistory) : Promise.resolve(),
          fetchedKlines   ? saveKlines(coin, chartGran, fetchedKlines) : Promise.resolve(),
        ]);

        // Перечитуємо з БД після збереження
        [detail, history, klines] = await Promise.all([
          getContractDetail(coin),
          getFundingHistory(coin, historyDays),
          getKlines(coin, chartGran, chartDays),
        ]);
      } catch (fetchErr) {
        if (!detail) {
          return res.status(404).json({ ok: false, error: `Монету ${coin} не знайдено` });
        }
      }
    }

    // Розрахунок summary з history
    const totalRate = parseFloat(
      history.reduce((s, h) => s + h.rate, 0).toFixed(4),
    );
    const count = history.length;
    const summary = {
      totalRate,
      count,
      avgRate: count > 0 ? parseFloat((totalRate / count).toFixed(4)) : 0,
      perDay: parseFloat((totalRate / Math.max(historyDays, 1)).toFixed(4)),
    };

    res.json({ ok: true, data: { detail, history, klines, summary } });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
