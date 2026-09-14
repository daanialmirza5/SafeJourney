import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { computeAnalytics } from "@/lib/analytics/computeAnalytics";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { EmptyState, PageHeader } from "@/components/ui/EmptyState";
import { FunnelChart } from "./AnalyticsCharts";
import { DateRangeFilter } from "./DateRangeFilter";
import { formatDuration } from "@/lib/format";
import type { RoleName } from "@/lib/types/enums";

// Operational tooling for the roles that coordinate referrals day to day --
// not shown in PATIENT/CAREGIVER/FOLLOWUP nav, and redirected here too, so
// a direct URL visit doesn't land someone on a page built for a different
// audience (referralScopeFor already scopes every query per-role, so this
// is about relevance, not a data-leak fix).
const ANALYTICS_ROLES: RoleName[] = ["DOCTOR", "COORDINATOR", "ADMIN"];

export default async function AnalyticsPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!ANALYTICS_ROLES.includes(user.role as RoleName)) redirect("/dashboard");

  const from = searchParams.from ? new Date(searchParams.from) : undefined;
  // Include the entire "to" day, not just its midnight instant.
  const to = searchParams.to ? new Date(new Date(searchParams.to).getTime() + 24 * 60 * 60 * 1000 - 1) : undefined;
  const data = await computeAnalytics(user, { from, to });

  if (data.totalInitiated === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" description="Operational KPIs and closed-loop coordination metrics across facilities." />
        <DateRangeFilter from={searchParams.from} to={searchParams.to} />
        <EmptyState
          icon={<BarChart3 className="size-8" />}
          title={searchParams.from || searchParams.to ? "No referrals in this date range" : "No referrals in scope yet"}
          description="KPIs will appear here once referrals are initiated and processed across your network."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Operational KPIs and closed-loop coordination metrics across facilities." />
      <DateRangeFilter from={searchParams.from} to={searchParams.to} />

      <Card className="border-brand">
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Primary KPI</p>
            <p className="mt-1 text-sm text-slate-600">Closed-Loop Referral Rate</p>
          </div>
          <p className="text-4xl font-semibold text-slate-900">{data.closedLoopReferralRate}%</p>
          <p className="text-xs text-slate-400">{data.closed} of {data.totalInitiated} initiated referrals reached confirmed closure</p>
        </CardBody>
      </Card>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Case volume</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total" value={data.totalInitiated} />
          <StatCard label="Pending" value={data.pending} />
          <StatCard label="Acknowledged" value={data.acknowledged} />
          <StatCard label="Transport pending" value={data.transportPendingCount} />
          <StatCard label="Stuck now" value={data.stuckCount} tone={data.stuckCount > 0 ? "danger" : "default"} />
          <StatCard label="Rescued" value={data.rescued} tone={data.rescued > 0 ? "warning" : "default"} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Administrative continuity</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Avg. handoff time" value={`${data.averageHandoffMinutes}m`} />
          <StatCard label="Admin completeness" value={`${data.averageAdminCompleteness}%`} />
          <StatCard label="Benefit checklist" value={`${data.benefitChecklistCompletion}%`} />
          <StatCard label="Document completeness" value={`${data.documentCompleteness}%`} />
          <StatCard label="Back-referral completion" value={`${data.backReferralCompletionRate}%`} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Follow-up &amp; newborn continuity</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Maternal follow-up" value={`${data.maternalFollowUpCompletionRate}%`} />
          <StatCard label="Newborn milestones" value={`${data.newbornFollowUpCompletionRate}%`} />
          <StatCard label="Overdue follow-ups" value={data.overdueFollowUpCount} tone={data.overdueFollowUpCount > 0 ? "danger" : "default"} />
        </div>
      </div>

      <Card>
        <CardHeader title="Referral funnel" subtitle="How many referrals have reached each stage of the journey" />
        <CardBody>
          <FunnelChart funnel={data.funnel} />
        </CardBody>
      </Card>

      {data.stuckCount > 0 && (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">
              Average time waiting for currently stuck referrals: <span className="font-semibold text-rose-600">{formatDuration(data.averageStuckMinutes)}</span>
            </p>
          </CardBody>
        </Card>
      )}

      <p className="text-xs text-slate-400">
        All figures are computed from synthetic demo data and reset whenever demo data is regenerated. They are not real-world outcomes.
      </p>
    </div>
  );
}
