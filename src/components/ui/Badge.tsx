import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  ShieldCheck,
  Send,
  Truck,
  HeartPulse,
  UserCheck,
} from "lucide-react";
import type { ReactNode } from "react";

const STATUS_STYLES: Record<string, { classes: string; icon: ReactNode }> = {
  // Operational Status
  ON_TRACK: { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="size-3" aria-hidden="true" /> },
  ACTION_REQUIRED: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <AlertTriangle className="size-3" aria-hidden="true" /> },
  STUCK: { classes: "bg-rose-50 text-rose-700 border-rose-200", icon: <XCircle className="size-3" aria-hidden="true" /> },
  CLOSED: { classes: "bg-slate-100 text-slate-700 border-slate-200", icon: <ShieldCheck className="size-3" aria-hidden="true" /> },

  // Referral Lifecycle Statuses
  DRAFT: { classes: "bg-slate-100 text-slate-600 border-slate-200", icon: <Circle className="size-3" aria-hidden="true" /> },
  CREATED: { classes: "bg-blue-50 text-blue-700 border-blue-200", icon: <Circle className="size-3" aria-hidden="true" /> },
  SENT: { classes: "bg-blue-50 text-blue-700 border-blue-200", icon: <Send className="size-3" aria-hidden="true" /> },
  ACKNOWLEDGED: { classes: "bg-teal-50 text-teal-700 border-teal-200", icon: <CheckCircle2 className="size-3" aria-hidden="true" /> },
  TRANSPORT_REQUESTED: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <Clock className="size-3" aria-hidden="true" /> },
  TRANSPORT_ASSIGNED: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <Truck className="size-3" aria-hidden="true" /> },
  IN_TRANSIT: { classes: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: <Truck className="size-3" aria-hidden="true" /> },
  ARRIVED: { classes: "bg-teal-50 text-teal-700 border-teal-200", icon: <CheckCircle2 className="size-3" aria-hidden="true" /> },
  UNDER_CARE: { classes: "bg-purple-50 text-purple-700 border-purple-200", icon: <HeartPulse className="size-3" aria-hidden="true" /> },
  DISCHARGED: { classes: "bg-slate-100 text-slate-700 border-slate-200", icon: <CheckCircle2 className="size-3" aria-hidden="true" /> },
  BACK_REFERRED: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <Clock className="size-3" aria-hidden="true" /> },
  FOLLOW_UP_PENDING: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <UserCheck className="size-3" aria-hidden="true" /> },
  FOLLOW_UP_CONFIRMED: { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="size-3" aria-hidden="true" /> },
  CANCELLED: { classes: "bg-rose-50 text-rose-700 border-rose-200", icon: <XCircle className="size-3" aria-hidden="true" /> },

  // Task & Benefit Statuses
  PENDING: { classes: "bg-slate-100 text-slate-600 border-slate-200", icon: <Clock className="size-3" aria-hidden="true" /> },
  DUE: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <Clock className="size-3" aria-hidden="true" /> },
  OVERDUE: { classes: "bg-rose-50 text-rose-700 border-rose-200", icon: <AlertTriangle className="size-3" aria-hidden="true" /> },
  COMPLETED: { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="size-3" aria-hidden="true" /> },
  COMPLETE: { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="size-3" aria-hidden="true" /> },
  NEEDS_REVIEW: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <AlertTriangle className="size-3" aria-hidden="true" /> },
  NOT_APPLICABLE: { classes: "bg-slate-50 text-slate-400 border-slate-200", icon: <Circle className="size-3" aria-hidden="true" /> },
  POTENTIALLY_APPLICABLE: { classes: "bg-teal-50 text-teal-700 border-teal-200", icon: <CheckCircle2 className="size-3" aria-hidden="true" /> },
  NOT_APPLICABLE_BENEFIT: { classes: "bg-slate-50 text-slate-400 border-slate-200", icon: <Circle className="size-3" aria-hidden="true" /> },
  NEEDS_VERIFICATION: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <AlertTriangle className="size-3" aria-hidden="true" /> },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const style = STATUS_STYLES[status] ?? {
    classes: "bg-slate-100 text-slate-600 border-slate-200",
    icon: <Circle className="size-3" aria-hidden="true" />,
  };
  const text = label ?? status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span
      role="status"
      aria-label={`Status: ${text}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.classes}`}
    >
      {style.icon}
      <span>{text}</span>
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    ROUTINE: "bg-slate-100 text-slate-700 border-slate-200",
    URGENT: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
    EMERGENCY: "bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse",
  };
  const text = priority.charAt(0) + priority.slice(1).toLowerCase();
  return (
    <span
      role="status"
      aria-label={`Priority level: ${text}`}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[priority] ?? styles.ROUTINE}`}
    >
      {text}
    </span>
  );
}
