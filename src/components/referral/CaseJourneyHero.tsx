import {
  Building2,
  UserCheck,
  Truck,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import type { DecoratedReferral } from "@/lib/referral/queries";
import type { RoleName } from "@/lib/types/enums";

interface CaseJourneyHeroProps {
  referral: DecoratedReferral;
  currentRole: RoleName;
  isReferringFacility: boolean;
  isReceivingFacility: boolean;
  userId: string;
}

export function CaseJourneyHero({
  referral,
  currentRole,
  isReferringFacility,
  isReceivingFacility,
}: CaseJourneyHeroProps) {
  // Derive plain-language current patient status
  function getPlainStateSummary(): { title: string; detail: string; responsibleRole: string } {
    switch (referral.status) {
      case "DRAFT":
        return {
          title: "Referral Draft",
          detail: "Referral is currently being prepared and has not yet been transmitted.",
          responsibleRole: "Referring Doctor",
        };
      case "CREATED":
      case "SENT":
        return {
          title: "Awaiting Hospital Acceptance",
          detail: `Referral dispatched by ${referral.referringFacility.name}. Waiting for ${referral.receivingFacility.name} triage team to accept the case.`,
          responsibleRole: "Receiving Coordinator",
        };
      case "ACKNOWLEDGED":
        return {
          title: "Hospital Accepted — Preparing Transfer",
          detail: referral.transportRequired
            ? "Receiving facility accepted the transfer. Emergency transport is being scheduled."
            : "Receiving facility accepted the transfer. Patient is traveling via personal arrangements.",
          responsibleRole: referral.transportRequired ? "Intake Coordinator / Transport Team" : "Patient Care Team",
        };
      case "TRANSPORT_REQUESTED":
        return {
          title: "Transport Requested",
          detail: "Ambulance request submitted. Awaiting vehicle and driver assignment.",
          responsibleRole: "Transport Dispatcher",
        };
      case "TRANSPORT_ASSIGNED":
        return {
          title: "Transport Assigned — En Route to Pickup",
          detail: `Vehicle ${referral.transportRequests[0]?.assignedVehiclePseudo || "AMB-MH-04-9821"} assigned (ETA ~${referral.transportRequests[0]?.etaMinutes || 25} mins). Traveling to pickup point.`,
          responsibleRole: "Transport Team / Driver",
        };
      case "IN_TRANSIT":
        return {
          title: "Patient In Transit",
          detail: `Patient is currently traveling to ${referral.receivingFacility.name}. Receiving intake bay alerted.`,
          responsibleRole: "Transport Driver & Receiving Intake Team",
        };
      case "ARRIVED":
      case "UNDER_CARE":
        return {
          title: "Patient Arrived & Under Care",
          detail: `Patient is admitted at ${referral.receivingFacility.name} receiving active clinical care.`,
          responsibleRole: "Receiving Hospital Clinical Team",
        };
      case "DISCHARGED":
        return {
          title: "Hospital Care Concluded",
          detail: `Patient discharged from ${referral.receivingFacility.name}. Destination: ${referral.dischargeDestination || "Home / Community Care"}. Preparing back-referral.`,
          responsibleRole: "Discharge Coordinator",
        };
      case "BACK_REFERRED":
        return {
          title: "Back-Referral Dispatched",
          detail: `Handoff summary transmitted back to ${referral.referringFacility.name}. Awaiting origin doctor acknowledgment and community worker assignment.`,
          responsibleRole: "Origin Referring Doctor",
        };
      case "FOLLOW_UP_PENDING":
        return {
          title: "Community Follow-up in Progress",
          detail: "Post-discharge continuity visits and newborn check-ins are actively assigned to community health staff.",
          responsibleRole: "Assigned ASHA / Community Health Worker",
        };
      case "FOLLOW_UP_CONFIRMED":
      case "CLOSED":
        return {
          title: "Referral Journey Completed",
          detail: "All hospital handoffs, discharge documentation, and community follow-up tasks have been successfully concluded.",
          responsibleRole: "Completed / Care Team",
        };
      case "CANCELLED":
        return {
          title: "Referral Cancelled",
          detail: "This referral was cancelled through an administrative override. Clinical continuity should be reviewed directly.",
          responsibleRole: "Administrative Record",
        };
      default:
        return {
          title: referral.status,
          detail: "Active coordination in progress.",
          responsibleRole: "Care Team",
        };
    }
  }

  // Derive role-specific "Your next action" guidance
  function getNextActionPrompt(): { actionText: string; isUrgent: boolean; isUserResponsible: boolean } {
    if (referral.status === "CANCELLED") {
      return {
        actionText: "This referral has been cancelled. Speak with the attending clinician if a new referral is required.",
        isUrgent: false,
        isUserResponsible: false,
      };
    }
    if (referral.status === "CLOSED" || referral.status === "FOLLOW_UP_CONFIRMED") {
      return {
        actionText: "Journey completed. No further coordination actions required.",
        isUrgent: false,
        isUserResponsible: false,
      };
    }

    if (currentRole === "DOCTOR") {
      if (isReferringFacility) {
        if (referral.status === "SENT") {
          return {
            actionText: `Referral sent. Waiting for ${referral.receivingFacility.name} triage team to accept this case. You will be notified immediately upon acceptance.`,
            isUrgent: false,
            isUserResponsible: false,
          };
        }
        if (referral.status === "BACK_REFERRED") {
          return {
            actionText: "Action required: Review the hospital discharge summary, acknowledge the back-referral, and assign an ASHA worker for community follow-up below.",
            isUrgent: true,
            isUserResponsible: true,
          };
        }
        if (["ACKNOWLEDGED", "TRANSPORT_ASSIGNED", "IN_TRANSIT", "UNDER_CARE"].includes(referral.status)) {
          return {
            actionText: `Patient is progressing under ${referral.receivingFacility.name} coordination. Check documents or timeline for live updates.`,
            isUrgent: false,
            isUserResponsible: false,
          };
        }
      }
    }

    if (currentRole === "COORDINATOR") {
      if (isReceivingFacility) {
        if (referral.status === "SENT") {
          return {
            actionText: "Action required: Review inbound patient information and click 'Accept Referral' below to confirm bed and intake readiness.",
            isUrgent: true,
            isUserResponsible: true,
          };
        }
        if (referral.status === "ACKNOWLEDGED") {
          return {
            actionText: referral.transportRequired
              ? "Action required: Assign emergency transport vehicle and driver to initiate patient pickup."
              : "Awaiting patient arrival via personal transit. Show QR scan upon arrival.",
            isUrgent: referral.transportRequired,
            isUserResponsible: referral.transportRequired,
          };
        }
        if (referral.status === "TRANSPORT_ASSIGNED") {
          return {
            actionText: "Transport is scheduled. Update transit status when the vehicle departs with the patient.",
            isUrgent: false,
            isUserResponsible: true,
          };
        }
        if (referral.status === "IN_TRANSIT") {
          return {
            actionText: "Patient is en route. Confirm clinical intake once the transport vehicle reaches the hospital intake bay.",
            isUrgent: true,
            isUserResponsible: true,
          };
        }
        if (referral.status === "UNDER_CARE") {
          return {
            actionText: "Patient is admitted. Once inpatient treatment is complete, record discharge coordination and create the back-referral.",
            isUrgent: false,
            isUserResponsible: true,
          };
        }
        if (referral.status === "DISCHARGED" && !referral.backReferral) {
          return {
            actionText: "Action required: Create and transmit the back-referral to return patient continuity to the referring facility.",
            isUrgent: true,
            isUserResponsible: true,
          };
        }
      }
    }

    if (currentRole === "FOLLOWUP") {
      const myPendingTasks = referral.followUpTasks.filter((t) => t.status === "PENDING");
      if (myPendingTasks.length > 0) {
        return {
          actionText: `Action required: You have ${myPendingTasks.length} pending post-discharge follow-up task(s). Record visit completion or handoff below.`,
          isUrgent: true,
          isUserResponsible: true,
        };
      }
      return {
        actionText: "All assigned community continuity visits for this case have been recorded.",
        isUrgent: false,
        isUserResponsible: false,
      };
    }

    if (currentRole === "ADMIN") {
      return {
        actionText: "Administrative oversight view: Review system audit integrity, SLA progress, and continuity task status.",
        isUrgent: false,
        isUserResponsible: false,
      };
    }

    return {
      actionText: "Case is actively being managed by the healthcare team according to standard referral protocols.",
      isUrgent: false,
      isUserResponsible: false,
    };
  }

  const stateSummary = getPlainStateSummary();
  const nextAction = getNextActionPrompt();

  // Explicit Assignment Details
  const activeTransport = referral.transportRequests[0];
  const assignedFollowUp = referral.followUpTasks[0]?.assignedTo?.name;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6 space-y-5">
      {/* Top Bar: Case ID + Badges + Facility Path */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Referral Case</span>
            <span className="text-base font-extrabold text-slate-900">{referral.referralCode}</span>
            <PriorityBadge priority={referral.priority} />
            <StatusBadge status={referral.status} />
          </div>
          <h1 className="mt-1 text-lg font-bold text-slate-900">
            {referral.patient.pseudonym}
            <span className="ml-2 text-xs font-medium text-slate-500">
              ({referral.patient.sex || "Female"}, Maternal Referral)
            </span>
          </h1>
        </div>

        {/* Facility Route Pill */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Building2 className="size-3.5 text-slate-500" />
            <span>{referral.referringFacility.name}</span>
          </div>
          <ArrowRight className="size-3.5 text-slate-400" />
          <div className="flex items-center gap-1.5 font-bold text-teal-800">
            <Building2 className="size-3.5 text-teal-600" />
            <span>{referral.receivingFacility.name}</span>
          </div>
        </div>
      </div>

      {/* Hero Body: Current Patient State + Next Action */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left Card: Current Patient State */}
        <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-800">
            <ShieldCheck className="size-4 text-teal-600" />
            <span>Current Patient Status</span>
          </div>
          <p className="text-sm font-bold text-slate-900">{stateSummary.title}</p>
          <p className="text-xs text-slate-600 leading-relaxed">{stateSummary.detail}</p>
          <div className="pt-1 flex items-center gap-1.5 text-[11px] font-semibold text-teal-900">
            <span className="text-slate-500">Responsible Role:</span>
            <span className="rounded bg-teal-100/80 px-1.5 py-0.5 text-teal-800">{stateSummary.responsibleRole}</span>
          </div>
        </div>

        {/* Right Card: Your Next Action */}
        <div className={`rounded-xl border p-4 space-y-2 ${
          nextAction.isUserResponsible
            ? "border-amber-200 bg-amber-50/60"
            : "border-slate-200 bg-slate-50/50"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              {nextAction.isUserResponsible ? (
                <AlertCircle className="size-4 text-amber-600" />
              ) : (
                <HelpCircle className="size-4 text-slate-500" />
              )}
              <span>Your Next Action</span>
            </div>
            {nextAction.isUserResponsible && (
              <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900 animate-pulse">
                Action Required
              </span>
            )}
          </div>
          <p className={`text-xs leading-relaxed ${nextAction.isUserResponsible ? "text-amber-950 font-medium" : "text-slate-600"}`}>
            {nextAction.actionText}
          </p>
        </div>
      </div>

      {/* Explicit Responsibility Matrix Banner */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
          Care Coordination & Assignment Matrix
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          {/* Referring Doctor */}
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase">Referring Clinician</p>
            <p className="mt-0.5 font-semibold text-slate-800 truncate">
              {referral.referringDoctor?.name || "Dr. Staff Clinician"}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{referral.referringFacility.name}</p>
          </div>

          {/* Receiving Coordinator */}
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase">Receiving Intake Team</p>
            <p className="mt-0.5 font-semibold text-slate-800 truncate">
              {["SENT"].includes(referral.status) ? "Pending Triage" : "Intake Coordinator"}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{referral.receivingFacility.name}</p>
          </div>

          {/* Transport Assignment */}
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase">Transport Status</p>
            {referral.transportRequired ? (
              activeTransport?.assignedVehiclePseudo ? (
                <>
                  <p className="mt-0.5 font-semibold text-teal-800 truncate flex items-center gap-1">
                    <Truck className="size-3 text-teal-600" />
                    {activeTransport.assignedVehiclePseudo}
                  </p>
                  <p className="text-[10px] text-slate-500">ETA ~{activeTransport.etaMinutes || 25} mins</p>
                </>
              ) : (
                <>
                  <p className="mt-0.5 font-semibold text-amber-700">Requested</p>
                  <p className="text-[10px] text-slate-400">Vehicle unassigned</p>
                </>
              )
            ) : (
              <>
                <p className="mt-0.5 font-semibold text-slate-700">Self Transport</p>
                <p className="text-[10px] text-slate-400">Not requested</p>
              </>
            )}
          </div>

          {/* ASHA / Follow-Up Worker */}
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-[10px] font-medium text-slate-400 uppercase">Community Follow-Up</p>
            {assignedFollowUp ? (
              <>
                <p className="mt-0.5 font-semibold text-teal-800 truncate flex items-center gap-1">
                  <UserCheck className="size-3 text-teal-600" />
                  {assignedFollowUp}
                </p>
                <p className="text-[10px] text-slate-500">Community Sub-Center</p>
              </>
            ) : referral.status === "CLOSED" || referral.status === "FOLLOW_UP_CONFIRMED" ? (
              <>
                <p className="mt-0.5 font-semibold text-emerald-700">Completed</p>
                <p className="text-[10px] text-slate-400">Closed loop</p>
              </>
            ) : ["DISCHARGED", "BACK_REFERRED", "FOLLOW_UP_PENDING"].includes(referral.status) ? (
              <>
                <p className="mt-0.5 font-semibold text-amber-700">Awaiting Assignee</p>
                <p className="text-[10px] text-slate-400">Post-discharge handoff</p>
              </>
            ) : (
              <>
                <p className="mt-0.5 font-semibold text-slate-500">Pending Discharge</p>
                <p className="text-[10px] text-slate-400">Assigned post-care</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
