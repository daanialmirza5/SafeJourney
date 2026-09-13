import Link from "next/link";
import { Plus, ClipboardList, AlertTriangle, ArrowUpRight, QrCode } from "lucide-react";
import { listReferralsForUser } from "@/lib/referral/queries";
import { StatCard } from "@/components/ui/StatCard";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { EmptyState, PageHeader } from "@/components/ui/EmptyState";
import { DemoToolsPanel } from "@/components/dashboards/DemoToolsPanel";
import type { User } from "@prisma/client";

export async function DoctorDashboard({ user }: { user: User }) {
  const referrals = await listReferralsForUser(user);
  const active = referrals.filter((r) => !["CLOSED", "CANCELLED"].includes(r.status));
  const stuck = referrals.filter((r) => r.operationalStatus === "STUCK");
  const awaitingAck = referrals.filter((r) => r.status === "SENT");
  const inTransit = referrals.filter((r) => r.status === "IN_TRANSIT");
  const arrived = referrals.filter((r) => ["ARRIVED", "UNDER_CARE"].includes(r.status));
  const backReferred = referrals.filter((r) => r.status === "BACK_REFERRED");
  const closed = referrals.filter((r) => r.status === "CLOSED");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Clinical & Referral Command Center"
        description="Initiate emergency and routine referrals, coordinate transport handoffs, and track closed-loop continuity."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/scan"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <QrCode className="size-3.5 text-slate-500" />
              Scan / Lookup
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

      {/* Demo Tools Bar */}
      <DemoToolsPanel />

      {/* SLA Rescue Warning if any referrals are stuck */}
      {stuck.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-rose-900">
                {stuck.length} Referral{stuck.length === 1 ? "" : "s"} Require Immediate Action
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                Receiving facility acknowledgment SLA has elapsed. Open the referral to trigger rescue actions or reroute.
              </p>
            </div>
            <Link
              href="/referrals"
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 underline"
            >
              View All <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Active Referrals" value={active.length} />
        <StatCard label="Stuck / SLA Alert" value={stuck.length} tone={stuck.length > 0 ? "danger" : "default"} />
        <StatCard label="Awaiting Acknowledgment" value={awaitingAck.length} tone={awaitingAck.length > 0 ? "warning" : "default"} />
        <StatCard label="In Transit" value={inTransit.length} />
        <StatCard label="Inpatient Care" value={arrived.length} />
        <StatCard label="Confirmed Closed" value={closed.length} tone="success" />
      </div>

      {/* Back-Referral Action Queue if any */}
      {backReferred.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-blue-900 mb-2">
            Back-Referrals Awaiting Your Acknowledgment ({backReferred.length})
          </h3>
          <div className="space-y-2">
            {backReferred.map((r) => (
              <ReferralCard key={r.id} referral={r} currentFacilityId={user.facilityId} />
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Referral List */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Active Outgoing Referrals</h2>
          <Link href="/referrals" className="text-xs font-semibold text-brand hover:underline">
            View full registry →
          </Link>
        </div>

        {referrals.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-8 text-slate-400" />}
            title="No referrals found"
            description="Initiate your first referral case to track the closed-loop maternal journey."
            action={
              <Link href="/referrals/new" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white">
                <Plus className="size-3.5" /> Create Referral
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {referrals.slice(0, 10).map((r) => (
              <ReferralCard key={r.id} referral={r} currentFacilityId={user.facilityId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
