import Link from "next/link";
import {
  Plus,
  ClipboardList,
  AlertTriangle,
  ArrowUpRight,
  QrCode,
  CheckCircle2,
  Clock,
  UserCheck
} from "lucide-react";
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

  // Determine Doctor's immediate next priority prompt
  function getDoctorNextAction() {
    if (backReferred.length > 0) {
      return {
        title: "Action Required: Acknowledge Post-Discharge Handoffs",
        description: `You have ${backReferred.length} back-referral(s) waiting for acknowledgment and community health worker (ASHA) assignment.`,
        tone: "urgent" as const,
      };
    }
    if (stuck.length > 0) {
      return {
        title: "SLA Alert: Referral Rescue Recommended",
        description: `${stuck.length} referral(s) have exceeded the receiving facility acknowledgment window. Open to review rescue actions.`,
        tone: "warning" as const,
      };
    }
    if (awaitingAck.length > 0) {
      return {
        title: "Referrals Dispatched — Awaiting Acceptance",
        description: `${awaitingAck.length} outbound referral(s) are currently in receiving hospital intake queues. You will receive an in-app update upon triage acceptance.`,
        tone: "info" as const,
      };
    }
    return {
      title: "All Referral Journeys Up to Date",
      description: "Initiate a new maternal/newborn referral case or track in-progress patient transfers below.",
      tone: "normal" as const,
    };
  }

  const nextAction = getDoctorNextAction();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Clinician Referral Command Center"
        description="Initiate emergency and routine transfers, coordinate with receiving facilities, and track the closed-loop maternal journey."
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

      {/* Demo Tools Bar */}
      <DemoToolsPanel />

      {/* Clinician Guided "Your Next Action" Banner */}
      <div className={`rounded-xl border p-4 shadow-2xs ${
        nextAction.tone === "urgent"
          ? "border-amber-300 bg-amber-50/90 text-amber-950"
          : nextAction.tone === "warning"
          ? "border-rose-300 bg-rose-50/90 text-rose-950"
          : nextAction.tone === "info"
          ? "border-teal-200 bg-teal-50/80 text-teal-950"
          : "border-slate-200 bg-slate-50/70 text-slate-900"
      }`}>
        <div className="flex items-start gap-3">
          {nextAction.tone === "urgent" || nextAction.tone === "warning" ? (
            <AlertTriangle className={`size-5 shrink-0 mt-0.5 ${nextAction.tone === "urgent" ? "text-amber-600" : "text-rose-600"}`} />
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
                  Action Required
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold mt-0.5">{nextAction.title}</h3>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">{nextAction.description}</p>
          </div>
          <Link
            href="/referrals/new"
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:text-teal-950 underline shrink-0 mt-1"
          >
            Create Referral <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Active Referrals" value={active.length} />
        <StatCard label="Awaiting Triage" value={awaitingAck.length} tone={awaitingAck.length > 0 ? "warning" : "default"} />
        <StatCard label="In Transit" value={inTransit.length} />
        <StatCard label="Under Hospital Care" value={arrived.length} />
        <StatCard label="Handoffs to Assign" value={backReferred.length} tone={backReferred.length > 0 ? "danger" : "default"} />
        <StatCard label="Completed Closed" value={closed.length} tone="success" />
      </div>

      {/* Priority 1: Back-Referrals Requiring Doctor Acknowledgment */}
      {backReferred.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="size-4 text-amber-600" />
              <h2 className="text-sm font-bold text-amber-950">
                Back-Referrals Requiring Your Acknowledgment & ASHA Assignment ({backReferred.length})
              </h2>
            </div>
            <span className="text-[11px] font-medium text-amber-800">
              Discharged from hospital · Assign community worker to complete handoff
            </span>
          </div>
          <div className="space-y-2">
            {backReferred.map((r) => (
              <ReferralCard key={r.id} referral={r} currentFacilityId={user.facilityId} />
            ))}
          </div>
        </div>
      )}

      {/* Priority 2: Outgoing Referrals Awaiting Hospital Acceptance */}
      {awaitingAck.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Awaiting Receiving Hospital Acceptance ({awaitingAck.length})
            </h2>
            <span className="text-xs text-slate-500">Triage in progress at receiving facility</span>
          </div>
          <div className="space-y-3">
            {awaitingAck.map((r) => (
              <ReferralCard key={r.id} referral={r} currentFacilityId={user.facilityId} />
            ))}
          </div>
        </div>
      )}

      {/* Priority 3: All Active Outgoing Referrals */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">All Active Outgoing Referral Journeys</h2>
          <Link href="/referrals" className="text-xs font-semibold text-brand hover:underline">
            View full registry ({referrals.length}) →
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
            {referrals
              .filter((r) => !["CLOSED", "CANCELLED"].includes(r.status))
              .slice(0, 8)
              .map((r) => (
                <ReferralCard key={r.id} referral={r} currentFacilityId={user.facilityId} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
