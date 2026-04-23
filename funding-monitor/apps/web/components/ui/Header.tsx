"use client";
import { useFunding } from "@/lib/hooks/useFunding";

export default function Header() {
  const { report, error } = useFunding();
  const isLive = !!report && !error;

  return (
    <header className="h-12 bg-surface border-b border-border flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4 font-mono text-xs text-text-muted">
        <div className="flex items-center gap-2 bg-bg border border-border rounded-full px-3 py-1">
          <span
            className={`w-2 h-2 rounded-full ${isLive ? "bg-green animate-pulse" : "bg-red"}`}
          />
          <span>{isLive ? "Live" : error ? "Помилка" : "Підключення..."}</span>
        </div>
        {report && (
          <span className="text-text-dim">Оновлено: {report.updatedAt}</span>
        )}
      </div>
    </header>
  );
}
