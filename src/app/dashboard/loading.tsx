"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-ink mb-2">Loading your study space...</h2>
      <p className="text-sm text-ink-light">Gathering your notes and progress. Just a moment.</p>
    </div>
  );
}
