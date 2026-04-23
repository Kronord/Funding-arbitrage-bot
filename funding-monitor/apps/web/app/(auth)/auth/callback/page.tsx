'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

export default function AuthCallbackPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { refreshToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      router.replace(`/login?error=${error}`);
      return;
    }

    if (token) {
      // Токен прийшов через URL — оновлюємо стан через refresh
      // (refresh token вже в cookie від сервера)
      refreshToken().then(success => {
        router.replace(success ? '/dashboard' : '/login?error=callback');
      });
    }
  }, [searchParams, router, refreshToken]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-border border-t-blue rounded-full animate-spin" />
        <span className="text-xs font-mono text-text-muted">Авторизація через Google...</span>
      </div>
    </div>
  );
}