"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { statusIndex } from "@/lib/referral/stateMachine";
import type { DecoratedReferral } from "@/lib/referral/queries";

const ACTION_LABELS: Record<string, string> = {
  REFERRAL_CREATED: "Referral created",
  REFERRAL_SENT: "Receiving facility notified",
  REFERRAL_ACCEPTED: "Referral accepted by receiving triage",
  CLARIFICATION_REQUESTED: "Clarification requested",
  REFERRAL_DECLINED: "Referral declined",
  TRANSPORT_REQUESTED: "Transport requested",
  TRANSPORT_ASSIGNED: "Transport vehicle assigned",
  TRANSPORT_EN_ROUTE_TO_PICKUP: "Transport en route to pickup",
  TRANSPORT_PICKED_UP: "Patient picked up",
  PATIENT_IN_TRANSIT: "Patient in transit",
  PATIENT_ARRIVED: "Patient arrived at receiving facility",
  UNDER_CARE: "Admitted under receiving facility care",
  DISCHARGE_CREATED: "Discharge coordination recorded",
  BACK_REFERRAL_CREATED: "Back-referral transmitted to origin facility",
  BACK_REFERRAL_ACKNOWLEDGED: "Back-referral acknowledged by origin facility",
  FOLLOW_UP_ASSIGNED: "Community follow-up worker assigned",
  FOLLOW_UP_COMPLETED: "Post-discharge follow-up visit completed",
  REFERRAL_CLOSED: "Closed-loop journey completed",
  ADMIN_OVERRIDE: "Administrative override executed",
  REFERRAL_REOPENED: "Referral reopened via administrative override",
  RESCUE_ACTION_APPLIED: "Operational rescue action applied",
};

interface JourneyStep {
  key: string;
  title: string;
  description: string;
  responsibleRole: string;
  atStatus: string;
  applicable: boolean;
}

export function ReferralTimeline({ referral }: { referral: DecoratedReferral }) {
  const [activeTab, setActiveTab] = useState<"journey" | "audit">("journey");
  const [showAllAudit, setShowAllAudit] = useState(false);

  const currentIdx = statusIndex(referral.status as never);

  // Define the 13 canonical journey milestone stages
  const journeySteps: JourneyStep[] = [
    {
      key: "created",
      title: "1. Referral Created",
      description: "Referring clinician initiates the case and registers the Referral Passport.",
      responsibleRole: "Referring Doctor",
      atStatus: "CREATED",
      applicable: true,
    },
    {
      key: "sent",
      title: "2. Receiving Facility Notified",
      description: "Case transmitted to receiving hospital intake queue for triage.",
      responsibleRole: "Receiving Coordinator",
      atStatus: "SENT",
      applicable: true,
    },
    {
      key: "accepted",
      title: "3. Hospital Accepted",
      description: "Receiving intake coordinator accepts the patient transfer.",
      responsibleRole: "Receiving Coordinator",
      atStatus: "ACKNOWLEDGED",
      applicable: true,
    },
    {
      key: "transport_requested",
      title: "4. Transport Requested",
      description: "Emergency ambulance coordination initiated.",
      responsibleRole: "Transport Dispatcher",
      atStatus: "TRANSPORT_REQUESTED",
      applicable: referral.transportRequired,
    },
    {
      key: "transport_assigned",
      title: "5. Transport Assigned",
      description: "Vehicle and driver dispatched to pickup location.",
      responsibleRole: "Transport Driver",
      atStatus: "TRANSPORT_ASSIGNED",
      applicable: referral.transportRequired,
    },
    {
      key: "in_transit",
      title: "6. Patient In Transit",
      description: "Patient traveling with emergency transport to receiving facility.",
      responsibleRole: "Transport Team",
      atStatus: "IN_TRANSIT",
      applicable: referral.transportRequired,
    },
    {
      key: "arrived",
      title: "7. Patient Arrived",
      description: "Transport reaches intake bay and arrival is confirmed.",
      responsibleRole: "Receiving Intake Bay",
      atStatus: "ARRIVED",
      applicable: true,
    },
    {
      key: "under_care",
      title: "8. Inpatient Clinical Care",
      description: "Patient admitted under higher-level medical care.",
      responsibleRole: "Hospital Clinical Team",
      atStatus: "UNDER_CARE",
      applicable: true,
    },
    {
      key: "discharged",
      title: "9. Hospital Discharge Coordination",
      description: "Clinical care concluded; administrative handoff prepared.",
      responsibleRole: "Discharge Coordinator",
      atStatus: "DISCHARGED",
      applicable: true,
    },
    {
      key: "back_referred",
      title: "10. Back-Referral Transmitted",
      description: "Discharge summary sent back to origin referring facility.",
      responsibleRole: "Discharge Coordinator",
      atStatus: "BACK_REFERRED",
      applicable: true,
    },
    {
      key: "follow_up_assigned",
      title: "11. Community Follow-Up Assigned",
      description: "Origin doctor acknowledges handoff and assigns ASHA worker.",
      responsibleRole: "Origin Referring Doctor",
      atStatus: "FOLLOW_UP_PENDING",
      applicable: true,
    },
    {
      key: "follow_up_confirmed",
      title: "12. Follow-Up Visits in Progress",
      description: "Community health worker conducts post-discharge check-ins.",
      responsibleRole: "ASHA / Community Worker",
      atStatus: "FOLLOW_UP_CONFIRMED",
      applicable: true,
    },
    {
      key: "closed",
      title: "13. Closed-Loop Completed",
      description: "All continuity tasks and handoff milestones verified complete.",
      responsibleRole: "System / Care Team",
      atStatus: "CLOSED",
      applicable: true,
    },
  ].filter((s) => s.applicable);

  const displayedAuditEvents = showAllAudit ? referral.events : referral.events.slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("journey")}
          className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 ${
            activeTab === "journey"
              ? "border-teal-600 text-teal-800"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Shared Patient Journey ({journeySteps.length} Stages)
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 ${
            activeTab === "audit"
              ? "border-teal-600 text-teal-800"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Immutable Audit Log ({referral.events.length} Events)
        </button>
      </div>

      {/* Tab 1: Shared Patient Journey */}
      {activeTab === "journey" && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500 mb-4">
            The shared single source of truth across referring clinicians, receiving coordinators, transport, and community follow-up workers.
          </p>

          <ol className="space-y-0">
            {journeySteps.map((step, i) => {
              const stepIdx = statusIndex(step.atStatus as never);
              const isCompleted = referral.status !== "CANCELLED" && currentIdx > stepIdx;
              const isCurrent = referral.status !== "CANCELLED" && (
                currentIdx === stepIdx ||
                (step.atStatus === "CLOSED" && (referral.status === "CLOSED" || referral.status === "FOLLOW_UP_CONFIRMED"))
              );

              return (
                <li key={step.key} className="flex gap-3">
                  {/* Step Indicator & Line */}
                  <div className="flex flex-col items-center">
                    {isCompleted ? (
                      <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                    ) : isCurrent ? (
                      <div className="relative flex items-center justify-center">
                        <span className="absolute size-3 rounded-full bg-teal-400 opacity-75 animate-ping" />
                        <Circle className="size-5 fill-teal-600 text-teal-600 shrink-0" />
                      </div>
                    ) : (
                      <Circle className="size-5 text-slate-300 shrink-0" />
                    )}
                    {i < journeySteps.length - 1 && (
                      <div
                        className={`my-1 h-8 w-px ${
                          isCompleted ? "bg-emerald-300" : isCurrent ? "bg-teal-300" : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="pb-3 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs font-bold ${
                          isCompleted
                            ? "text-slate-800"
                            : isCurrent
                            ? "text-teal-900"
                            : "text-slate-400"
                        }`}
                      >
                        {step.title}
                      </p>
                      {isCurrent && (
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-extrabold text-teal-800">
                          Active Stage
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[11px] font-medium text-emerald-700">Completed</span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        isCompleted
                          ? "text-slate-600"
                          : isCurrent
                          ? "text-slate-700 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {step.description}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Responsible: <span className="font-medium">{step.responsibleRole}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Tab 2: Detailed Audit Log */}
      {activeTab === "audit" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Cryptographically-hashed immutable log of all workflow actions and state transitions.
          </p>

          {referral.events.length === 0 ? (
            <p className="text-xs text-slate-400">No events recorded yet.</p>
          ) : (
            <ol className="space-y-0">
              {displayedAuditEvents.map((event, i) => (
                <li key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <Circle className="size-2.5 fill-teal-600 text-teal-600 shrink-0 mt-1" />
                    {i < displayedAuditEvents.length - 1 && (
                      <div className="mt-1 h-full w-px flex-1 bg-slate-200" />
                    )}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900">
                        {ACTION_LABELS[event.action] ?? event.action}
                      </p>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatDateTime(event.createdAt)}
                      </span>
                    </div>
                    {event.note && (
                      <p className="mt-0.5 text-xs text-slate-600 bg-slate-50 rounded p-1.5 border border-slate-100">
                        {event.note}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Actor: <span className="font-medium text-slate-600">{event.actor?.name ?? "System"}</span> (
                      {event.actorRole || "SYSTEM"})
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {referral.events.length > 8 && (
            <button
              onClick={() => setShowAllAudit(!showAllAudit)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-900"
            >
              {showAllAudit ? (
                <>
                  Show Less <ChevronUp className="size-3.5" />
                </>
              ) : (
                <>
                  Show All {referral.events.length} Events <ChevronDown className="size-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
