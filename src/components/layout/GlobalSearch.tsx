"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";

interface SearchResult {
  id: string;
  referralCode: string;
  status: string;
  patientPseudonym: string;
  referringFacility: string;
  receivingFacility: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const data = await apiFetch<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(data.results);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft">
        <Search className="size-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Search referral ID, patient, facility..."
          aria-label="Search referrals"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="global-search-results"
          aria-autocomplete="list"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search">
            <X className="size-3.5 text-slate-400" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div id="global-search-results" role="listbox" className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((r) => (
            <button
              key={r.id}
              role="option"
              aria-selected={false}
              onClick={() => {
                router.push(`/referrals/${r.id}`);
                setOpen(false);
                setQuery("");
              }}
              className="block w-full border-b border-slate-100 px-4 py-2.5 text-left text-sm last:border-0 hover:bg-slate-50"
            >
              <div className="font-medium text-slate-800">{r.referralCode}</div>
              <div className="text-xs text-slate-500">
                {r.patientPseudonym} · {r.referringFacility} → {r.receivingFacility}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
