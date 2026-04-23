import rateLimit from 'express-rate-limit';

// ── Ліміт для логіну (5 спроб за 15 хв) ──
export const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              5,
  skipSuccessfulRequests: true,
  message: { ok: false, error: 'Забагато спроб входу. Спробуйте через 15 хвилин.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Ліміт для реєстрації (3 спроби за годину) ──
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      3,
  message:  { ok: false, error: 'Забагато спроб реєстрації. Спробуйте через годину.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Загальний ліміт API ──
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      100,
  message:  { ok: false, error: 'Забагато запитів.' },
});