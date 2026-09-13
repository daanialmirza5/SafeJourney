"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

export function AckTimeoutForm({ currentValue, currentMaternalFollowUpDueDays }: { currentValue: number; currentMaternalFollowUpDueDays: number }) {
  const ackId = useId();
  const maternalDaysId = useId();
  const [value, setValue] = useState(currentValue);
  const [maternalDays, setMaternalDays] = useState(currentMaternalFollowUpDueDays);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  async function saveAckTimeout() {
    setLoading("ack");
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ ackTimeoutMinutes: value }) });
      showToast("Referral Rescue timeout updated.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function saveMaternalDueDays() {
    setLoading("maternal");
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ maternalFollowUpDueDays: maternalDays }) });
      showToast("Maternal follow-up due-date window updated.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save.", "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={ackId} className="text-sm text-slate-600">
          Referral Rescue acknowledgement timeout (minutes)
        </label>
        <input
          id={ackId}
          type="number"
          min={1}
          max={1440}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <Button size="sm" loading={loading === "ack"} onClick={saveAckTimeout}>
          Save
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={maternalDaysId} className="text-sm text-slate-600">
          Maternal/administrative follow-up due window (days after back-referral acknowledgment)
        </label>
        <input
          id={maternalDaysId}
          type="number"
          min={1}
          max={90}
          value={maternalDays}
          onChange={(e) => setMaternalDays(Number(e.target.value))}
          className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <Button size="sm" loading={loading === "maternal"} onClick={saveMaternalDueDays}>
          Save
        </Button>
      </div>
    </div>
  );
}
