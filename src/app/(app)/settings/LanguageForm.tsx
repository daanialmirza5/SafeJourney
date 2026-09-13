"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "mr", label: "मराठी (Marathi)" },
];

export function LanguageForm({ currentLanguage }: { currentLanguage: string }) {
  const selectId = useId();
  const [language, setLanguage] = useState(currentLanguage);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function save() {
    setLoading(true);
    try {
      await apiFetch("/api/users/me", { method: "PATCH", body: JSON.stringify({ language }) });
      showToast("Language preference saved.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={selectId} className="sr-only">
        Language
      </label>
      <select id={selectId} value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <Button size="sm" loading={loading} onClick={save}>
        Save
      </Button>
    </div>
  );
}
