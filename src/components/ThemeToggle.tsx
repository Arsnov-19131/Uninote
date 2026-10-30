"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ThemePreference,
  applyThemePreference,
  getStoredThemePreference,
  watchSystemTheme,
} from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Light / Dark / System segmented control. Applies immediately, no save button. */
export default function ThemeToggle() {
  // Starts "system" on the server and during the first client render so
  // markup matches; the real stored value is read once mounted.
  const [pref, setPref] = useState<ThemePreference>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPref(getStoredThemePreference());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pref !== "system") return;
    // While "system" is selected, follow OS changes live (e.g. the device
    // switches to dark mode at sunset) without needing a page reload.
    return watchSystemTheme(() => applyThemePreference("system"));
  }, [pref]);

  const choose = (next: ThemePreference) => {
    setPref(next);
    applyThemePreference(next);
  };

  return (
    <div
      className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-border bg-surface"
      role="radiogroup"
      aria-label="Theme"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && pref === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer",
              active
                ? "bg-brand text-white"
                : "text-ink-light hover:bg-sidebar",
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
