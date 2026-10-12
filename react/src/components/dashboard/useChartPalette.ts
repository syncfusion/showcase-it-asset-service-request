import { useEffect, useState } from 'react';

/**
 * Reads a CSS custom property off `:root` at the current moment.
 * Returns an empty string if `window` is unavailable (SSR).
 */
function readToken(name: string): string {
  if (typeof window === 'undefined') return '';
  return window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Subscribes to `data-theme` mutations on `<html>` and returns the
 * latest value of each requested CSS custom property.
 *
 * Why this exists: chart components need to know the active theme's
 * CSS variable values *at the moment they mount* (so the very first
 * paint already matches the theme, with no light-mode flash) and
 * *whenever the theme switches* (so the chart axis label colour and
 * gradient stop update).
 *
 * A plain `useState` + `useEffect([themeKey])` only re-reads the
 * tokens when the *React* `themeKey` prop changes — and that only
 * happens if the *parent* got the new theme value. If the parent
 * (or the chain of parents) reads theme from a different store than
 * the toggle, the chart stays stuck on the wrong palette. Reading
 * the `data-theme` attribute directly via a `MutationObserver`
 * guarantees the chart palette tracks reality, not the React tree.
 */
export function useChartTokens<T extends Record<string, string>>(
  tokenNames: ReadonlyArray<keyof T & string>,
): T {
  const [tokens, setTokens] = useState<T>(() => {
    const out = {} as T;
    for (const name of tokenNames) {
      (out as Record<string, string>)[name] = readToken(name);
    }
    return out;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Re-read once on mount in case the values changed between the
    // initial `useState` seed (synchronous, in render) and the
    // effect tick.
    setTokens((prev) => {
      let changed = false;
      const next = { ...prev } as T;
      for (const name of tokenNames) {
        const value = readToken(name);
        if (value !== (prev as Record<string, string>)[name]) {
          (next as Record<string, string>)[name] = value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    // Watch for theme changes — `<html data-theme="dark">` is what
    // the `useTheme` hook flips, and CSS-variable overrides live
    // under `:root[data-theme="dark"]`. A mutation on any attribute
    // re-reads every requested token so axis label colour, gridline
    // colour, and gradient stops all follow the new theme.
    const target = document.documentElement;
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          setTokens(() => {
            const next = {} as T;
            for (const name of tokenNames) {
              (next as Record<string, string>)[name] = readToken(name);
            }
            return next;
          });
          return;
        }
      }
    });
    observer.observe(target, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [tokenNames]);

  return tokens;
}
