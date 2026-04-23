"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/alerts", label: "Алерти", icon: "🔔" },
  { href: "/history", label: "Історія", icon: "📈" },
  { href: "/settings", label: "Налаштування", icon: "⚙️" },
  { href: '/profile',   label: 'Профіль',      icon: '👤' },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-surface border-r border-border flex flex-col z-10">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green/30 to-green rounded-lg flex items-center justify-center text-sm">
            📊
          </div>
          <span className="font-bold text-sm text-[#cdd9e5]">
            Funding Monitor
          </span>
        </div>
      </div>
      <nav className="flex-1 p-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-1 transition-colors
              ${
                path === l.href
                  ? "bg-blue/10 text-blue font-semibold"
                  : "text-text-muted hover:text-[#cdd9e5] hover:bg-white/5"
              }`}
          >
            <span>{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-border text-xs text-text-dim font-mono">
        v1.0.0 · KuCoin
      </div>
    </aside>
  );
}
