'use client';
import { useNavigationLoader } from '@/lib/hooks/useNavigationLoader';

export default function PageLoader() {
  const { loading } = useNavigationLoader();

  if (!loading) return null;

  return (
    <>
      {/* Прогрес бар зверху */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden">
        <div className="h-full bg-blue animate-pageload" />
      </div>

      {/* Легке затемнення */}
      <div className="fixed inset-0 z-[90] bg-bg/20 pointer-events-none" />

      {/* Спінер в кутку */}
      <div className="fixed bottom-6 right-6 z-[100]">
        <div className="bg-surface border border-border-bright rounded-lg px-4 py-2.5
          flex items-center gap-3 shadow-lg">
          <div className="w-4 h-4 border-2 border-border border-t-blue rounded-full animate-spin" />
          <span className="text-xs font-mono text-text-muted">Завантаження...</span>
        </div>
      </div>
    </>
  );
}