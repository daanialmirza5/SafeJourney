"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Filters analytics to referrals created within a date range, synced to
 * the URL (bookmarkable/shareable, and keeps the page a server component).
 * Clearing either date removes it from the URL rather than sending an
 * empty string, so "no filter" and "filtered from the beginning of time"
 * stay distinguishable. */
export function DateRangeFilter({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <label htmlFor="analytics-from" className="font-medium">
        From
      </label>
      <input
        id="analytics-from"
        type="date"
        value={from ?? ""}
        onChange={(e) => update("from", e.target.value)}
        className="rounded-lg border border-slate-200 px-2 py-1.5"
      />
      <label htmlFor="analytics-to" className="font-medium">
        To
      </label>
      <input
        id="analytics-to"
        type="date"
        value={to ?? ""}
        onChange={(e) => update("to", e.target.value)}
        className="rounded-lg border border-slate-200 px-2 py-1.5"
      />
      {(from || to) && (
        <button onClick={() => router.push(pathname)} className="text-brand hover:underline">
          Clear
        </button>
      )}
    </div>
  );
}
