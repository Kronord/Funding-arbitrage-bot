import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import passport from 'passport';
import { apiLimiter } from './middleware/rateLimit';
import fundingRouter from './routes/funding';
import alertsRouter  from './routes/alerts';
import authRouter    from './routes/auth';
import { requireAuth } from './middleware/auth';
import { startMonitor } from './jobs/monitor';
import { cleanExpiredSessions } from './db/auth';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ──
app.use(helmet());
app.set('trust proxy', 1);
// ── CORS ──
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
    ];
    // Дозволяємо Codespaces домени
    if (!origin || allowed.includes(origin) || origin.includes('app.github.dev')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ── Публічні роутери (без авторизації) ──
app.use('/api/auth', authRouter);

// ── Захищені роутери (потребують авторизації) ──
app.use('/api/funding', requireAuth, apiLimiter, fundingRouter);
app.use('/api/alerts',  requireAuth, alertsRouter);
app.use('/api/settings', requireAuth, (req, res) => {
  res.json({ ok: true, data: { orderSize: parseFloat(process.env.ORDER_SIZE_USDT || '100') } });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

// ── Очищення сесій кожні 6 годин ──
setInterval(() => {
  cleanExpiredSessions().catch(console.error);
}, 6 * 60 * 60 * 1000);

startMonitor();

app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));