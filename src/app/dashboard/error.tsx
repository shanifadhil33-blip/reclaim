"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send to Sentry → triggers email alert
    Sentry.captureException(error);

    // Also log to Vercel Function Logs
    console.error("[DASHBOARD ERROR]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : "unknown",
    });
  }, [error]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-300">
      <div className="bg-red-500/10 border border-red-500/20 rounded-full p-4 mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-400"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-2">
        Something went wrong
      </h2>
      <p className="text-neutral-400 mb-1 max-w-md">
        This page ran into an unexpected error. Your data is safe.
      </p>
      {error.digest && (
        <p className="text-xs text-neutral-600 font-mono mb-6">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          onClick={reset}
          className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50"
        >
          Try Again
        </Button>
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/dashboard")}
          className="bg-transparent border-white/10 text-neutral-300 hover:bg-white/5 hover:text-white"
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
