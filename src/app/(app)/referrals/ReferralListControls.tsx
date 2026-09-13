"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "delayed", label: "Delayed" },
  { key: "closed", label: "Closed" },
] as const;

export function ReferralListControls({ facilities }: { facilities: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const status = searchParams.get("filter") ?? "all";
  const priority = searchParams.get("priority") ?? "all";
  const facilityId = searchParams.get("facility") ?? "all";
  const sort = searchParams.get("sort") ?? "recent";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  // Debounce the search box so every keystroke doesn't trigger a navigation.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (query !== (searchParams.get("q") ?? "")) updateParam("q", query);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => updateParam("filter", f.key)}
            aria-pressed={status === f.key}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              status === f.key ? "border-brand bg-brand-soft text-brand-dark" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search referral ID, patient, facility..."
          aria-label="Search referrals"
          className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-brand"
        />
        <select
          value={priority}
          onChange={(e) => updateParam("priority", e.target.value)}
          aria-label="Filter by urgency"
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
        >
          <option value="all">All urgency</option>
          <option value="ROUTINE">Routine</option>
          <option value="URGENT">Urgent</option>
          <option value="EMERGENCY">Emergency</option>
        </select>
        <select
          value={facilityId}
          onChange={(e) => updateParam("facility", e.target.value)}
          aria-label="Filter by facility"
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
        >
          <option value="all">All facilities</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
          aria-label="Sort referrals"
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
        >
          <option value="recent">Sort: Recent activity</option>
          <option value="urgency">Sort: Urgency</option>
          <option value="status">Sort: Status</option>
        </select>
      </div>
    </div>
  );
}
