"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { CONFIGURABLE_MILESTONE_CATEGORIES, FOLLOW_UP_TASK_CATEGORY_LABELS } from "@/lib/referral/newbornContinuity";

interface MilestoneTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  offsetDays: number;
  active: boolean;
}

/** Admin configuration for the newborn continuity milestone schedule
 * (spec section 30). This table is the source of truth every future
 * back-referral reads -- there's no hard-coded fallback once the app has
 * been seeded, unlike NotificationTemplate. Purely a coordination
 * schedule: WHEN a follow-up worker should check in, never a clinical
 * instruction. */
export function MilestoneTemplatesTable({ templates: initial }: { templates: MilestoneTemplate[] }) {
  const [templates, setTemplates] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState<string>(CONFIGURABLE_MILESTONE_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [offsetDays, setOffsetDays] = useState("30");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  async function toggleActive(t: MilestoneTemplate) {
    setLoadingId(t.id);
    try {
      const data = await apiFetch<{ template: MilestoneTemplate }>(`/api/admin/milestone-templates/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !t.active }),
      });
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? data.template : x)));
      showToast(data.template.active ? `${t.title} activated.` : `${t.title} deactivated.`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update milestone.", "error");
    } finally {
      setLoadingId(null);
    }
  }

  async function createTemplate() {
    setCreating(true);
    setFormError(null);
    try {
      const data = await apiFetch<{ template: MilestoneTemplate }>("/api/admin/milestone-templates", {
        method: "POST",
        body: JSON.stringify({ category, title, description, offsetDays: Number(offsetDays) }),
      });
      setTemplates((prev) => [...prev, data.template].sort((a, b) => a.offsetDays - b.offsetDays));
      setTitle("");
      setDescription("");
      setOffsetDays("30");
      setShowAdd(false);
      showToast("Milestone added to the newborn continuity schedule.");
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create milestone.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        This is a coordination and reminder schedule for community follow-up workers -- it tells them when to check
        in with a family, never what clinical care to give. Deactivating a milestone stops it from being scheduled on
        future referrals; it does not affect follow-up tasks already created.
      </p>
      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="secondary" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="size-3.5" /> Add milestone
        </Button>
      </div>
      {showAdd && (
        <div className="mb-4 space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Category" required>
              {(id) => (
                <select id={id} value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm">
                  {CONFIGURABLE_MILESTONE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {FOLLOW_UP_TASK_CATEGORY_LABELS[c] ?? c}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Due (days after back-referral)" required hint="Whole number, 1-1000 days.">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={1}
                  max={1000}
                  value={offsetDays}
                  onChange={(e) => setOffsetDays(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              )}
            </Field>
            <Field label="Title" required>
              {(id) => (
                <input
                  id={id}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Growth check-in (~4 months)"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              )}
            </Field>
            <Field label="Description" required hint="What the follow-up worker should confirm -- never a clinical instruction.">
              {(id) => (
                <input
                  id={id}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Confirm a routine growth-monitoring visit has taken place."
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              )}
            </Field>
          </div>
          {formError && (
            <p role="alert" className="text-xs text-rose-600">
              {formError}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" loading={creating} disabled={!title || !description || !offsetDays} onClick={createTemplate}>
              Add to schedule
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-400">
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium">Title</th>
              <th className="pb-2 font-medium">Due</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="py-1.5 text-slate-500">{FOLLOW_UP_TASK_CATEGORY_LABELS[t.category] ?? t.category}</td>
                <td className="py-1.5">{t.title}</td>
                <td className="py-1.5 text-slate-500">{t.offsetDays} days</td>
                <td className="py-1.5">
                  <StatusBadge status={t.active ? "COMPLETE" : "CANCELLED"} label={t.active ? "Active" : "Inactive"} />
                </td>
                <td className="py-1.5 text-right">
                  <Button size="sm" variant={t.active ? "ghost" : "secondary"} loading={loadingId === t.id} onClick={() => toggleActive(t)}>
                    {t.active ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-xs text-slate-400">
                  No milestones configured -- newborn referrals will only get the standard discharge handoff tasks.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
