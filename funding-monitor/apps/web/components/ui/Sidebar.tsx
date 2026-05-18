'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Dashboard',     icon: '📊' },
  { href: '/top-basis',  label: 'Топ базис',    icon: '🎯' },
  { href: '/alerts',    label: 'Алерти',        icon: '🔔' },
  { href: '/history',   label: 'Історія',       icon: '📈' },
  { href: '/settings',  label: 'Налаштування',  icon: '⚙️' },
  { href: '/profile',   label: 'Профіль',       icon: '👤' },
];

export default function Sidebar() {
  const path   = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-surface border-r border-border flex flex-col z-10">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green/30 to-green rounded-lg flex items-center justify-center text-sm">
            📊
          </div>
          <span className="font-bold text-sm text-[#cdd9e5]">Funding Monitor</span>
        </div>
      </div>
      <nav className="flex-1 p-3 overflow-y-auto">
        {links.map(l => {
          const isActive = path === l.href || path.startsWith(l.href + '/');
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-1 transition-all
                ${isActive
                  ? 'bg-blue/10 text-blue font-semibold border border-blue/20'
                  : 'text-text-muted hover:text-[#cdd9e5] hover:bg-white/5 border border-transparent'
                }`}
            >
              <span className="text-base">{l.icon}</span>
              <span>{l.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-blue/10 border border-blue/20
              flex items-center justify-center text-xs font-bold text-blue font-mono">
              {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-[#cdd9e5] truncate">
                {user.name || user.email}
              </div>
              <div className="text-[10px] font-mono text-text-dim truncate">
                {user.email}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm
            text-text-muted hover:text-red hover:bg-red/5 transition-all border border-transparent
            hover:border-red/20"
        >
          <span>🚪</span>
          <span>Вийти</span>
        </button>

        <div className="text-center mt-2 text-[10px] font-mono text-text-dim">
          v1.0.0 · KuCoin
        </div>
      </div>
    </aside>
  );
}