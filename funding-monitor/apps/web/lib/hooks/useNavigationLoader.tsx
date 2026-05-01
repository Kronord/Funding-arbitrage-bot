'use client';
import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export function useNavigationLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // Скидаємо лоадер коли pathname змінився (навігація завершена)
  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  // Перехоплюємо кліки на всі <a> теги
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Ігноруємо зовнішні посилання, якорі, mailto тощо
      if (
        href.startsWith('http') ||
        href.startsWith('mailto') ||
        href.startsWith('#') ||
        href.startsWith('tel') ||
        target.getAttribute('target') === '_blank'
      ) return;

      // Ігноруємо якщо вже на цій сторінці
      if (href === pathname) return;

      // Ігноруємо якщо Ctrl/Cmd натиснутий
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;

      setLoading(true);
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  // Скидаємо якщо навігація не відбулась через 5 секунд
  useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(id);
  }, [loading]);

  return { loading };
}