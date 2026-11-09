"use client";

import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <div className="bg-red-100 p-4 rounded-full mb-6">
        <AlertCircle className="w-12 h-12 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-ink mb-2">Something went wrong</h2>
      <p className="text-sm text-ink-light max-w-md mb-8">
        An unexpected error occurred while loading this page.
        {error.digest && <span className="block mt-2 font-mono text-xs opacity-60">Ref: {error.digest}</span>}
      </p>
      <Button
        onClick={() => reset()}
        className="flex items-center gap-2"
      >
        <RefreshCcw className="w-4 h-4" />
        Try again
      </Button>
    </div>
  );
}
