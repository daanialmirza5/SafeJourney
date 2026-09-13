import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
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
  const pendingAdmin = referrals.filter((r) => r.administrativeReadiness < 100 && !["CLOSED", "CANCELLED"].includes(r.status));
  const closed = referrals.filter((r) => r.status === "CLOSED");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor dashboard"
        description="Create referrals and track them through to closure."
        action={
          <Link href="/referrals/new" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            <Plus className="size-4" /> Create Referral
          </Link>
        }
      />

      <DemoToolsPanel />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Active" value={active.length} />
        <StatCard label="Stuck" value={stuck.length} tone={stuck.length > 0 ? "danger" : "default"} />
        <StatCard label="Awaiting ack." value={awaitingAck.length} tone="warning" />
        <StatCard label="In transit" value={inTransit.length} />
        <StatCard label="Arrived" value={arrived.length} />
        <StatCard label="Admin pending" value={pendingAdmin.length} tone="warning" />
        <StatCard label="Closed" value={closed.length} tone="success" />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Your referrals</h2>
        {referrals.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-8" />}
            title="No referrals yet"
            description="Create your first referral to start a closed-loop journey."
          />
        ) : (
          <div className="space-y-3">
            {referrals.slice(0, 20).map((r) => (
              <ReferralCard key={r.id} referral={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
