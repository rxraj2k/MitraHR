import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { THEME_MODE_PAIR, THEMES, ThemeDefinition, ThemeName } from '../lib/themes';

const STORAGE_KEY = 'mitrahr_theme_name';
// The old binary key from before the 4-theme engine -- still read once as a
// migration fallback so an existing user's dark/light choice carries
// forward as the matching new theme, instead of everyone silently landing
// back on the neon-aurora default the first time they open the app after
// this update.
const LEGACY_STORAGE_KEY = 'mitrahr_theme';

function getInitialThemeName(): ThemeName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in THEMES) return stored as ThemeName;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === 'dark') return 'neon-aurora';
    if (legacy === 'light') return 'spectrum-pop';
  } catch {
    // localStorage unavailable (private browsing, etc.) -- fall through to
    // the system preference below.
  }
  // Default for anyone with no saved preference at all (a first-time
  // visitor, or localStorage unavailable) -- Aqua Glass, per his request,
  // rather than picking neon-aurora/spectrum-pop off the OS's light/dark
  // setting as before.
  return 'aqua-glass';
}

interface ThemeContextType {
  themeName: ThemeName;
  theme: ThemeDefinition;
  mode: 'light' | 'dark';
  setThemeName: (theme: ThemeName) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Two layers of theming live here. (1) Tailwind's `dark:` variant (the
// `dark` class on <html>, darkMode: 'class' in tailwind.config.js) still
// drives every page's own light/dark-aware styling exactly as before --
// two of the four named themes are "dark mode" themes, two are "light
// mode" themes, and this class is what flips that switch for the whole
// app's existing dark: utility classes. (2) A set of CSS custom properties
// (see lib/themes.ts) set directly on <html> drive the *chrome* layer --
// sidebar, header, nav cards, badges, the profile pill -- which is the
// part that actually changes per named theme, not just per light/dark.
// Both persist to localStorage, per-browser, same as the old binary toggle.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>(getInitialThemeName);
  const theme = THEMES[themeName];

  useEffect(() => {
    const root = document.documentElement;
    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.dataset.theme = theme.id;
    for (const [key, value] of Object.entries(theme.vars)) {
      root.style.setProperty(key, value);
    }
    try {
      localStorage.setItem(STORAGE_KEY, themeName);
    } catch {
      // Ignore -- worst case the choice doesn't persist across reloads.
    }
  }, [theme, themeName]);

  const setThemeName = (next: ThemeName) => setThemeNameState(next);
  const toggleMode = () => setThemeNameState((t) => THEME_MODE_PAIR[t]);

  return (
    <ThemeContext.Provider value={{ themeName, theme, mode: theme.mode, setThemeName, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
