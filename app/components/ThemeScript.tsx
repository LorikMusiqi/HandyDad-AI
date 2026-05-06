import { DEFAULT_THEME, THEME_STORAGE_KEY } from '../lib/themes'

const VALID_THEMES = ['workbench', 'garage-blue', 'safety-orange', 'forest-green', 'steel-gray']

/**
 * Inline script injected into <head> so the saved theme is applied
 * before the first paint — prevents a flash of the default theme
 * when navigating to login/signup or reloading the page.
 */
export function ThemeScript() {
  const script = `
(function(){try{
  var key=${JSON.stringify(THEME_STORAGE_KEY)};
  var def=${JSON.stringify(DEFAULT_THEME)};
  var valid=${JSON.stringify(VALID_THEMES)};
  var t=localStorage.getItem(key);
  document.documentElement.dataset.theme=valid.indexOf(t)>=0?t:def;
}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
