import Link from "next/link";

export function StatCard({ label, value, href, tone = "default" }: { label: string; value: string | number; href?: string; tone?: "default" | "danger" | "warning" | "success" }) {
  const toneClasses: Record<string, string> = {
    default: "text-slate-900",
    danger: "text-rose-600",
    warning: "text-amber-600",
    success: "text-emerald-600",
  };
  const content = (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
