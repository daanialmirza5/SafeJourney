import Link from "next/link";
import { Inbox, AlertTriangle, QrCode, Plus } from "lucide-react";
import { listReferralsForUser } from "@/lib/referral/queries";
import { StatCard } from "@/components/ui/StatCard";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { EmptyState, PageHeader } from "@/components/ui/EmptyState";
import { DemoToolsPanel } from "@/components/dashboards/DemoToolsPanel";
import type { User } from "@prisma/client";

export async function CoordinatorDashboard({ user }: { user: User }) {
  const referrals = await listReferralsForUser(user);
  const incoming = referrals.filter((r) => r.status === "SENT" && r.receivingFacilityId === user.facilityId);
  const accepted = referrals.filter((r) => ["ACKNOWLEDGED", "TRANSPORT_REQUESTED", "TRANSPORT_ASSIGNED"].includes(r.status));
  const inTransit = referrals.filter((r) => r.status === "IN_TRANSIT");
  const arrived = referrals.filter((r) => ["ARRIVED", "UNDER_CARE"].includes(r.status));
  const discharged = referrals.filter((r) => ["DISCHARGED", "BACK_REFERRED"].includes(r.status));
  const stuck = referrals.filter((r) => r.operationalStatus === "STUCK");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intake & Coordination Command Center"
        description="Review inbound referrals, allocate emergency transport, confirm arrivals, and manage discharge handoffs."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/scan"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <QrCode className="size-3.5 text-slate-500" />
              Scan Passport
            </Link>
            <Link
              href="/referrals/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-dark transition-colors"
            >
              <Plus className="size-4" />
              New Referral
            </Link>
          </div>
        }
      />

      <DemoToolsPanel />

      {/* Immediate Triage Required Banner */}
      {incoming.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900">
                {incoming.length} Inbound Referral{incoming.length === 1 ? "" : "s"} Awaiting Your Acknowledgment
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Referring facilities are waiting for acceptance and bed/transport confirmation. Triage promptly to avoid SLA escalation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Awaiting Triage" value={incoming.length} tone={incoming.length > 0 ? "warning" : "default"} />
        <StatCard label="Stuck / SLA Alert" value={stuck.length} tone={stuck.length > 0 ? "danger" : "default"} />
        <StatCard label="Accepted / Prep" value={accepted.length} />
        <StatCard label="In Transit" value={inTransit.length} />
        <StatCard label="Inpatient Care" value={arrived.length} />
        <StatCard label="Discharged / Return" value={discharged.length} />
      </div>

      {/* Priority Section: Incoming Awaiting Action */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-900">
          Inbound Referrals Requiring Immediate Action ({incoming.length})
        </h2>
        {incoming.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
            No pending incoming referrals right now. All inbound transfers have been acknowledged.
          </div>
        ) : (
          <div className="space-y-3">
            {incoming.map((r) => (
              <ReferralCard key={r.id} referral={r} currentFacilityId={user.facilityId} />
            ))}
          </div>
        )}
      </div>

      {/* Section: Active In-Transit & Hospitalized Cases */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Active Hospitalized & Transport Cases</h2>
          <Link href="/referrals" className="text-xs font-semibold text-brand hover:underline">
            View full list →
          </Link>
        </div>

        {referrals.filter((r) => !["CLOSED", "CANCELLED"].includes(r.status)).length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-8 text-slate-400" />}
            title="No active cases"
            description="Referrals received and accepted by your facility will appear here."
          />
        ) : (
          <div className="space-y-3">
            {referrals
              .filter((r) => !["CLOSED", "CANCELLED"].includes(r.status) && r.status !== "SENT")
              .slice(0, 10)
              .map((r) => (
                <ReferralCard key={r.id} referral={r} currentFacilityId={user.facilityId} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
