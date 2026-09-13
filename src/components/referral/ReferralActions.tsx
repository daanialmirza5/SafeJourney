"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, HelpCircle, XCircle, Truck, MapPin, LogOut, Send, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import type { RoleName } from "@/lib/types/enums";
import { nextStatuses } from "@/lib/referral/stateMachine";

interface TransportRequest {
  id: string;
  status: string;
}
interface FollowUpWorker {
  id: string;
  name: string;
}

export function ReferralActions({
  referralId,
  status,
  transportRequired,
  transportRequests,
  role,
  isReferringFacility,
  isReceivingFacility,
  followUpWorkers,
}: {
  referralId: string;
  status: string;
  transportRequired: boolean;
  transportRequests: TransportRequest[];
  role: RoleName;
  isReferringFacility: boolean;
  isReceivingFacility: boolean;
  followUpWorkers: FollowUpWorker[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [showDischargeForm, setShowDischargeForm] = useState(false);
  const [dischargeDestination, setDischargeDestination] = useState("");
  const [dischargeNote, setDischargeNote] = useState("");
  const [showBackReferralForm, setShowBackReferralForm] = useState(false);
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [showAcknowledgeForm, setShowAcknowledgeForm] = useState(false);
  const [followUpAssigneeId, setFollowUpAssigneeId] = useState("");
  const [showAssignTransport, setShowAssignTransport] = useState(false);
  const [vehiclePseudo, setVehiclePseudo] = useState("");
  const [etaMinutes, setEtaMinutes] = useState("30");
  const [showOverride, setShowOverride] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [closeBlockerSummary, setCloseBlockerSummary] = useState<string | null>(null);

  async function run(key: string, url: string, body?: unknown, successMsg?: string, method: "POST" | "PATCH" = "POST") {
    setLoading(key);
    try {
      await apiFetch(url, { method, body: body !== undefined ? JSON.stringify(body) : undefined });
      showToast(successMsg ?? "Done.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to complete action. Please check your connection or retry.", "error");
    } finally {
      setLoading(null);
    }
  }

  // Close case: the first attempt never forces past unresolved items. If
  // the server refuses because of outstanding follow-ups/admin tasks/an
  // unacknowledged back-referral, its error message *is* the confirmation
  // summary (see getClosureBlockers) -- show it inline and let the user
  // explicitly resubmit with confirmOutstanding once they've seen it.
  async function submitClose(confirmOutstanding: boolean) {
    if (!closeReason.trim()) {
      showToast("Provide a reason for closing this case.", "error");
      return;
    }
    setLoading("close");
    try {
      await apiFetch(`/api/referrals/${referralId}/close`, {
        method: "POST",
        body: JSON.stringify({ reason: closeReason, confirmOutstanding }),
      });
      showToast("Referral closed.");
      setShowCloseForm(false);
      setCloseBlockerSummary(null);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to close this referral.";
      if (message.includes("unresolved items")) {
        setCloseBlockerSummary(message);
      } else {
        showToast(message, "error");
      }
    } finally {
      setLoading(null);
    }
  }

  async function loadBackReferralDraft() {
    setShowBackReferralForm(true);
    try {
      const data = await apiFetch<{ draftSummary: string }>(`/api/referrals/${referralId}/back-referral`);
      setDischargeSummary(data.draftSummary);
    } catch {
      // leave textarea empty for manual entry
    }
  }

  const transport = transportRequests[0];
  const actions: React.ReactNode[] = [];

  // Receiving-facility actions
  if (isReceivingFacility && status === "SENT") {
    actions.push(
      <Button key="accept" size="sm" loading={loading === "accept"} onClick={() => run("accept", `/api/referrals/${referralId}/accept`, undefined, "Referral accepted.")}>
        <Check className="size-3.5" /> Accept
      </Button>,
      <Button
        key="clarify"
        variant="secondary"
        size="sm"
        loading={loading === "clarify"}
        onClick={() => {
          const note = window.prompt("What clarification do you need?");
          if (note) run("clarify", `/api/referrals/${referralId}/clarification`, { note }, "Clarification requested.");
        }}
      >
        <HelpCircle className="size-3.5" /> Request clarification
      </Button>,
      <Button
        key="decline"
        variant="danger"
        size="sm"
        loading={loading === "decline"}
        onClick={() => {
          const reason = window.prompt("Why can't your facility accept this referral?");
          if (reason) run("decline", `/api/referrals/${referralId}/decline`, { reason }, "Referral declined.");
        }}
      >
        <XCircle className="size-3.5" /> Decline / unavailable
      </Button>
    );
  }

  // Transport actions (doctor or coordinator, either facility)
  if ((isReferringFacility || isReceivingFacility) && transportRequired && status === "ACKNOWLEDGED" && !transport) {
    actions.push(
      <Button key="req-transport" size="sm" loading={loading === "req-transport"} onClick={() => run("req-transport", `/api/referrals/${referralId}/transport`, undefined, "Transport requested.")}>
        <Truck className="size-3.5" /> Request transport
      </Button>
    );
  }
  if ((isReferringFacility || isReceivingFacility) && transport?.status === "REQUESTED" && !showAssignTransport) {
    actions.push(
      <Button key="assign-transport" variant="secondary" size="sm" onClick={() => setShowAssignTransport(true)}>
        <Truck className="size-3.5" /> Assign transport
      </Button>
    );
  }
  if ((isReferringFacility || isReceivingFacility) && transport && ["ASSIGNED", "EN_ROUTE_TO_PICKUP", "PICKED_UP"].includes(transport.status)) {
    const next = transport.status === "ASSIGNED" ? "EN_ROUTE_TO_PICKUP" : transport.status === "EN_ROUTE_TO_PICKUP" ? "PICKED_UP" : "IN_TRANSIT";
    const label = next === "EN_ROUTE_TO_PICKUP" ? "Mark en route to pickup" : next === "PICKED_UP" ? "Mark picked up" : "Mark in transit";
    actions.push(
      <Button
        key="transport-progress"
        variant="secondary"
        size="sm"
        loading={loading === "transport-progress"}
        onClick={() => run("transport-progress", `/api/transport/${transport.id}`, { action: "progress", status: next }, "Transport updated.", "PATCH")}
      >
        <Truck className="size-3.5" /> {label}
      </Button>
    );
  }

  // Arrival (receiving facility, when acknowledged-and-no-transport or in transit)
  if (isReceivingFacility && (status === "ACKNOWLEDGED" || status === "IN_TRANSIT")) {
    actions.push(
      <Button key="arrival" size="sm" loading={loading === "arrival"} onClick={() => run("arrival", `/api/referrals/${referralId}/arrival`, undefined, "Arrival confirmed.")}>
        <MapPin className="size-3.5" /> Mark arrived
      </Button>
    );
  }

  // Discharge
  if (isReceivingFacility && status === "UNDER_CARE" && !showDischargeForm) {
    actions.push(
      <Button key="discharge" size="sm" onClick={() => setShowDischargeForm(true)}>
        <LogOut className="size-3.5" /> Discharge
      </Button>
    );
  }

  // Back-referral
  if (isReceivingFacility && status === "DISCHARGED" && !showBackReferralForm) {
    actions.push(
      <Button key="back-referral" size="sm" onClick={loadBackReferralDraft}>
        <Send className="size-3.5" /> Generate back-referral
      </Button>
    );
  }

  // Origin-facility acknowledgment of the back-referral -- closes the
  // "acknowledged" gap in the closed loop before follow-up is assigned.
  if (isReferringFacility && status === "BACK_REFERRED" && !showAcknowledgeForm) {
    actions.push(
      <Button key="acknowledge-back-referral" size="sm" onClick={() => setShowAcknowledgeForm(true)}>
        <CheckCheck className="size-3.5" /> Acknowledge back-referral
      </Button>
    );
  }

  // Explicit human-initiated closure -- available to either side of the
  // referral (or an admin) any time before the case is already terminal.
  const isTerminalStatus = status === "CLOSED" || status === "CANCELLED";
  if (!isTerminalStatus && (isReferringFacility || isReceivingFacility || role === "ADMIN") && !showCloseForm) {
    actions.push(
      <Button key="close-case" variant="ghost" size="sm" onClick={() => setShowCloseForm(true)}>
        <Check className="size-3.5" /> Close case
      </Button>
    );
  }

  // Admin override always available
  if (role === "ADMIN" && !showOverride) {
    actions.push(
      <Button key="override" variant="ghost" size="sm" onClick={() => setShowOverride(true)}>
        <ShieldAlert className="size-3.5" /> Override status
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {actions.length > 0 && <div className="flex flex-wrap gap-2">{actions}</div>}

      {showAssignTransport && (
        <div className="space-y-2 rounded-lg border border-slate-100 p-3">
          <p className="text-xs font-medium text-slate-600">Assign transport (demo mode)</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex-1">
              <Field label="Vehicle pseudonym">
                {(id) => (
                  <input
                    id={id}
                    value={vehiclePseudo}
                    onChange={(e) => setVehiclePseudo(e.target.value)}
                    placeholder="e.g. DEMO-AMB-42"
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                  />
                )}
              </Field>
            </div>
            <div className="w-28">
              <Field label="ETA (minutes)">
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    value={etaMinutes}
                    onChange={(e) => setEtaMinutes(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                  />
                )}
              </Field>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={loading === "assign"}
              onClick={() =>
                run(
                  "assign",
                  `/api/transport/${transport?.id}`,
                  { action: "assign", vehiclePseudo: vehiclePseudo || "DEMO-AMB-01", etaMinutes: Number(etaMinutes) || 30 },
                  "Transport assigned.",
                  "PATCH"
                )
              }
            >
              Confirm assignment
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAssignTransport(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showDischargeForm && (
        <div className="space-y-2 rounded-lg border border-slate-100 p-3">
          <p className="text-xs font-medium text-slate-600">Discharge coordination (administrative record only)</p>
          <Field label="Discharge destination / next care location" required hint="e.g. Home, or the name of a facility the patient is being transferred to.">
            {(id) => (
              <input
                id={id}
                value={dischargeDestination}
                onChange={(e) => setDischargeDestination(e.target.value)}
                placeholder="e.g. Home"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
              />
            )}
          </Field>
          <Field label="Discharge note (optional)">
            {(id) => (
              <textarea
                id={id}
                value={dischargeNote}
                onChange={(e) => setDischargeNote(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={loading === "discharge"}
              disabled={!dischargeDestination.trim()}
              onClick={() =>
                run(
                  "discharge",
                  `/api/referrals/${referralId}/discharge`,
                  { destination: dischargeDestination, note: dischargeNote },
                  "Discharge coordination recorded."
                )
              }
            >
              Confirm discharge
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDischargeForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showBackReferralForm && (
        <div className="space-y-2 rounded-lg border border-slate-100 p-3">
          <Field label="Back-referral summary (AI-drafted, editable)">
            {(id) => (
              <textarea
                id={id}
                value={dischargeSummary}
                onChange={(e) => setDischargeSummary(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={loading === "back-referral-send"}
              onClick={() =>
                run(
                  "back-referral-send",
                  `/api/referrals/${referralId}/back-referral`,
                  { dischargeSummary },
                  "Back-referral sent -- awaiting acknowledgment from the origin facility."
                )
              }
            >
              Confirm & send
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowBackReferralForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showAcknowledgeForm && (
        <div className="space-y-2 rounded-lg border border-slate-100 p-3">
          <p className="text-xs font-medium text-slate-600">
            Acknowledge receipt of this back-referral and assign follow-up
          </p>
          {followUpWorkers.length > 0 && (
            <Field label="Assign follow-up to">
              {(id) => (
                <select
                  id={id}
                  data-testid="follow-up-assignee"
                  value={followUpAssigneeId}
                  onChange={(e) => setFollowUpAssigneeId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                >
                  <option value="">Select a follow-up worker...</option>
                  {followUpWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              data-testid="acknowledge-back-referral"
              loading={loading === "acknowledge-back-referral"}
              onClick={() =>
                run(
                  "acknowledge-back-referral",
                  `/api/referrals/${referralId}/back-referral/acknowledge`,
                  { followUpAssigneeId: followUpAssigneeId || undefined },
                  "Back-referral acknowledged and follow-up assigned."
                )
              }
            >
              <CheckCheck className="size-3.5" /> Confirm acknowledgment
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAcknowledgeForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showCloseForm && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-700">Close case (audited, reason required)</p>
          {closeBlockerSummary && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{closeBlockerSummary}</p>
          )}
          <Field label="Reason for closing" required>
            {(id) => (
              <textarea
                id={id}
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button size="sm" loading={loading === "close"} onClick={() => submitClose(false)}>
              <Check className="size-3.5" /> Close case
            </Button>
            {closeBlockerSummary && (
              <Button size="sm" variant="danger" loading={loading === "close"} onClick={() => submitClose(true)}>
                Close anyway
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowCloseForm(false);
                setCloseBlockerSummary(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showOverride && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-800">Administrative override (audited, reason required)</p>
          <Field label="Target status" required>
            {(id) => (
              <select id={id} value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs">
                <option value="">Choose target status...</option>
                {[...nextStatuses(status as never), "CANCELLED"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Reason for override" required>
            {(id) => (
              <textarea
                id={id}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              loading={loading === "override"}
              onClick={() => {
                if (!overrideStatus || !overrideReason) {
                  showToast("Choose a target status and provide a reason.", "error");
                  return;
                }
                run("override", `/api/referrals/${referralId}/override`, { toStatus: overrideStatus, reason: overrideReason }, "Override applied.");
              }}
            >
              Apply override
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowOverride(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
