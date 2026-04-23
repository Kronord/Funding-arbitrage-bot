import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../services/jwt';

declare global {
  namespace Express {
    interface Request {
      currentUser?: JwtPayload;
    }
  }
}

export type AuthRequest = Request & { currentUser: JwtPayload };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Необхідна авторизація' });
    }

    const token   = header.slice(7);
    const payload = verifyAccessToken(token);
    req.currentUser = payload;
    next();
  } catch (e: any) {
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, error: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ ok: false, error: 'Невалідний токен' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.currentUser?.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Доступ заборонено' });
  }
  next();
}