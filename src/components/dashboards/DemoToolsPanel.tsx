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
      showToast("Judge demo referral created -- ready to walk through.");
      router.push(`/referrals/${data.referral.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to launch demo.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function launchRescueDemo() {
    setLoading("rescue");
    try {
      const data = await apiFetch<{ referral: { id: string } }>("/api/demo/rescue-scenario", { method: "POST" });
      showToast("Rescue scenario created -- this referral is already STUCK.");
      router.push(`/referrals/${data.referral.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to launch rescue demo.", "error");
    } finally {
      setLoading(null);
    }
  }

  async function resetDemo() {
    if (!confirm("This will wipe and regenerate all demo data. Continue?")) return;
    setLoading("reset");
    try {
      await apiFetch("/api/demo/reset", { method: "POST" });
      showToast("Demo data has been reset.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reset demo data.", "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" loading={loading === "judge"} onClick={launchJudgeDemo}>
        <Sparkles className="size-3.5" /> Launch Judge Demo
      </Button>
      <Button variant="secondary" size="sm" loading={loading === "rescue"} onClick={launchRescueDemo}>
        <AlertOctagon className="size-3.5" /> Demo Rescue Scenario
      </Button>
      {showReset && (
        <Button variant="ghost" size="sm" loading={loading === "reset"} onClick={resetDemo}>
          <RotateCcw className="size-3.5" /> Reset demo data
        </Button>
      )}
    </div>
  );
}
