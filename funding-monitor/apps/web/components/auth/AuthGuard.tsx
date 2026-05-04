'use client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const PUBLIC_PATHS = ['/login', '/register', '/auth/callback'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, accessToken } = useAuth();
  const router      = useRouter();
  const pathname    = usePathname();
  const redirecting = useRef(false);

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (loading) return;    // чекаємо ініціалізації
    if (isPublic) return;   // публічні сторінки пропускаємо

    if (!user && !accessToken && !redirecting.current) {
      redirecting.current = true;
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }

    if (user) redirecting.current = false;
  }, [user, loading, accessToken, router, pathname, isPublic]);

  // ── Показуємо спінер поки йде ініціалізація ──
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

  // ── Публічні сторінки — завжди показуємо ──
  if (isPublic) return <>{children}</>;

  // ── Є токен або юзер — показуємо контент ──
  if (accessToken || user) return <>{children}</>;

  // ── Немає нічого — нічого не рендеримо ──
  return null;
}