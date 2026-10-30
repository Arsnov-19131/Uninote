"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/store/notifications";
import ReminderEngine from "@/components/ReminderEngine";
import TimezoneBanner from "@/components/TimezoneBanner";
import OfflineBanner from "@/components/OfflineBanner";
import CloudSync from "@/components/CloudSync";
import {
  Calendar,
  Map,
  MessageSquare,
  FileText,
  BrainCircuit,
  BarChart3,
  FolderOpen,
  Settings,
  Bell,
  Menu,
  X,
  Home,
  GraduationCap,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/planner", label: "Planner", icon: Calendar },
  { href: "/dashboard/roadmap", label: "Roadmap", icon: Map },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard/vault", label: "Vault", icon: FileText },
  { href: "/dashboard/quiz", label: "Quiz", icon: BrainCircuit },
  { href: "/dashboard/tracker", label: "Tracker", icon: BarChart3 },
  { href: "/dashboard/resources", label: "Resources", icon: FolderOpen },
];

// Mobile bottom nav: show 4 main + More
const MOBILE_NAV = [
  { href: "/dashboard/planner", label: "Planner", icon: Calendar },
  { href: "/dashboard/roadmap", label: "Roadmap", icon: Map },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard/vault", label: "Vault", icon: FileText },
];

const MORE_NAV = [
  { href: "/dashboard/quiz", label: "Quiz", icon: BrainCircuit },
  { href: "/dashboard/tracker", label: "Tracker", icon: BarChart3 },
  { href: "/dashboard/resources", label: "Resources", icon: FolderOpen },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => n.status === "sent" && !n.read).length;

  return (
    <div className="min-h-screen flex bg-paper" suppressHydrationWarning>
      {/* ===== Desktop Sidebar ===== */}
      <aside
        className="hidden md:flex flex-col w-60 bg-sidebar border-r border-border fixed inset-y-0 left-0 z-50"
        suppressHydrationWarning
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border" suppressHydrationWarning>
          <GraduationCap className="w-6 h-6 text-ink" />
          <span className="font-heading text-lg font-bold text-ink">
            Study Toolkit
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-light hover:bg-surface/60 hover:text-ink",
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border p-2">
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              pathname === "/dashboard/settings"
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-light hover:bg-surface/60",
            )}
          >
            <Settings className="w-[18px] h-[18px]" />
            Settings
          </Link>
        </div>
      </aside>

      {/* ===== Mobile Sidebar Overlay ===== */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar shadow-xl animate-fade-in">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-ink" />
                <span className="font-heading text-lg font-bold text-ink">
                  Study Toolkit
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md hover:bg-surface/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="py-2 px-2 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-surface text-ink shadow-sm"
                        : "text-ink-light hover:bg-surface/60",
                    )}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/dashboard/settings"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mt-2 border-t border-border pt-3",
                  pathname === "/dashboard/settings"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-light hover:bg-surface/60",
                )}
              >
                <Settings className="w-[18px] h-[18px]" />
                Settings
              </Link>
            </nav>
          </aside>
        </div>
      )}

      {/* ===== Main Content ===== */}
      <div className="flex-1 flex flex-col md:ml-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-paper/90 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-sidebar"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-ink" />
            </button>
            <Link href="/dashboard" className="md:hidden flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-ink" />
              <span className="font-heading text-base font-bold text-ink">
                Study Toolkit
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/notifications"
              className="relative p-2 rounded-lg hover:bg-sidebar transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-ink-light" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        <ReminderEngine />
        <CloudSync />
        <OfflineBanner />
        <TimezoneBanner />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 graph-paper">
          {children}
        </main>
      </div>

      {/* ===== Mobile Bottom Navigation ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-surface border-t border-border flex items-center justify-around px-1 py-1.5 safe-bottom">
        {MOBILE_NAV.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-all min-w-[56px]",
                isActive
                  ? "text-ink"
                  : "text-ink-faint",
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5",
                  isActive && "text-sky-600",
                )}
              />
              {item.label}
            </Link>
          );
        })}
        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-all min-w-[56px] cursor-pointer",
            moreOpen ? "text-ink" : "text-ink-faint",
          )}
        >
          <Menu className={cn("w-5 h-5", moreOpen && "text-sky-600")} />
          More
        </button>
      </nav>

      {/* More menu popup */}
      {moreOpen && (
        <div className="fixed bottom-16 right-2 z-40 md:hidden animate-slide-up">
          <div className="bg-surface rounded-xl shadow-xl border border-border p-2 min-w-[160px]">
            {MORE_NAV.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-sidebar text-ink"
                      : "text-ink-light hover:bg-sidebar",
                  )}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
