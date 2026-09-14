import Link from "next/link";
import {
  Inbox,
  AlertTriangle,
  QrCode,
  Plus,
  CheckCircle2,
  Clock
} from "lucide-react";
import { listReferralsForUser } from "@/lib/referral/queries";
import { StatCard } from "@/components/ui/StatCard";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { EmptyState, PageHeader } from "@/components/ui/EmptyState";
import { DemoToolsPanel } from "@/components/dashboards/DemoToolsPanel";
import type { User } from "@prisma/client";

export async function CoordinatorDashboard({ user }: { user: User }) {
  const referrals = await listReferralsForUser(user);
  const incoming = referrals.filter((r) => r.status === "SENT" && r.receivingFacilityId === user.facilityId);
  const awaitingTransport = referrals.filter((r) => r.status === "ACKNOWLEDGED" && r.transportRequired);
  const inTransit = referrals.filter((r) => r.status === "IN_TRANSIT");
  const arrived = referrals.filter((r) => ["ARRIVED", "UNDER_CARE"].includes(r.status));
  const discharged = referrals.filter((r) => ["DISCHARGED", "BACK_REFERRED"].includes(r.status));
  const stuck = referrals.filter((r) => r.operationalStatus === "STUCK");

  // Determine Coordinator's next action guidance
  function getCoordinatorNextAction() {
    if (incoming.length > 0) {
      return {
        title: `Action Required: Triage & Accept Inbound Referrals (${incoming.length})`,
        description: `${incoming.length} referring clinician(s) are awaiting bed/intake confirmation. Open the referral to accept or request clarification.`,
        tone: "urgent" as const,
      };
    }
    if (awaitingTransport.length > 0) {
      return {
        title: "Action Required: Assign Emergency Transport",
        description: `${awaitingTransport.length} accepted referral(s) require ambulance dispatch. Assign a vehicle and driver to start pickup.`,
        tone: "urgent" as const,
      };
    }
    if (inTransit.length > 0) {
      return {
        title: "Patient In Transit — Prepare Intake Bay",
        description: `${inTransit.length} patient(s) are currently on the road toward your facility. Confirm arrival once the vehicle arrives.`,
        tone: "info" as const,
      };
    }
    return {
      title: "Intake Queue Up to Date",
      description: "All inbound transfers have been acknowledged. Monitor active inpatient cases and scan incoming Referral Passports below.",
      tone: "normal" as const,
    };
  }

  const nextAction = getCoordinatorNextAction();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Intake & Hospital Coordination Command Center"
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

      {/* Guided Coordinator "Your Next Action" Banner */}
      <div className={`rounded-xl border p-4 shadow-2xs ${
        nextAction.tone === "urgent"
          ? "border-amber-300 bg-amber-50/90 text-amber-950"
          : nextAction.tone === "info"
          ? "border-teal-200 bg-teal-50/80 text-teal-950"
          : "border-slate-200 bg-slate-50/70 text-slate-900"
      }`}>
        <div className="flex items-start gap-3">
          {nextAction.tone === "urgent" ? (
            <AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-600" />
          ) : nextAction.tone === "info" ? (
            <Clock className="size-5 shrink-0 mt-0.5 text-teal-600" />
          ) : (
            <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-emerald-600" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider">Your Next Action</span>
              {nextAction.tone === "urgent" && (
                <span className="rounded bg-amber-200 px-1.5 py-0.2 text-[10px] font-bold text-amber-900 animate-pulse">
                  Triage Required
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold mt-0.5">{nextAction.title}</h3>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">{nextAction.description}</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Awaiting Triage" value={incoming.length} tone={incoming.length > 0 ? "warning" : "default"} />
        <StatCard label="Awaiting Transport" value={awaitingTransport.length} tone={awaitingTransport.length > 0 ? "warning" : "default"} />
        <StatCard label="In Transit" value={inTransit.length} />
        <StatCard label="Under Care" value={arrived.length} />
        <StatCard label="Discharged / Handoff" value={discharged.length} />
        <StatCard label="Stuck / SLA Alert" value={stuck.length} tone={stuck.length > 0 ? "danger" : "default"} />
      </div>

      {/* Priority 1: Inbound Referrals Requiring Immediate Action */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="size-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Inbound Referrals Requiring Immediate Action ({incoming.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">Referring facilities awaiting triage confirmation</span>
        </div>

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

      {/* Priority 2: Active Hospitalized & Transport Cases */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Active Hospitalized & Transport Cases</h2>
          <Link href="/referrals" className="text-xs font-semibold text-brand hover:underline">
            View full registry →
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
