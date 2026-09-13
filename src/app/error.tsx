"use client";

import { AlertTriangle } from "lucide-react";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-center">
      <AlertTriangle className="size-8 text-amber-500" />
      <p className="text-sm font-medium text-slate-800">{error.message || "Something went wrong."}</p>
      <button onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
        Try again
      </button>
    </div>
  );
}
