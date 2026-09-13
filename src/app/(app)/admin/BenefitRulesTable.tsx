"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

interface Rule {
  id: string;
  name: string;
  state: string;
  status: string;
  sourceUrl: string;
  lastVerified: Date;
}

export function BenefitRulesTable({ rules: initialRules }: { rules: Rule[] }) {
  const [rules, setRules] = useState(initialRules);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  async function toggle(rule: Rule) {
    const nextStatus = rule.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setLoadingId(rule.id);
    try {
      await apiFetch(`/api/admin/benefit-rules/${rule.id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, status: nextStatus } : r)));
      showToast(`${rule.name} is now ${nextStatus.toLowerCase()}.`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update rule.", "error");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-slate-400">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Applies in</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Last verified</th>
            <th className="pb-2 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id} className="border-t border-slate-100">
              <td className="py-2">{rule.name}</td>
              <td className="py-2 text-slate-500">{rule.state}</td>
              <td className="py-2">
                <button
                  onClick={() => toggle(rule)}
                  disabled={loadingId === rule.id}
                  aria-label={`Toggle active status for ${rule.name}`}
                  className="hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <StatusBadge status={rule.status} />
                </button>
              </td>
              <td className="py-2 text-slate-500">{formatDate(rule.lastVerified)}</td>
              <td className="py-2">
                <a href={rule.sourceUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                  Source
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
