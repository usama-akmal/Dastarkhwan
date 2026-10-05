import { createContext, useContext } from 'react';

/**
 * Theme context, kept in its own module.
 *
 * It lives apart from ThemeProvider so that the provider file exports only a
 * component: mixing a component and a hook in one file breaks React Fast Refresh,
 * and re-exporting the hook from the provider would reintroduce the same problem.
 */
export const ThemeContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider');
  return context;
}
