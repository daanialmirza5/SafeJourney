"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";

interface FacilityRow {
  id: string;
  name: string;
  type: string;
  district: string;
  state: string;
  deactivatedAt: string | null;
}

export function FacilitiesTable({ facilities: initial }: { facilities: FacilityRow[] }) {
  const [facilities, setFacilities] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("BOTH");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function toggle(facility: FacilityRow) {
    const action = facility.deactivatedAt ? "reactivate" : "deactivate";
    if (action === "deactivate" && !confirm(`Deactivate ${facility.name}? It will no longer appear when creating new referrals.`)) return;
    setLoadingId(facility.id);
    try {
      const data = await apiFetch<{ facility: { deactivatedAt: string | null } }>(`/api/admin/facilities/${facility.id}/${action}`, {
        method: "POST",
      });
      setFacilities((prev) => prev.map((f) => (f.id === facility.id ? { ...f, deactivatedAt: data.facility.deactivatedAt } : f)));
      showToast(action === "deactivate" ? `${facility.name} deactivated.` : `${facility.name} reactivated.`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.", "error");
    } finally {
      setLoadingId(null);
    }
  }

  async function createFacility() {
    setCreating(true);
    try {
      const data = await apiFetch<{ facility: FacilityRow }>("/api/admin/facilities", {
        method: "POST",
        body: JSON.stringify({ name, type, district, state }),
      });
      setFacilities((prev) => [...prev, data.facility].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setDistrict("");
      setState("");
      setShowAdd(false);
      showToast("Facility created.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create facility.", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="secondary" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="size-3.5" /> Add facility
        </Button>
      </div>
      {showAdd && (
        <div className="mb-4 space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Facility name" required>
              {(id) => (
                <input
                  id={id}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Metro Maternal Hospital"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              )}
            </Field>
            <Field label="Type">
              {(id) => (
                <select id={id} value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm">
                  <option value="REFERRING">Referring</option>
                  <option value="RECEIVING">Receiving</option>
                  <option value="BOTH">Both</option>
                </select>
              )}
            </Field>
            <Field label="District" required>
              {(id) => (
                <input
                  id={id}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Pune"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              )}
            </Field>
            <Field label="State" required>
              {(id) => (
                <input
                  id={id}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Maharashtra"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              )}
            </Field>
          </div>
          <Button size="sm" loading={creating} disabled={!name || !district || !state} onClick={createFacility}>
            Create
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-400">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">District</th>
              <th className="pb-2 font-medium">State</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {facilities.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="py-1.5">{f.name}</td>
                <td className="py-1.5 text-slate-500">{f.type}</td>
                <td className="py-1.5 text-slate-500">{f.district}</td>
                <td className="py-1.5 text-slate-500">{f.state}</td>
                <td className="py-1.5">
                  <StatusBadge status={f.deactivatedAt ? "CANCELLED" : "COMPLETE"} label={f.deactivatedAt ? "Deactivated" : "Active"} />
                </td>
                <td className="py-1.5 text-right">
                  <Button size="sm" variant={f.deactivatedAt ? "secondary" : "ghost"} loading={loadingId === f.id} onClick={() => toggle(f)}>
                    {f.deactivatedAt ? "Reactivate" : "Deactivate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
