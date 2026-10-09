import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'pizza-shop-theme';
const ThemeContext = createContext({ theme: 'light', toggle: () => {}, followsSystem: true });

const readStored = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch {
    return null;
  }
};

const systemTheme = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

/**
 * Light / dark mode. Follows the operating-system setting until the visitor
 * picks one with the header toggle; the choice is remembered in localStorage.
 * index.html applies the same rule before React loads so there is no flash.
 */
export function ThemeProvider({ children }) {
  const [stored, setStored] = useState(readStored);
  const [system, setSystem] = useState(systemTheme);
  const theme = stored || system;

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystem(e.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setStored(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, toggle, followsSystem: !stored }), [theme, toggle, stored]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
