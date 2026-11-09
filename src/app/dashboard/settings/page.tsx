"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import {
  Download,
  Trash2,
  Shield,
  SunMoon,
  Clock,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { getDeviceTimezone } from "@/lib/timezone";
import CloudAccount from "@/components/CloudAccount";

export default function SettingsPage() {
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    // Read on the client only — Intl.DateTimeFormat() depends on the
    // visitor's machine, so it must not run during server rendering.
    setTimezone(getDeviceTimezone());
  }, []);

  // Export full JSON backup
  const handleExportBackup = () => {
    const backup: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("ast-")) {
        backup[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai_study_toolkit_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // revoking at once can cancel the download on Safari
  };

  // Clear local storage data
  const handleClearData = () => {
    if (
      confirm(
        "Clear all local data? This will remove all your subjects, notes, tasks, quizzes, and history from this device. If you are signed in, your cloud copy will sync back."
      )
    ) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("ast-")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink">
          Settings & Preferences
        </h1>
        <p className="text-sm text-ink-light">
          Manage your appearance, cloud synchronization, and offline data.
        </p>
      </div>

      {/* Appearance */}
      <Card className="p-6 bg-surface space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <SunMoon className="w-5 h-5 text-sky-600" />
          <h2 className="font-heading text-lg font-bold text-ink">Appearance</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-ink-light leading-relaxed max-w-sm">
            Light or dark, or follow your device&apos;s setting automatically.
          </p>
          <ThemeToggle />
        </div>
      </Card>

      {/* Timezone */}
      <Card className="p-6 bg-surface space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Clock className="w-5 h-5 text-sky-600" />
          <h2 className="font-heading text-lg font-bold text-ink">Timezone</h2>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{timezone}</p>
          <p className="mt-1 text-xs text-ink-light leading-relaxed max-w-lg">
            Detected automatically from your device. Task dates, planner views, and reminder notifications schedule using this timezone.
          </p>
        </div>
      </Card>

      {/* Account & Cloud Sync */}
      <Card className="p-6 bg-surface space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Shield className="w-5 h-5 text-sky-600" />
          <h2 className="font-heading text-lg font-bold text-ink">Account & Cloud Sync</h2>
        </div>
        <p className="text-xs text-ink-light leading-relaxed">
          Sign in to back up your study data to your private Supabase account and sync it across devices. Your current browser copy remains available offline.
        </p>
        <CloudAccount />
      </Card>

      {/* Local Data & Offline Persistence */}
      <Card className="p-6 bg-surface space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Shield className="w-5 h-5 text-sky-600" />
          <h2 className="font-heading text-lg font-bold text-ink">
            Local Data & Offline Persistence
          </h2>
        </div>

        <p className="text-xs text-ink-light leading-relaxed">
          All your subjects, roadmap items, notes, quizzes, and planner tasks are saved securely on your device via browser local storage (offline-first).
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button size="sm" variant="secondary" onClick={handleExportBackup}>
            <Download className="w-4 h-4" /> Export Data Backup (JSON)
          </Button>

          <Button size="sm" variant="danger" onClick={handleClearData}>
            <Trash2 className="w-4 h-4" /> Clear All Local Data
          </Button>
        </div>
      </Card>
    </div>
  );
}
