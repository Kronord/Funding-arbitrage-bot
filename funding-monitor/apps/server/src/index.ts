import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fundingRouter from './routes/funding';
import alertsRouter from './routes/alerts';
import { startMonitor } from './jobs/monitor';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Роутери ──
app.use('/api/funding', fundingRouter);
app.use('/api/alerts', alertsRouter);

// ── Health check ──
app.get('/api/health', (_, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// ── Запуск монітора ──
startMonitor();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});