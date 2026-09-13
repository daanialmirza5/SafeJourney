import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listReferralsForUser } from "@/lib/referral/queries";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { EmptyState, PageHeader } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { filterReferrals, sortReferrals, summarizeReferralCounts, type ReferralSortKey, type ReferralStatusFilter } from "@/lib/referral/listView";
import { ReferralListControls } from "./ReferralListControls";

const PAGE_SIZE = 20;

export default async function ReferralsListPage({
  searchParams,
}: {
  searchParams: { filter?: string; priority?: string; facility?: string; q?: string; sort?: string; page?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const referrals = await listReferralsForUser(user);

  const counts = summarizeReferralCounts(referrals);

  const facilities = Array.from(
    new Map(
      referrals.flatMap((r) => [
        [r.referringFacility.id, r.referringFacility.name] as const,
        [r.receivingFacility.id, r.receivingFacility.name] as const,
      ])
    ).entries()
  )
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const status = (searchParams.filter as ReferralStatusFilter) ?? "all";
  const filtered = filterReferrals(referrals, {
    status,
    priority: searchParams.priority,
    facilityId: searchParams.facility,
    query: searchParams.q,
  });
  const sorted = sortReferrals(filtered, (searchParams.sort as ReferralSortKey) ?? "recent");

  const page = Math.max(1, Number(searchParams.page) || 1);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (searchParams.filter) params.set("filter", searchParams.filter);
    if (searchParams.priority) params.set("priority", searchParams.priority);
    if (searchParams.facility) params.set("facility", searchParams.facility);
    if (searchParams.q) params.set("q", searchParams.q);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/referrals?${qs}` : "/referrals";
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Referrals" description={`${referrals.length} total referral case(s) in your scope.`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total" value={counts.total} href="/referrals" />
        <StatCard label="Pending" value={counts.pending} href="/referrals?filter=active" />
        <StatCard label="Acknowledged" value={counts.acknowledged} href="/referrals?filter=active" />
        <StatCard label="Delayed" value={counts.delayed} href="/referrals?filter=delayed" tone={counts.delayed > 0 ? "danger" : "default"} />
        <StatCard label="Completed" value={counts.completed} href="/referrals?filter=closed" tone="success" />
        <StatCard label="Rescued" value={counts.rescued} tone={counts.rescued > 0 ? "warning" : "default"} />
      </div>

      <ReferralListControls facilities={facilities} />

      {sorted.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-8" />} title="No referrals match this filter" />
      ) : (
        <>
          <div className="space-y-3">
            {paged.map((r) => (
              <ReferralCard key={r.id} referral={r} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {page} of {totalPages} ({sorted.length} matching)
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={pageHref(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50">
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={pageHref(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50">
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
