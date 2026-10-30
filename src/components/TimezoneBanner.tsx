"use client";

import React, { useEffect, useState } from "react";
import { Globe2, X } from "lucide-react";
import { checkAndRecordTimezone } from "@/lib/timezone";

/**
 * Tells the student when the device's time zone has changed since the app
 * was last open, since every task day and reminder is computed from it
 * (see src/lib/timezone.ts). Shows nothing on a normal visit; only appears
 * right after a real change, and only once until it changes again.
 */
export default function TimezoneBanner() {
  const [change, setChange] = useState<{ previous: string; current: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const result = checkAndRecordTimezone();
    if (result.changed && result.previous) {
      setChange({ previous: result.previous, current: result.current });
    }
  }, []);

  if (!change || dismissed) return null;

  return (
    <div className="mx-4 md:mx-6 mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
      <Globe2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
      <p className="flex-1">
        Your device&apos;s time zone changed from <strong>{change.previous}</strong> to{" "}
        <strong>{change.current}</strong>. Task days and reminder times are now shown in{" "}
        {change.current}.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 p-0.5 rounded hover:bg-amber-100 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
