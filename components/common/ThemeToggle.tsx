'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'odm_theme';

type Theme = 'light' | 'dark';

type ThemeToggleProps = {
  compact?: boolean;
  className?: string;
};

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.dataset.theme = theme;
}

function getThemeSnapshot(): Theme {
  if (typeof window === 'undefined') return 'light';

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function subscribeToThemeChange(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('odm-theme-change', callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('odm-theme-change', callback);
  };
}

export default function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribeToThemeChange, getThemeSnapshot, (): Theme => 'light');
  const isDark = theme === 'dark';

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = isDark ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event('odm-theme-change'));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''} ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun size={compact ? 16 : 17} /> : <Moon size={compact ? 16 : 17} />}
      {!compact && <span>{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  );
}
