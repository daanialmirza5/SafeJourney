"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  variant: "success" | "error";
}

interface ToastContextValue {
  showToast: (message: string, variant?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div role="region" aria-label="Notifications" className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.variant === "error" ? "alert" : "status"}
            aria-live={t.variant === "error" ? "assertive" : "polite"}
            className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
              t.variant === "success" ? "border-emerald-200 bg-white text-emerald-800" : "border-rose-200 bg-white text-rose-800"
            }`}
          >
            {t.variant === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
            <span className="max-w-xs">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="ml-2 text-slate-400 hover:text-slate-600"
              aria-label="Dismiss notification"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
