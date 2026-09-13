import { Inbox } from "lucide-react";
import { listReferralsForUser } from "@/lib/referral/queries";
import { StatCard } from "@/components/ui/StatCard";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { EmptyState, PageHeader } from "@/components/ui/EmptyState";
import type { User } from "@prisma/client";

export async function CoordinatorDashboard({ user }: { user: User }) {
  const referrals = await listReferralsForUser(user);
  const incoming = referrals.filter((r) => r.status === "SENT" && r.receivingFacilityId === user.facilityId);
  const accepted = referrals.filter((r) => ["ACKNOWLEDGED", "TRANSPORT_REQUESTED", "TRANSPORT_ASSIGNED"].includes(r.status));
  const inTransit = referrals.filter((r) => r.status === "IN_TRANSIT");
  const arrived = referrals.filter((r) => ["ARRIVED", "UNDER_CARE"].includes(r.status));
  const discharged = referrals.filter((r) => ["DISCHARGED", "BACK_REFERRED"].includes(r.status));
  const needsClarification = referrals.filter((r) => r.adminTasks.some((t) => t.category === "clarification" && t.status === "NEEDS_REVIEW"));
  const stuck = referrals.filter((r) => r.operationalStatus === "STUCK");

  return (
    <div className="space-y-6">
      <PageHeader title="Coordinator dashboard" description="Review incoming referrals and keep every case moving." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Incoming" value={incoming.length} tone={incoming.length > 0 ? "warning" : "default"} />
        <StatCard label="Accepted" value={accepted.length} />
        <StatCard label="In transit" value={inTransit.length} />
        <StatCard label="Arrived" value={arrived.length} />
        <StatCard label="Discharged" value={discharged.length} />
        <StatCard label="Needs clarification" value={needsClarification.length} tone="warning" />
        <StatCard label="Stuck" value={stuck.length} tone={stuck.length > 0 ? "danger" : "default"} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Incoming referrals awaiting your response</h2>
        {incoming.length === 0 ? (
          <EmptyState icon={<Inbox className="size-8" />} title="No incoming referrals" description="New referrals sent to your facility will appear here." />
        ) : (
          <div className="space-y-3">
            {incoming.map((r) => (
              <ReferralCard key={r.id} referral={r} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">All active cases</h2>
        {referrals.filter((r) => !["CLOSED", "CANCELLED"].includes(r.status)).length === 0 ? (
          <EmptyState title="No active cases" description="Cases you accept will show up here through discharge and follow-up." />
        ) : (
          <div className="space-y-3">
            {referrals
              .filter((r) => !["CLOSED", "CANCELLED"].includes(r.status))
              .slice(0, 20)
              .map((r) => (
                <ReferralCard key={r.id} referral={r} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
