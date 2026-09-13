import Link from "next/link";
import { ArrowRight, Truck, FileText } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { STATUS_LABELS } from "@/lib/referral/stateMachine";
import type { DecoratedReferral } from "@/lib/referral/queries";

export function ReferralCard({ referral }: { referral: DecoratedReferral }) {
  return (
    <Link
      href={`/referrals/${referral.id}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-slate-900">{referral.referralCode}</span>
          <PriorityBadge priority={referral.priority} />
          <StatusBadge status={referral.operationalStatus} />
        </div>
        <p className="mt-1 truncate text-sm text-slate-600">
          {referral.patient.pseudonym} · {referral.referringFacility.name} <ArrowRight className="mx-1 inline size-3" /> {referral.receivingFacility.name}
        </p>
        <p className="mt-1 text-xs text-slate-400">{STATUS_LABELS[referral.status as keyof typeof STATUS_LABELS] ?? referral.status}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-xs text-slate-500">
        {referral.transportRequired && (
          <span className="flex items-center gap-1">
            <Truck className="size-3.5" /> Transport
          </span>
        )}
        <span className="flex items-center gap-1">
          <FileText className="size-3.5" /> {referral.documents.length} docs
        </span>
        <span className="font-medium text-slate-700">{referral.administrativeReadiness}% ready</span>
      </div>
    </Link>
  );
}
