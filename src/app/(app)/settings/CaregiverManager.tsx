"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

interface CaregiverAccess {
  id: string;
  permission: string;
  user: { name: string; email: string };
}

export function CaregiverManager({ patientId, initialCaregivers }: { patientId: string; initialCaregivers: CaregiverAccess[] }) {
  const [caregivers, setCaregivers] = useState(initialCaregivers);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [permission, setPermission] = useState("VIEW_ONLY");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function addCaregiver() {
    setLoading(true);
    try {
      const data = await apiFetch<{ access: CaregiverAccess }>(`/api/patients/${patientId}/caregivers`, {
        method: "POST",
        body: JSON.stringify({ email, name, permission }),
      });
      setCaregivers((prev) => [...prev, { ...data.access, user: { name, email } }]);
      setEmail("");
      setName("");
      showToast("Caregiver added.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add caregiver.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this caregiver's access?")) return;
    try {
      await apiFetch(`/api/caregivers/${id}`, { method: "DELETE" });
      setCaregivers((prev) => prev.filter((c) => c.id !== id));
      showToast("Caregiver access revoked.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to revoke access.", "error");
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {caregivers.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 text-sm">
            <div>
              <p className="font-medium text-slate-800">{c.user.name}</p>
              <p className="text-xs text-slate-400">
                {c.user.email} · {c.permission.replace(/_/g, " ").toLowerCase()}
              </p>
            </div>
            <button onClick={() => revoke(c.id)} className="text-slate-400 hover:text-rose-600" aria-label="Revoke access">
              <X className="size-4" />
            </button>
          </li>
        ))}
        {caregivers.length === 0 && <p className="text-xs text-slate-400">No caregivers added yet.</p>}
      </ul>

      <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
        <p className="text-xs font-medium text-slate-600">Add a caregiver</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Name" required>
            {(id) => (
              <input
                id={id}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
              />
            )}
          </Field>
          <Field label="Email" required>
            {(id) => (
              <input
                id={id}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
              />
            )}
          </Field>
          <Field label="Access level">
            {(id) => (
              <select
                id={id}
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
              >
                <option value="VIEW_ONLY">View only</option>
                <option value="DOCUMENT_HELP">Document help</option>
                <option value="FULL_ADMINISTRATIVE_ASSISTANCE">Full administrative assistance</option>
              </select>
            )}
          </Field>
        </div>
        <Button size="sm" loading={loading} disabled={!email || !name} onClick={addCaregiver}>
          <UserPlus className="size-3.5" /> Add caregiver
        </Button>
      </div>
    </div>
  );
}
