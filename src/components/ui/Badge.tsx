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
  ON_TRACK: { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="size-3" /> },
  ACTION_REQUIRED: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <AlertTriangle className="size-3" /> },
  STUCK: { classes: "bg-rose-50 text-rose-700 border-rose-200", icon: <XCircle className="size-3" /> },
  CLOSED: { classes: "bg-slate-100 text-slate-700 border-slate-200", icon: <ShieldCheck className="size-3" /> },

  // Referral Lifecycle Statuses
  DRAFT: { classes: "bg-slate-100 text-slate-600 border-slate-200", icon: <Circle className="size-3" /> },
  CREATED: { classes: "bg-blue-50 text-blue-700 border-blue-200", icon: <Circle className="size-3" /> },
  SENT: { classes: "bg-blue-50 text-blue-700 border-blue-200", icon: <Send className="size-3" /> },
  ACKNOWLEDGED: { classes: "bg-teal-50 text-teal-700 border-teal-200", icon: <CheckCircle2 className="size-3" /> },
  TRANSPORT_REQUESTED: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <Clock className="size-3" /> },
  TRANSPORT_ASSIGNED: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <Truck className="size-3" /> },
  IN_TRANSIT: { classes: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: <Truck className="size-3" /> },
  ARRIVED: { classes: "bg-teal-50 text-teal-700 border-teal-200", icon: <CheckCircle2 className="size-3" /> },
  UNDER_CARE: { classes: "bg-purple-50 text-purple-700 border-purple-200", icon: <HeartPulse className="size-3" /> },
  DISCHARGED: { classes: "bg-slate-100 text-slate-700 border-slate-200", icon: <CheckCircle2 className="size-3" /> },
  BACK_REFERRED: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <Clock className="size-3" /> },
  FOLLOW_UP_PENDING: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <UserCheck className="size-3" /> },
  FOLLOW_UP_CONFIRMED: { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="size-3" /> },
  CANCELLED: { classes: "bg-rose-50 text-rose-700 border-rose-200", icon: <XCircle className="size-3" /> },

  // Task & Benefit Statuses
  PENDING: { classes: "bg-slate-100 text-slate-600 border-slate-200", icon: <Clock className="size-3" /> },
  DUE: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <Clock className="size-3" /> },
  OVERDUE: { classes: "bg-rose-50 text-rose-700 border-rose-200", icon: <AlertTriangle className="size-3" /> },
  COMPLETED: { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="size-3" /> },
  COMPLETE: { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="size-3" /> },
  NEEDS_REVIEW: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <AlertTriangle className="size-3" /> },
  NOT_APPLICABLE: { classes: "bg-slate-50 text-slate-400 border-slate-200", icon: <Circle className="size-3" /> },
  POTENTIALLY_APPLICABLE: { classes: "bg-teal-50 text-teal-700 border-teal-200", icon: <CheckCircle2 className="size-3" /> },
  NOT_APPLICABLE_BENEFIT: { classes: "bg-slate-50 text-slate-400 border-slate-200", icon: <Circle className="size-3" /> },
  NEEDS_VERIFICATION: { classes: "bg-amber-50 text-amber-800 border-amber-200", icon: <AlertTriangle className="size-3" /> },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const style = STATUS_STYLES[status] ?? {
    classes: "bg-slate-100 text-slate-600 border-slate-200",
    icon: <Circle className="size-3" />,
  };
  const text = label ?? status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.classes}`}>
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
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[priority] ?? styles.ROUTINE}`}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

