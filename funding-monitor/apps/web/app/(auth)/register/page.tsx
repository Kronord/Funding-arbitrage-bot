'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getApiUrl } from '@/lib/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      return setError('Паролі не співпадають');
    }

    setLoading(true);
    try {
      await register(email, password, name);
      router.replace('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Індикатор складності пароля
  function getPasswordStrength(p: string) {
    let score = 0;
    if (p.length >= 8)              score++;
    if (/[A-Z]/.test(p))           score++;
    if (/[a-z]/.test(p))           score++;
    if (/\d/.test(p))              score++;
    if (/[^A-Za-z0-9]/.test(p))   score++;
    return score;
  }

  const strength      = getPasswordStrength(password);
  const strengthLabel = ['', 'Дуже слабкий', 'Слабкий', 'Середній', 'Сильний', 'Дуже сильний'][strength];
  const strengthColor = ['', 'text-red', 'text-red', 'text-yellow', 'text-green', 'text-green'][strength];

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue/20 to-blue/5 border border-blue/20 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4">
            📊
          </div>
          <h1 className="text-xl font-bold text-[#cdd9e5] font-sans">Funding Monitor</h1>
          <p className="text-xs text-text-muted font-mono mt-1">Створення акаунту</p>
        </div>

        <div className="bg-surface border border-border-bright rounded-xl p-6 space-y-4">

          <a
            href={`${getApiUrl()}/api/auth/google`}
            className="flex items-center justify-center gap-3 w-full py-2.5 px-4
              bg-bg border border-border-bright rounded-lg text-sm font-mono
              text-[#cdd9e5] hover:border-blue/30 hover:bg-blue/5 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Зареєструватись через Google
          </a>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] font-mono text-text-dim">або</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-text-dim mb-1.5">
                Імʼя (необовʼязково)
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-bg border border-border-bright text-[#cdd9e5] font-mono text-sm
                  px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue/50 transition-colors"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-text-dim mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-bg border border-border-bright text-[#cdd9e5] font-mono text-sm
                  px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue/50 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-text-dim mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-bg border border-border-bright text-[#cdd9e5] font-mono text-sm
                  px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue/50 transition-colors"
                placeholder="Мін. 8 символів"
              />
              {password && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex gap-1 flex-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors
                        ${i <= strength
                          ? strength <= 2 ? 'bg-red' : strength <= 3 ? 'bg-yellow' : 'bg-green'
                          : 'bg-border'}`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-mono ${strengthColor}`}>{strengthLabel}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-text-dim mb-1.5">
                Підтвердження пароля
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className={`w-full bg-bg border font-mono text-sm px-3 py-2.5 rounded-lg
                  focus:outline-none transition-colors text-[#cdd9e5]
                  ${confirm && confirm !== password ? 'border-red/50' : 'border-border-bright focus:border-blue/50'}`}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red/10 border border-red/20 rounded-lg px-3 py-2 text-xs font-mono text-red">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue/10 border border-blue/30 text-blue font-mono text-sm
                rounded-lg hover:bg-blue/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Реєстрація...' : 'Зареєструватись'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs font-mono text-text-dim mt-4">
          Вже є акаунт?{' '}
          <Link href="/login" className="text-blue hover:underline">Увійти</Link>
        </p>
      </div>
    </div>
  );
}