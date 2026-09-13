"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Check, X } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

interface Template {
  key: string;
  category: string;
  title: string;
  body: string;
  placeholders: string[];
  isCustomized: boolean;
}

export function NotificationTemplatesPanel({ templates: initial }: { templates: Template[] }) {
  const [templates, setTemplates] = useState(initial);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  function startEdit(t: Template) {
    setEditingKey(t.key);
    setTitle(t.title);
    setBody(t.body);
  }

  async function save(key: string) {
    setLoading(true);
    try {
      await apiFetch(`/api/admin/notification-templates/${key}`, { method: "PATCH", body: JSON.stringify({ title, body }) });
      setTemplates((prev) => prev.map((t) => (t.key === key ? { ...t, title, body, isCustomized: true } : t)));
      setEditingKey(null);
      showToast("Notification template updated.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save template.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function reset(t: Template) {
    if (!confirm(`Revert "${t.key}" to its default text?`)) return;
    setLoading(true);
    try {
      await apiFetch(`/api/admin/notification-templates/${t.key}`, { method: "DELETE" });
      showToast("Template reverted to default.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to revert template.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ul className="divide-y divide-slate-100">
      {templates.map((t) => (
        <li key={t.key} className="py-3">
          {editingKey === t.key ? (
            <div className="space-y-2">
              <Field label="Title" required>
                {(id) => (
                  <input
                    id={id}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm font-medium"
                  />
                )}
              </Field>
              <Field label="Body" required hint={`Required placeholders: ${t.placeholders.map((p) => `{{${p}}}`).join(", ") || "none"}`}>
                {(id) => (
                  <textarea id={id} value={body} onChange={(e) => setBody(e.target.value)} rows={2} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs" />
                )}
              </Field>
              <div className="flex gap-2">
                <Button size="sm" loading={loading} onClick={() => save(t.key)}>
                  <Check className="size-3.5" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>
                  <X className="size-3.5" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {t.title} <span className="ml-1.5 font-mono text-[10px] text-slate-400">{t.key}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{t.body}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => startEdit(t)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Edit template">
                  <Pencil className="size-3.5" />
                </button>
                {t.isCustomized && (
                  <button onClick={() => reset(t)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600" aria-label="Revert to default">
                    <RotateCcw className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
