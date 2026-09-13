import Link from "next/link";
import { Shield } from "lucide-react";
import { db } from "@/lib/db";
import { listReferralsForUser } from "@/lib/referral/queries";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/EmptyState";
import { DemoToolsPanel } from "@/components/dashboards/DemoToolsPanel";
import type { User } from "@prisma/client";

export async function AdminDashboard({ user }: { user: User }) {
  const referrals = await listReferralsForUser(user);
  const closed = referrals.filter((r) => r.status === "CLOSED").length;
  const stuck = referrals.filter((r) => r.operationalStatus === "STUCK").length;
  const closedLoopRate = referrals.length > 0 ? Math.round((closed / referrals.length) * 100) : 0;
  const usersCount = await db.user.count();
  const facilitiesCount = await db.facility.count();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        description="System-wide oversight, configuration and demo tooling."
        action={
          <Link href="/admin" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            <Shield className="size-4" /> Open Admin Panel
          </Link>
        }
      />

      <DemoToolsPanel showReset />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Users" value={usersCount} href="/admin" />
        <StatCard label="Facilities" value={facilitiesCount} href="/admin" />
        <StatCard label="Total referrals" value={referrals.length} href="/referrals" />
        <StatCard label="Closed-loop rate" value={`${closedLoopRate}%`} tone="success" href="/analytics" />
        <StatCard label="Stuck now" value={stuck} tone={stuck > 0 ? "danger" : "default"} href="/referrals?filter=stuck" />
        <StatCard label="Closed" value={closed} href="/referrals?filter=closed" />
      </div>
    </div>
  );
}
