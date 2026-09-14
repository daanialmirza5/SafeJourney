import Link from "next/link";

interface StatCardProps {
  label: string;
  value: string | number;
  href?: string;
  tone?: "default" | "danger" | "warning" | "success" | "brand";
  description?: string;
}

export function StatCard({ label, value, href, tone = "default", description }: StatCardProps) {
  const toneClasses: Record<string, { text: string; bg: string; border: string }> = {
    default: { text: "text-slate-900", bg: "bg-white", border: "border-border" },
    brand: { text: "text-brand-dark", bg: "bg-teal-50/40", border: "border-teal-100" },
    danger: { text: "text-rose-600", bg: "bg-rose-50/30", border: "border-rose-100" },
    warning: { text: "text-amber-700", bg: "bg-amber-50/30", border: "border-amber-100" },
    success: { text: "text-emerald-700", bg: "bg-emerald-50/30", border: "border-emerald-100" },
  };

  const currentTone = toneClasses[tone] ?? toneClasses.default;

  const content = (
    <div
      className={`rounded-xl border ${currentTone.border} ${currentTone.bg} p-4.5 shadow-2xs transition-all hover:shadow-xs hover:border-slate-300`}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${currentTone.text}`}>{value}</p>
      {description && <p className="mt-1 text-[11px] text-slate-400">{description}</p>}
    </div>
  );

  return href ? (
    <Link href={href} className="block group">
      {content}
    </Link>
  ) : (
    content
  );
}

