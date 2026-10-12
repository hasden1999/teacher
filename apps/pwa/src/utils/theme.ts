export type AppTheme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'techeeer_theme';

export function getStoredTheme(): AppTheme {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return 'system';
  }
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme;
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

export function applyTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function setAppTheme(theme: AppTheme): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  applyTheme(theme);
}

export function initTheme(): void {
  const current = getStoredTheme();
  applyTheme(current);

  if (typeof window !== 'undefined') {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (getStoredTheme() === 'system') {
        applyTheme('system');
      }
    };
    media.addEventListener?.('change', listener);
  }
}
