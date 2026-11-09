"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-paper flex items-center justify-center min-h-screen p-4 text-center">
        <div className="flex flex-col items-center max-w-md">
          <div className="bg-red-100 p-4 rounded-full mb-6">
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">Critical System Error</h1>
          <p className="text-sm text-ink-light mb-8">
            A critical error occurred that affected the entire application.
            {error.digest && <span className="block mt-2 font-mono text-xs opacity-60">Ref: {error.digest}</span>}
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover transition-all flex items-center gap-2 mx-auto"
          >
            <RefreshCcw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
