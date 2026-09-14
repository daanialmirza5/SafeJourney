"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, AlertOctagon, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function DemoToolsPanel({ showReset = false }: { showReset?: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  async function launchJudgeDemo() {
    setLoading("judge");
    try {
      const data = await apiFetch<{ referral: { id: string } }>("/api/demo/judge-scenario", { method: "POST" });
      showToast("Sample referral case created -- ready to walk through.");
      router.push(`/referrals/${data.referral.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to generate sample referral.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function launchRescueDemo() {
    setLoading("rescue");
    try {
      const data = await apiFetch<{ referral: { id: string } }>("/api/demo/rescue-scenario", { method: "POST" });
      showToast("Escalation scenario created -- case is marked STUCK due to SLA breach.");
      router.push(`/referrals/${data.referral.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to generate escalation scenario.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function resetDemo() {
    if (!confirm("This will regenerate all sample evaluation data. Continue?")) return;
    setLoading("reset");
    try {
      await apiFetch("/api/demo/reset", { method: "POST" });
      showToast("Evaluation sample data has been reset.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reset evaluation data.", "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" loading={loading === "judge"} onClick={launchJudgeDemo}>
        <Sparkles className="size-3.5 text-brand" /> Generate Sample Referral
      </Button>
      <Button variant="secondary" size="sm" loading={loading === "rescue"} onClick={launchRescueDemo}>
        <AlertOctagon className="size-3.5 text-amber-600" /> Simulate SLA Escalation
      </Button>
      {showReset && (
        <Button variant="ghost" size="sm" loading={loading === "reset"} onClick={resetDemo}>
          <RotateCcw className="size-3.5 text-slate-500" /> Reset evaluation data
        </Button>
      )}
    </div>
  );
}
