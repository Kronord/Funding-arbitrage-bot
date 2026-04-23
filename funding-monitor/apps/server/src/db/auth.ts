import prisma from './client';
import { hashToken, hashIp } from '../services/jwt';
import bcrypt from 'bcryptjs';


// ── Створити юзера ──
export async function createUser(data: {
  email: string;
  password?: string;
  name?: string;
  avatarUrl?: string;
  googleId?: string;
  ip?: string;
  userAgent?: string;
}) {
  const passwordHash = data.password
    ? await bcrypt.hash(data.password, 12)
    : null;

  const user = await prisma.user.create({
    data: {
      email:        data.email.toLowerCase().trim(),
      passwordHash,
      name:         data.name,
      avatarUrl:    data.avatarUrl,
      googleId:     data.googleId,
      registrationMeta: data.ip ? {
        create: {
          ipHash:    hashIp(data.ip),
          userAgent: data.userAgent,
        }
      } : undefined,
    },
  });

  // Записати спробу реєстрації
  if (data.ip) {
    await prisma.registrationAttempt.create({
      data: {
        ipHash:  hashIp(data.ip),
        email:   data.email.toLowerCase(),
        success: true,
      },
    });
  }

  return user;
}

// ── Знайти юзера по email ──
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
}

// ── Знайти юзера по Google ID ──
export async function findUserByGoogleId(googleId: string) {
  return prisma.user.findUnique({ where: { googleId } });
}

// ── Знайти юзера по ID ──
export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

// ── Верифікація пароля ──
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Створити сесію ──
export async function createSession(data: {
  userId:       string;
  refreshToken: string;
  ip?:          string;
  userAgent?:   string;
}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const crypto = require('crypto');
  const deviceFingerprint = data.userAgent
    ? crypto
        .createHash('sha256')
        .update(data.userAgent + (data.ip || ''))
        .digest('hex')
        .slice(0, 16)
    : null;

  const refreshTokenHash = hashToken(data.refreshToken);

  // upsert щоб уникнути дублікатів
  return prisma.session.upsert({
    where:  { refreshTokenHash },
    update: {
      userId:           data.userId,
      deviceFingerprint,
      ipAddress:        data.ip,
      userAgent:        data.userAgent,
      expiresAt,
      revokedAt:        null,
    },
    create: {
      userId:           data.userId,
      refreshTokenHash,
      deviceFingerprint,
      ipAddress:        data.ip,
      userAgent:        data.userAgent,
      expiresAt,
    },
  });
}

// ── Знайти активну сесію по refresh токену ──
export async function findActiveSession(refreshToken: string) {
  return prisma.session.findFirst({
    where: {
      refreshTokenHash: hashToken(refreshToken),
      revokedAt:        null,
      expiresAt:        { gt: new Date() },
    },
    include: { user: true },
  });
}

// ── Відкликати сесію ──
export async function revokeSession(refreshToken: string) {
  return prisma.session.updateMany({
    where: { refreshTokenHash: hashToken(refreshToken) },
    data:  { revokedAt: new Date() },
  });
}

// ── Відкликати всі сесії юзера ──
export async function revokeAllUserSessions(userId: string) {
  return prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data:  { revokedAt: new Date() },
  });
}

// ── Перевірка rate limit реєстрацій з одного IP ──
export async function checkRegistrationRateLimit(ip: string): Promise<{
  allowed: boolean;
  count:   number;
  limit:   number;
}> {
  const limit   = parseInt(process.env.MAX_REGISTRATIONS_PER_IP || '3');
  const hours   = parseInt(process.env.REGISTRATION_WINDOW_HOURS || '24');
  const ipHash  = hashIp(ip);
  const since   = new Date(Date.now() - hours * 60 * 60 * 1000);

  const count = await prisma.registrationAttempt.count({
    where: {
      ipHash,
      success:   true,
      createdAt: { gte: since },
    },
  });

  return { allowed: count < limit, count, limit };
}

// ── Очистити старі сесії ──
export async function cleanExpiredSessions() {
  return prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    },
  });
}