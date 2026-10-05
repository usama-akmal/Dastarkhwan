import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './themeContext';

/**
 * Theme handling.
 *
 * Three modes: `system` follows the OS preference and updates live if the user
 * changes it; `dark` and `light` are explicit overrides. The resolved value is
 * written to `data-theme` on <html>, which is what every token selector keys off.
 *
 * The theme is applied by an inline script in index.html *before* first paint, so
 * there is no flash of the wrong theme; this provider only takes over afterwards.
 */

const STORAGE_KEY = 'dastarkhwan:theme';

/** Read the persisted preference, defaulting to following the OS. */
function readStoredMode() {
  if (typeof localStorage === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Subscribe to the OS colour-scheme preference. */
function useSystemPrefersDark() {
  const [prefersDark, setPrefersDark] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  ));

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setPrefersDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return prefersDark;
}

/**
 * Keep the browser chrome colour in step with the surface.
 *
 * Read from the `--surface-base` token rather than duplicating hex values here, so
 * the address bar can never drift from the applied theme.
 */
function syncThemeColorMeta() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const surface = getComputedStyle(document.documentElement)
    .getPropertyValue('--surface-base')
    .trim();
  if (surface) meta.setAttribute('content', surface);
}

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(readStoredMode);
  const prefersDark = useSystemPrefersDark();

  // Derived during render, not stored in state: two sources of truth for the same
  // value is what caused the previous cascading re-render.
  const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    syncThemeColorMeta();
  }, [resolved]);

  const setTheme = useCallback((next) => {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing or a full quota: the theme still applies for this session.
    }
  }, []);

  const value = useMemo(
    () => ({ mode, resolved, setTheme, isDark: resolved === 'dark' }),
    [mode, resolved, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
