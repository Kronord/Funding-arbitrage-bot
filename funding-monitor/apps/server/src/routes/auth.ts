import { Router, Request, Response } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import {
  createUser, findUserByEmail, findUserByGoogleId,
  verifyPassword, createSession, findActiveSession,
  revokeSession, revokeAllUserSessions, checkRegistrationRateLimit,
} from '../db/auth';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
} from '../services/jwt';
import { loginLimiter, registerLimiter } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ── Утиліта отримання IP ──
function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// ── Утиліта відправки токенів ──
function sendTokens(res: Response, accessToken: string, refreshToken: string) {
  // Refresh token в HttpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   30 * 24 * 60 * 60 * 1000, // 30 днів
    path:     '/api/auth/refresh',
  });

  return res.json({
    ok: true,
    data: { accessToken },
  });
}

// ════════════════════════════════════════
// POST /api/auth/register
// ════════════════════════════════════════
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const ip = getIp(req);

    // ── Валідація ──
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email та пароль обовʼязкові' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Невалідний email' });
    }

    if (password.length < 8) {
      return res.status(400).json({ ok: false, error: 'Пароль мінімум 8 символів' });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({
        ok: false,
        error: 'Пароль має містити великі, малі літери та цифри',
      });
    }

    // ── Rate limit по IP ──
    const rateCheck = await checkRegistrationRateLimit(ip);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        ok: false,
        error: `Досягнуто ліміт реєстрацій з вашого IP (${rateCheck.limit} за 24г)`,
      });
    }

    // ── Перевірка чи email вже існує ──
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Email вже зареєстрований' });
    }

    // ── Створення юзера ──
    const user = await createUser({
      email,
      password,
      name: name?.trim() || undefined,
      ip,
      userAgent: req.headers['user-agent'],
    });

    // ── Видача токенів ──
    const payload     = { userId: user.id, email: user.email, role: user.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await createSession({
      userId:    user.id,
      refreshToken,
      ip,
      userAgent: req.headers['user-agent'],
    });

    return sendTokens(res, accessToken, refreshToken);
  } catch (e: any) {
    console.error('[Auth] Register error:', e);
    return res.status(500).json({ ok: false, error: 'Помилка сервера' });
  }
});

// ════════════════════════════════════════
// POST /api/auth/login
// ════════════════════════════════════════
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ip = getIp(req);

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email та пароль обовʼязкові' });
    }

    const user = await findUserByEmail(email);

    // ── Навмисна затримка щоб ускладнити brute force ──
    await new Promise(r => setTimeout(r, 300));

    if (!user || !user.passwordHash) {
      return res.status(401).json({ ok: false, error: 'Невірний email або пароль' });
    }

    if (!user.isActive) {
      return res.status(403).json({ ok: false, error: 'Акаунт заблокований' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ ok: false, error: 'Невірний email або пароль' });
    }

    const payload     = { userId: user.id, email: user.email, role: user.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await createSession({
      userId: user.id,
      refreshToken,
      ip,
      userAgent: req.headers['user-agent'],
    });

    return sendTokens(res, accessToken, refreshToken);
  } catch (e: any) {
    console.error('[Auth] Login error:', e);
    return res.status(500).json({ ok: false, error: 'Помилка сервера' });
  }
});

// ════════════════════════════════════════
// POST /api/auth/refresh
// ════════════════════════════════════════
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ ok: false, error: 'Refresh token відсутній' });
    }

    // ── Перевірка підпису ──
    let payload: any;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ ok: false, error: 'Невалідний refresh token' });
    }

    // ── Перевірка в БД ──
    const session = await findActiveSession(refreshToken);
    if (!session) {
      return res.status(401).json({ ok: false, error: 'Сесія не знайдена або закінчилась' });
    }

    // ── Ротація токенів (старий відкликаємо, видаємо новий) ──
    await revokeSession(refreshToken);

    const newPayload      = { userId: session.user.id, email: session.user.email, role: session.user.role };
    const newAccessToken  = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    await createSession({
      userId:    session.user.id,
      refreshToken: newRefreshToken,
      ip:        getIp(req),
      userAgent: req.headers['user-agent'],
    });

    return sendTokens(res, newAccessToken, newRefreshToken);
  } catch (e: any) {
    console.error('[Auth] Refresh error:', e);
    return res.status(500).json({ ok: false, error: 'Помилка сервера' });
  }
});

// ════════════════════════════════════════
// POST /api/auth/logout
// ════════════════════════════════════════
router.post('/logout', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    await revokeSession(refreshToken).catch(console.error);
  }

  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  return res.json({ ok: true });
});

// ════════════════════════════════════════
// POST /api/auth/logout-all
// ════════════════════════════════════════
router.post('/logout-all', requireAuth, async (req: Request, res: Response) => {
  await revokeAllUserSessions(req.currentUser!.userId);
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  return res.json({ ok: true });
});

// ════════════════════════════════════════
// GET /api/auth/me
// ════════════════════════════════════════
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await findUserById(req.currentUser!.userId).catch(() => null);
  if (!user) return res.status(404).json({ ok: false, error: 'Юзер не знайдений' });

  return res.json({
    ok: true,
    data: {
      id:        user.id,
      email:     user.email,
      name:      user.name,
      avatarUrl: user.avatarUrl,
      role:      user.role,
      createdAt: user.createdAt,
    },
  });
});

// ── PATCH /api/auth/profile ── Оновити профіль
router.patch('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ ok: false, error: 'Імʼя не може бути порожнім' });
    }

    const user = await prisma.user.update({
      where: { id: req.currentUser!.userId },
      data:  { name: name.trim() },
    });

    res.json({ ok: true, data: { name: user.name } });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── PATCH /api/auth/password ── Змінити пароль
router.patch('/password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, error: 'Всі поля обовʼязкові' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ ok: false, error: 'Пароль мінімум 8 символів' });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({
        ok: false,
        error: 'Пароль має містити великі, малі літери та цифри',
      });
    }

    const user = await findUserById(req.currentUser!.userId);
    if (!user?.passwordHash) {
      return res.status(400).json({ ok: false, error: 'Акаунт без пароля (Google OAuth)' });
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ ok: false, error: 'Невірний поточний пароль' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data:  { passwordHash: newHash },
    });

    // Відкликати всі сесії крім поточної для безпеки
    await revokeAllUserSessions(user.id);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ════════════════════════════════════════
// Google OAuth
// ════════════════════════════════════════
passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL!,
  },
  async (_, __, profile, done) => {
    try {
      const email     = profile.emails?.[0]?.value;
      const googleId  = profile.id;
      const name      = profile.displayName;
      const avatarUrl = profile.photos?.[0]?.value;

      if (!email) return done(new Error('Email не отримано від Google'));

      // Шукаємо існуючого юзера
      let user = await findUserByGoogleId(googleId);

      if (!user) {
        // Можливо юзер вже є але реєструвався через email
        user = await findUserByEmail(email);

        if (user) {
          // Прив'язуємо Google до існуючого акаунту
          await prisma.user.update({
            where: { id: user.id },
            data:  { googleId, avatarUrl: avatarUrl || user.avatarUrl },
          });
        } else {
          // Новий юзер через Google
          user = await createUser({ email, name, avatarUrl, googleId });
        }
      }

      return done(null, user);
    } catch (e) {
      return done(e as Error);
    }
  }
));

router.get('/google',
  passport.authenticate('google', {
    scope:   ['profile', 'email'],
    session: false,
  })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google` }),
  async (req: Request, res: Response) => {
    try {
      const user       = req.currentUser as any;
      const ip         = getIp(req);
      const payload    = { userId: user.id, email: user.email, role: user.role };
      const accessToken  = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      await createSession({
        userId: user.id,
        refreshToken,
        ip,
        userAgent: req.headers['user-agent'],
      });

      // Передаємо access token через URL (фронт зберігає в пам'яті)
      // Refresh token в cookie встановлюється тут
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   30 * 24 * 60 * 60 * 1000,
        path:     '/api/auth/refresh',
      });

      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`);
    } catch (e) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server`);
    }
  }
);

// Імпорт для Google OAuth
import prisma from '../db/client';
import { findUserById } from '../db/auth';

export default router;