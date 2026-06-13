/**
 * ThemeToggle: flips data-theme on <html> and persists the choice. The
 * initial value is applied pre-paint by the inline script in app/layout.tsx;
 * this component only reads what that script already set (no flash).
 */
'use client';

import { useEffect, useState } from 'react';
import { setStoredJson, STORAGE_KEYS } from '@/lib/storage';

type Theme = 'light' | 'dark';

export function ThemeToggle(): React.JSX.Element {
  // Render a stable default on the server; sync to the real value after
  // mount — the suppressHydrationWarning on <html> covers the attribute.
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === 'dark' || current === 'light') setTheme(current);
  }, []);

  const toggle = (): void => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    setStoredJson(STORAGE_KEYS.theme, next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === 'dark'}
      aria-label="Dark theme"
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface text-lg hover:bg-primary-soft"
    >
      <span aria-hidden="true">{theme === 'dark' ? '🌙' : '☀️'}</span>
    </button>
  );
}
