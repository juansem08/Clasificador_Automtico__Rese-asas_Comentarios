import type { Theme } from '../types';

const KEY = 'tema';

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'light' || t === 'dark' || t === 'system') return t;
  } catch {
    // sin almacenamiento disponible
  }
  return 'system';
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // ignorar
  }
}

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && media().matches);
  document.documentElement.classList.toggle('dark', dark);
}

/** Aplica el tema y, si es "sistema", lo sigue cuando cambie el del sistema operativo. Devuelve la limpieza. */
export function watchTheme(theme: Theme): () => void {
  applyTheme(theme);
  if (theme !== 'system') return () => {};
  const m = media();
  const onChange = () => applyTheme('system');
  m.addEventListener('change', onChange);
  return () => m.removeEventListener('change', onChange);
}
