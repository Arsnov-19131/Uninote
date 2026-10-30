/**
 * Theme preference: "light" | "dark" | "system". Stored under the same
 * "ast-" prefix as the other stores, so it rides along with the existing
 * backup/export and "Clear All Local Data" tools in Settings for free.
 *
 * The actual light/dark decision (the .dark class on <html>) is applied in
 * two places that must agree:
 *  - an inline script in the root layout's <head>, which runs before first
 *    paint so there is no light-then-dark flash;
 *  - this module, for the toggle to update live without a reload.
 * Keep the logic in `resolveIsDark` identical to the inline script's.
 */

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "ast-theme";

/** The literal source used by the inline <head> script — kept here so the
 *  two copies can't drift apart; see src/app/layout.tsx. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var KEY = "${THEME_STORAGE_KEY}";
    var stored = localStorage.getItem(KEY);
    var pref = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    var isDark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage can throw in private browsing with storage disabled; fall through.
  }
  return "system";
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveIsDark(pref: ThemePreference): boolean {
  return pref === "dark" || (pref === "system" && systemPrefersDark());
}

/** Applies the preference to <html> and persists it. Safe to call from any client component. */
export function applyThemePreference(pref: ThemePreference): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveIsDark(pref));
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Storage full or blocked — the theme still applies for this page view.
  }
}

/** Re-applies "system" when the OS theme changes, while that preference is active. Returns an unsubscribe function. */
export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
