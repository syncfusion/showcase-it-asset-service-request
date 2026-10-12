import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'it-portal-theme';

export type Theme = 'light' | 'dark';

/**
 * Returns the initial theme, preferring any existing localStorage value,
 * then `prefers-color-scheme`, then 'light'.
 */
function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (_) {
    // localStorage may be unavailable (private mode, etc.) — fall through.
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export interface UseThemeResult {
  theme: Theme;
  toggle: () => void;
  setTheme: (next: Theme) => void;
}

const ThemeContext = createContext<UseThemeResult | null>(null);

/**
 * Wraps the app and provides a single shared theme state to every
 * `useTheme()` consumer. Without this, every component that called
 * `useTheme()` previously ran its own `useState(readInitialTheme)`,
 * so the AppBar's toggle button and the Dashboard's `themeKey` prop
 * were independent state machines. Toggling the theme in the AppBar
 * updated only AppBar's state — the Dashboard kept the stale value,
 * the chart re-mounted on the wrong theme, and after navigating away
 * and back the Dashboard's `useState` initializer re-read the now-
 * correct `localStorage` value, so the page flipped themes at the
 * worst possible moment.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  // Apply on mount + on every change.
  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {
      // Ignore storage errors.
    }
  }, [theme]);

  // Cross-tab sync — if the user opens a second tab and toggles
  // there, every other tab also flips. Without this the two tabs
  // can desync because each owns its own copy of the in-memory
  // state and the last one to write `localStorage` wins.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = e.newValue;
      if (next === 'light' || next === 'dark') {
        setThemeState(next);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next === 'dark' ? 'dark' : 'light');
  }, []);

  const value = useMemo<UseThemeResult>(
    () => ({ theme, toggle, setTheme }),
    [theme, toggle, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Light / dark theme hook.
 *
 * Reads the shared theme from `ThemeContext` (provided by
 * `ThemeProvider`, mounted once near the app root). On every
 * change, the provider applies `data-theme` to
 * `document.documentElement` and persists the value to
 * `localStorage`.
 *
 * Returns `{ theme, toggle, setTheme }`.
 */
export function useTheme(): UseThemeResult {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for components that mount before the provider (e.g.
    // a stray test render) — give them a local-only theme so they
    // don't crash. Production mounts always wrap the tree in
    // <ThemeProvider>, so this branch is rarely hit.
    const [theme, setThemeState] = useState<Theme>(readInitialTheme);
    useEffect(() => {
      applyTheme(theme);
      try {
        window.localStorage.setItem(STORAGE_KEY, theme);
      } catch (_) {
        // ignore
      }
    }, [theme]);
    const toggle = useCallback(() => {
      setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }, []);
    const setTheme = useCallback((next: Theme) => {
      setThemeState(next === 'dark' ? 'dark' : 'light');
    }, []);
    return { theme, toggle, setTheme };
  }
  return ctx;
}

export default useTheme;
