"use client";

import React from "react";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/use-online-status";

/** Shown across the whole dashboard while the browser reports no connection.
 *  Your data still works offline (it's all in localStorage) — this is only
 *  a heads-up that the AI features (chat, quiz generation, roadmap) can't
 *  reach the server right now. */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="mx-4 md:mx-6 mt-3 p-3 bg-ink text-white rounded-xl text-xs flex items-center gap-2">
      <WifiOff className="w-4 h-4 shrink-0" />
      <p>
        You&apos;re offline. Your planner, notes and quizzes still work from what&apos;s on this
        device — AI features (chat, quiz generation, roadmap) will resume once you&apos;re back online.
      </p>
    </div>
  );
}
