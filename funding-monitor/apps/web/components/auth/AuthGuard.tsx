'use client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const PUBLIC_PATHS = ['/login', '/register', '/auth/callback'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, accessToken } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const redirecting = useRef(false);

  useEffect(() => {
    // Чекаємо поки завантаження завершиться
    if (loading) return;

    // Якщо немає юзера і токена — редирект
    if (!user && !accessToken && !redirecting.current) {
      const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
      if (!isPublic) {
        redirecting.current = true;
        router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      }
    }

    // Якщо юзер є — скидаємо флаг
    if (user) {
      redirecting.current = false;
    }
  }, [user, loading, accessToken, router, pathname]);

  // Показуємо спінер поки перевіряємо авторизацію
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-border border-t-blue rounded-full animate-spin" />
          <span className="text-xs font-mono text-text-muted">Перевірка сесії...</span>
        </div>
      </div>
    );
  }

  // Якщо немає юзера — нічого не рендеримо (іде редирект)
  if (!user && !accessToken) return null;

  // Рендеримо дітей навіть якщо сторінка 404
  return <>{children}</>;
}