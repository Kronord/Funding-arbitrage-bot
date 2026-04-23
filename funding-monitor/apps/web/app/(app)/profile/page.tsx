'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

export default function ProfilePage() {
  const { user, accessToken, logout } = useAuth();
  const router = useRouter();

  const [name, setName]           = useState(user?.name || '');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd]       = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const [nameLoading, setNameLoading]   = useState(false);
  const [pwdLoading, setPwdLoading]     = useState(false);
  const [nameMsg, setNameMsg]           = useState<{ ok: boolean; text: string } | null>(null);
  const [pwdMsg, setPwdMsg]             = useState<{ ok: boolean; text: string } | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // ── Оновити імʼя ──
  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    setNameLoading(true);
    setNameMsg(null);
    try {
      const res  = await fetch(`${getApiUrl()}/api/auth/profile`, {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      setNameMsg({ ok: json.ok, text: json.ok ? 'Імʼя оновлено' : json.error });
    } catch {
      setNameMsg({ ok: false, text: 'Помилка сервера' });
    } finally {
      setNameLoading(false);
    }
  }

  // ── Змінити пароль ──
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      return setPwdMsg({ ok: false, text: 'Паролі не співпадають' });
    }
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      const res  = await fetch(`${getApiUrl()}/api/auth/password`, {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const json = await res.json();
      if (json.ok) {
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
      }
      setPwdMsg({ ok: json.ok, text: json.ok ? 'Пароль змінено' : json.error });
    } catch {
      setPwdMsg({ ok: false, text: 'Помилка сервера' });
    } finally {
      setPwdLoading(false);
    }
  }

  // ── Вийти ──
  async function handleLogout() {
    setLogoutLoading(true);
    await logout();
    router.replace('/login');
  }

  // ── Вийти з усіх пристроїв ──
  async function handleLogoutAll() {
    setLogoutLoading(true);
    await fetch(`${getApiUrl()}/api/auth/logout-all`, {
      method:      'POST',
      credentials: 'include',
      headers:     { Authorization: `Bearer ${accessToken}` },
    }).catch(console.error);
    await logout();
    router.replace('/login');
  }

  function getPasswordStrength(p: string) {
    let score = 0;
    if (p.length >= 8)            score++;
    if (/[A-Z]/.test(p))         score++;
    if (/[a-z]/.test(p))         score++;
    if (/\d/.test(p))            score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }

  const strength = getPasswordStrength(newPwd);
  const strengthLabel = ['', 'Дуже слабкий', 'Слабкий', 'Середній', 'Сильний', 'Дуже сильний'][strength];
  const strengthColor = ['', 'text-red', 'text-red', 'text-yellow', 'text-green', 'text-green'][strength];

  const isGoogleOnly = !user || (!!user && !currentPwd && user.name !== undefined);

  return (
    <div className="max-w-2xl space-y-6">

      {/* Заголовок */}
      <div>
        <h2 className="text-xl font-bold text-[#cdd9e5]">Профіль</h2>
        <p className="text-sm text-text-muted font-mono mt-1">Керування акаунтом</p>
      </div>

      {/* Інфо карточка */}
      <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue/20 to-blue/5
          border border-blue/20 flex items-center justify-center text-xl font-bold text-blue font-mono">
          {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div className="font-bold text-[#cdd9e5]">{user?.name || 'Без імені'}</div>
          <div className="text-sm font-mono text-text-muted">{user?.email}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border
              ${user?.role === 'admin'
                ? 'bg-yellow/10 text-yellow border-yellow/20'
                : 'bg-blue/10 text-blue border-blue/20'}`}>
              {user?.role === 'admin' ? '👑 Admin' : '👤 User'}
            </span>
            <span className="text-[10px] font-mono text-text-dim">
              З {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('uk-UA') : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Редагування імені */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-[#cdd9e5] mb-4">Основна інформація</h3>
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-dim mb-1.5">
              Імʼя
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-bg border border-border-bright text-[#cdd9e5] font-mono text-sm
                px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue/50 transition-colors"
              placeholder="Ваше імʼя"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-dim mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full bg-bg border border-border text-text-muted font-mono text-sm
                px-3 py-2.5 rounded-lg cursor-not-allowed opacity-60"
            />
            <p className="text-[10px] font-mono text-text-dim mt-1">Email змінити неможливо</p>
          </div>

          {nameMsg && (
            <div className={`px-3 py-2 rounded-lg text-xs font-mono border
              ${nameMsg.ok
                ? 'bg-green/10 border-green/20 text-green'
                : 'bg-red/10 border-red/20 text-red'}`}>
              {nameMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={nameLoading || name === user?.name}
            className="px-6 py-2 bg-blue/10 border border-blue/30 text-blue font-mono text-sm
              rounded-lg hover:bg-blue/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {nameLoading ? 'Збереження...' : 'Зберегти'}
          </button>
        </form>
      </div>

      {/* Зміна пароля */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-[#cdd9e5] mb-1">Зміна пароля</h3>
        <p className="text-xs font-mono text-text-dim mb-4">
          {user?.avatarUrl && !user?.name
            ? 'Недоступно для Google акаунтів без пароля'
            : 'Рекомендуємо використовувати надійний пароль'}
        </p>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-dim mb-1.5">
              Поточний пароль
            </label>
            <input
              type="password"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              required
              className="w-full bg-bg border border-border-bright text-[#cdd9e5] font-mono text-sm
                px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue/50 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-dim mb-1.5">
              Новий пароль
            </label>
            <input
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              required
              className="w-full bg-bg border border-border-bright text-[#cdd9e5] font-mono text-sm
                px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue/50 transition-colors"
              placeholder="Мін. 8 символів"
            />
            {newPwd && (
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
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              required
              className={`w-full bg-bg border font-mono text-sm px-3 py-2.5 rounded-lg
                focus:outline-none transition-colors text-[#cdd9e5]
                ${confirmPwd && confirmPwd !== newPwd
                  ? 'border-red/50'
                  : 'border-border-bright focus:border-blue/50'}`}
              placeholder="••••••••"
            />
          </div>

          {pwdMsg && (
            <div className={`px-3 py-2 rounded-lg text-xs font-mono border
              ${pwdMsg.ok
                ? 'bg-green/10 border-green/20 text-green'
                : 'bg-red/10 border-red/20 text-red'}`}>
              {pwdMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={pwdLoading || !currentPwd || !newPwd || newPwd !== confirmPwd}
            className="px-6 py-2 bg-blue/10 border border-blue/30 text-blue font-mono text-sm
              rounded-lg hover:bg-blue/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pwdLoading ? 'Зміна...' : 'Змінити пароль'}
          </button>
        </form>
      </div>

      {/* Сесії та вихід */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-[#cdd9e5] mb-4">Сесії</h3>
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="w-full flex items-center justify-between px-4 py-3 bg-bg border border-border
              rounded-lg hover:border-yellow/30 hover:bg-yellow/5 transition-all group"
          >
            <div className="text-left">
              <div className="text-sm font-mono text-[#cdd9e5] group-hover:text-yellow transition-colors">
                Вийти з акаунту
              </div>
              <div className="text-[11px] font-mono text-text-dim">Завершити поточну сесію</div>
            </div>
            <span className="text-yellow text-lg">→</span>
          </button>

          <button
            onClick={handleLogoutAll}
            disabled={logoutLoading}
            className="w-full flex items-center justify-between px-4 py-3 bg-bg border border-border
              rounded-lg hover:border-red/30 hover:bg-red/5 transition-all group"
          >
            <div className="text-left">
              <div className="text-sm font-mono text-[#cdd9e5] group-hover:text-red transition-colors">
                Вийти з усіх пристроїв
              </div>
              <div className="text-[11px] font-mono text-text-dim">
                Завершити всі активні сесії
              </div>
            </div>
            <span className="text-red text-lg">⊗</span>
          </button>
        </div>
      </div>

    </div>
  );
}