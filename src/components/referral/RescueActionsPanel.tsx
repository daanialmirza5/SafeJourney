"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { RESCUE_ACTIONS, type RescueActionId } from "@/lib/referral/rescueEngine";

/** Lets a care-team member act on a STUCK referral -- previously
 * RESCUE_ACTIONS existed in rescueEngine.ts but was never wired into any
 * UI, so a STUCK referral could be flagged but nothing on-screen let
 * anyone actually do something about it beyond the generic admin
 * override. Each action is logged to the referral timeline and audit
 * trail; RETRY_NOTIFICATION and ESCALATE_COORDINATOR also re-notify the
 * receiving facility's coordinators. This is a coordination nudge, not a
 * clinical decision -- it never changes the referral's workflow status. */
export function RescueActionsPanel({ referralId }: { referralId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function apply(action: RescueActionId, label: string) {
    setLoadingId(action);
    try {
      await apiFetch(`/api/referrals/${referralId}/rescue-action`, { method: "POST", body: JSON.stringify({ action }) });
      showToast(`${label} -- recorded on the referral timeline.`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to apply this action. Please check your connection or retry.", "error");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {RESCUE_ACTIONS.map((a) => (
        <Button key={a.id} size="sm" variant="secondary" loading={loadingId === a.id} onClick={() => apply(a.id, a.label)}>
          {a.label}
        </Button>
      ))}
    </div>
  );
}
