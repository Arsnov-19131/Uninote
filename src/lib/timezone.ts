/**
 * The app has no per-user timezone setting — every date is computed from
 * the device's own clock and IANA zone (see src/lib/calendar.ts, dayKeyOf).
 * That's the right default for a single-device student planner, but if the
 * device's zone changes (travel, a VPN, a manually changed system clock)
 * task days and reminder timing shift with it. This module remembers the
 * zone we last saw so the UI can tell the student when that happened,
 * instead of silently reshuffling their planner.
 */

export const TIMEZONE_STORAGE_KEY = "ast-timezone";

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export interface TimezoneCheckResult {
  current: string;
  /** The zone stored from the last check, or null the very first time the app runs. */
  previous: string | null;
  /** True only when a previous zone was recorded and it differs from the current one. */
  changed: boolean;
}

/**
 * Compares the device's current zone against the last one we recorded, then
 * updates the record to the current zone. Call this once per app load
 * (see TimezoneBanner) — calling it again immediately will report no change,
 * by design, so the banner shows once per actual change.
 */
export function checkAndRecordTimezone(): TimezoneCheckResult {
  const current = getDeviceTimezone();
  if (typeof window === "undefined") {
    return { current, previous: null, changed: false };
  }
  let previous: string | null = null;
  try {
    previous = window.localStorage.getItem(TIMEZONE_STORAGE_KEY);
    window.localStorage.setItem(TIMEZONE_STORAGE_KEY, current);
  } catch {
    // Storage blocked (private browsing, quota) — treat as unchanged rather than nagging every load.
    return { current, previous: current, changed: false };
  }
  return { current, previous, changed: previous !== null && previous !== current };
}
