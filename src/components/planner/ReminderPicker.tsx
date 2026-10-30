"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { durationPhrase } from "@/lib/reminders";

/** Reminder times offered, in minutes before the task: 15 min, 1 h, 3 h, 1 day, 2 days, 7 days. */
export const REMINDER_CHOICES = [15, 60, 180, 1440, 2880, 10080];

interface ReminderPickerProps {
  /** Selected reminders, in minutes before the task. An empty list means no reminders. */
  value: number[];
  onChange: (next: number[]) => void;
}

/** Toggle any number of reminders. Turning a chip off deletes that reminder. */
export default function ReminderPicker({ value, onChange }: ReminderPickerProps) {
  // A task can already carry a reminder that is not one of the standard choices (for example 2 hours); keep it visible.
  const choices = Array.from(new Set([...REMINDER_CHOICES, ...value.filter((m) => m > 0)])).sort(
    (a, b) => a - b,
  );

  const toggle = (minutes: number) => {
    onChange(
      value.includes(minutes)
        ? value.filter((m) => m !== minutes)
        : [...value, minutes].sort((a, b) => b - a),
    );
  };

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-ink-light mb-1.5">Reminders</legend>
      <div className="flex flex-wrap gap-1.5">
        {choices.map((m) => {
          const on = value.includes(m);
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(m)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer",
                on
                  ? "bg-brand text-white border-brand"
                  : "bg-surface text-ink-light border-border hover:bg-sidebar",
              )}
            >
              {durationPhrase(m)} before
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-ink-faint">
        {value.length === 0
          ? "No reminders. Select one or more."
          : "Reminders already in the past are skipped."}
      </p>
    </fieldset>
  );
}
