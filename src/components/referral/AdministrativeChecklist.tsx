import { StatusBadge } from "@/components/ui/Badge";
import type { DecoratedReferral } from "@/lib/referral/queries";

export function AdministrativeChecklist({ referral }: { referral: DecoratedReferral }) {
  const applicable = referral.adminTasks.filter((t) => t.status !== "NOT_APPLICABLE");
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Administrative readiness</p>
        <p className="text-sm font-semibold text-slate-900">{referral.administrativeReadiness}%</p>
      </div>
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${referral.administrativeReadiness === 100 ? "bg-emerald-500" : "bg-brand"}`}
          style={{ width: `${referral.administrativeReadiness}%` }}
        />
      </div>
      <ul className="space-y-2">
        {referral.adminTasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between gap-2 text-sm">
            <span className={task.status === "NOT_APPLICABLE" ? "text-slate-300 line-through" : "text-slate-700"}>{task.title}</span>
            <StatusBadge status={task.status} />
          </li>
        ))}
      </ul>
      {applicable.length === 0 && <p className="text-xs text-slate-400">No administrative tasks applicable.</p>}
    </div>
  );
}
