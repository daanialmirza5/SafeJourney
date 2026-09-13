import { AlertTriangle, CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import type { ReactNode } from "react";

const STATUS_STYLES: Record<string, { classes: string; icon: ReactNode }> = {
  ON_TRACK: { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="size-3.5" /> },
  ACTION_REQUIRED: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <AlertTriangle className="size-3.5" /> },
  STUCK: { classes: "bg-rose-50 text-rose-700 border-rose-200", icon: <XCircle className="size-3.5" /> },
  CLOSED: { classes: "bg-slate-100 text-slate-600 border-slate-200", icon: <CheckCircle2 className="size-3.5" /> },
  PENDING: { classes: "bg-slate-100 text-slate-600 border-slate-200", icon: <Circle className="size-3.5" /> },
  DUE: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <Clock className="size-3.5" /> },
  OVERDUE: { classes: "bg-rose-50 text-rose-700 border-rose-200", icon: <AlertTriangle className="size-3.5" /> },
  COMPLETED: { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="size-3.5" /> },
  COMPLETE: { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="size-3.5" /> },
  NEEDS_REVIEW: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <AlertTriangle className="size-3.5" /> },
  NOT_APPLICABLE: { classes: "bg-slate-50 text-slate-400 border-slate-200", icon: <Circle className="size-3.5" /> },
  CANCELLED: { classes: "bg-slate-100 text-slate-500 border-slate-200", icon: <XCircle className="size-3.5" /> },
  POTENTIALLY_APPLICABLE: { classes: "bg-teal-50 text-teal-700 border-teal-200", icon: <CheckCircle2 className="size-3.5" /> },
  NOT_APPLICABLE_BENEFIT: { classes: "bg-slate-50 text-slate-400 border-slate-200", icon: <Circle className="size-3.5" /> },
  NEEDS_VERIFICATION: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <AlertTriangle className="size-3.5" /> },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const style = STATUS_STYLES[status] ?? { classes: "bg-slate-100 text-slate-600 border-slate-200", icon: <Circle className="size-3.5" /> };
  const text = label ?? status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${style.classes}`}>
      {style.icon}
      {text}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    ROUTINE: "bg-slate-100 text-slate-600 border-slate-200",
    URGENT: "bg-amber-50 text-amber-800 border-amber-200",
    EMERGENCY: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles[priority] ?? styles.ROUTINE}`}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}
