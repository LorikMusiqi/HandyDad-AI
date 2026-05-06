export const THEMES = {
  workbench:      { label: 'Workbench',     swatch: '#d97706' },
  'garage-blue':  { label: 'Garage Blue',   swatch: '#3b82f6' },
  'safety-orange':{ label: 'Safety Orange', swatch: '#ea580c' },
  'forest-green': { label: 'Forest Green',  swatch: '#16a34a' },
  'steel-gray':   { label: 'Steel Gray',    swatch: '#94a3b8' },
} as const

export type ThemeId = keyof typeof THEMES
export const DEFAULT_THEME: ThemeId = 'workbench'
export const THEME_STORAGE_KEY = 'handydad-theme'

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && value in THEMES
}

export function applyTheme(id: ThemeId) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = id
}

export function loadTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeId(stored) ? stored : DEFAULT_THEME
}

export function saveTheme(id: ThemeId) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(THEME_STORAGE_KEY, id)
}
