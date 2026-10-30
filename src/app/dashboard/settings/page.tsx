"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Input,
  Select,
} from "@/components/ui";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Shield,
  Check,
  SunMoon,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { getDeviceTimezone } from "@/lib/timezone";
import CloudAccount from "@/components/CloudAccount";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("Arslan Ali");
  const [readingLevel, setReadingLevel] = useState("simple");
  const [timezone, setTimezone] = useState("UTC");
  useEffect(() => {
    // Read on the client only — Intl.DateTimeFormat() depends on the
    // visitor's machine, so it must not run during server rendering.
    setTimezone(getDeviceTimezone());
  }, []);
  const [email, setEmail] = useState("student@example.com");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailBackupEnabled, setEmailBackupEnabled] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

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
    URL.revokeObjectURL(url);
  };

  // Clear local storage data
  const handleClearData = () => {
    if (confirm("Clear all local data? This will remove all your subjects, notes, tasks, quizzes, and history from this device.")) {
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
          Configure your study profile, AI explanation preferences, and local data.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" /> Preferences updated successfully!
        </div>
      )}

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

      {/* Profile & AI Form */}
      <Card className="p-6 bg-surface space-y-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <User className="w-5 h-5 text-sky-600" />
          <h2 className="font-heading text-lg font-bold text-ink">
            Study Profile & AI Preferences
          </h2>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <Select
              label="Default AI Explanation Style"
              options={[
                { value: "simple", label: "Very Simple (Analogies & Plain Words)" },
                { value: "normal", label: "Normal (Standard Syllabus Depth)" },
                { value: "detailed", label: "Detailed (Rigorous & Exam-Focused)" },
              ]}
              value={readingLevel}
              onChange={(e) => setReadingLevel(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input label="Timezone" value={timezone} disabled readOnly />
              <p className="mt-1 text-xs text-ink-faint">
                Detected from this device. Task days and reminders use it automatically — if you
                travel, open the app here and it updates on its own (you&apos;ll see a notice if it does).
              </p>
            </div>

            <Input
              type="email"
              label="Email (For reminder backup)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button size="md" type="submit">
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>

      {/* Notifications Preferences */}
      <Card className="p-6 bg-surface space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Bell className="w-5 h-5 text-sky-600" />
          <h2 className="font-heading text-lg font-bold text-ink">
            Notification Delivery
          </h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={(e) => setPushEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
            />
            <div className="text-xs sm:text-sm">
              <span className="font-semibold text-ink block">In-App & Push Notifications</span>
              <span className="text-ink-faint">Receive alerts on desktop and phone when tasks approach due time.</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={emailBackupEnabled}
              onChange={(e) => setEmailBackupEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
            />
            <div className="text-xs sm:text-sm">
              <span className="font-semibold text-ink block">Email Backup (Resend API)</span>
              <span className="text-ink-faint">Send reminder email when push notifications are denied or inactive.</span>
            </div>
          </label>
        </div>
      </Card>

      {/* Data Management & Backup */}
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
