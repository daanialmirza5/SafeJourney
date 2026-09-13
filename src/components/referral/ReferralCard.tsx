import Link from "next/link";
import { ArrowRight, Truck, FileText, Clock, AlertTriangle } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { STATUS_LABELS } from "@/lib/referral/stateMachine";
import type { DecoratedReferral } from "@/lib/referral/queries";
import { formatDistanceToNow } from "date-fns";

export function ReferralCard({
  referral,
  currentFacilityId,
}: {
  referral: DecoratedReferral;
  currentFacilityId?: string | null;
}) {
  const isIncoming = currentFacilityId ? referral.receivingFacilityId === currentFacilityId : false;
  const isOutgoing = currentFacilityId ? referral.referringFacilityId === currentFacilityId : false;
  const isStuck = referral.operationalStatus === "STUCK";

  const timeAgo = formatDistanceToNow(new Date(referral.createdAt), { addSuffix: true });

  return (
    <Link
      href={`/referrals/${referral.id}`}
      className={`group relative flex flex-col gap-3.5 rounded-xl border bg-white p-4.5 transition-all hover:shadow-md ${
        isStuck
          ? "border-rose-300 bg-rose-50/20 hover:border-rose-400"
          : "border-border hover:border-brand-border"
      }`}
    >
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {referral.referralCode}
          </span>
          <PriorityBadge priority={referral.priority} />
          <StatusBadge status={referral.operationalStatus} />

          {/* Directional Tag */}
          {isIncoming && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
              Inbound to your facility
            </span>
          )}
          {isOutgoing && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
              Outbound
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Clock className="size-3" />
          <span>{timeAgo}</span>
        </div>
      </div>

      {/* Patient & Facility Journey */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand transition-colors">
          {referral.patient.pseudonym}
          {referral.patient?.familyCase?.newbornCase ? (
            <span className="ml-2 text-xs font-normal text-slate-500">(Includes Newborn Continuity)</span>
          ) : null}
        </h3>

        <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 flex-wrap">
          <span className="font-medium text-slate-700">{referral.referringFacility.name}</span>
          <ArrowRight className="size-3 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-700">{referral.receivingFacility.name}</span>
        </div>

        {/* Workflow Substatus */}
        <p className="mt-1 text-xs font-medium text-brand-dark">
          {STATUS_LABELS[referral.status as keyof typeof STATUS_LABELS] ?? referral.status}
        </p>
      </div>

      {/* Warning banner if stuck */}
      {isStuck && (
        <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-200">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span>Acknowledgment SLA breached. Immediate triage or reroute required.</span>
        </div>
      )}

      {/* Bottom Readiness & Document Counts */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          {referral.transportRequired && (
            <span className="flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
              <Truck className="size-3 shrink-0" /> Transport requested
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px]">
            <FileText className="size-3 text-slate-400" />
            <span>{referral.documents.length} document{referral.documents.length === 1 ? "" : "s"}</span>
          </span>
        </div>

        {/* Readiness Bar */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">Readiness:</span>
          <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                referral.administrativeReadiness === 100
                  ? "bg-emerald-500"
                  : referral.administrativeReadiness >= 50
                  ? "bg-amber-500"
                  : "bg-slate-300"
              }`}
              style={{ width: `${referral.administrativeReadiness}%` }}
            />
          </div>
          <span className="font-semibold text-slate-700 text-[11px]">{referral.administrativeReadiness}%</span>
        </div>
      </div>
    </Link>
  );
}
