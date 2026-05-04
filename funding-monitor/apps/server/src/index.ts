import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import passport from "passport";
import { apiLimiter } from "./middleware/rateLimit";
import fundingRouter from "./routes/funding";
import alertsRouter from "./routes/alerts";
import authRouter from "./routes/auth";
import { requireAuth } from "./middleware/auth";
import { startMonitor } from "./jobs/monitor";
import { cleanExpiredSessions } from "./db/auth";

const app = express();
const port = Number(process.env.PORT) || 3000;

// ── Security headers ──
app.use(helmet());
app.set("trust proxy", 1);
// ── CORS ──
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowed = [
      // Production домен
      process.env.FRONTEND_URL,
      // Localhost для розробки
      'http://localhost:3000',
    ];

    // Дозволяємо всі Vercel preview deployments
    const isVercel = origin.endsWith('.vercel.app');

    // Дозволяємо твій конкретний Vercel проект
    const isYourProject = origin.includes('funding-arbitrage');

    if (allowed.includes(origin) || isVercel && isYourProject) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.options("*", cors());

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ── Публічні роутери (без авторизації) ──
app.use("/api/auth", authRouter);

// ── Захищені роутери (потребують авторизації) ──
app.use("/api/funding", requireAuth, apiLimiter, fundingRouter);
app.use("/api/alerts", requireAuth, alertsRouter);
app.use("/api/settings", requireAuth, (req, res) => {
  res.json({
    ok: true,
    data: { orderSize: parseFloat(process.env.ORDER_SIZE_USDT || "100") },
  });
});

app.get("/api/health", (_, res) => res.json({ ok: true }));

// ── Очищення сесій кожні 6 годин ──
setInterval(
  () => {
    cleanExpiredSessions().catch(console.error);
  },
  6 * 60 * 60 * 1000,
);

startMonitor();

app.listen(port, () => console.log(`🚀 Server: http://localhost:${port}`));
