import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { notifyFromTemplate, notifyManyFromTemplate } from "@/lib/notifications/notificationService";
import { generateReferralCode, generatePassportToken } from "@/lib/referral/referralCode";
import { transition, overrideTransition, canTransition, isTerminalStatus, type ReferralStatus } from "@/lib/referral/stateMachine";
import { buildDefaultAdminTasks, getIncompleteAdminTasks } from "@/lib/referral/adminCompleteness";
import { getClosureBlockers, OPEN_FOLLOW_UP_STATUSES } from "@/lib/referral/closureSafeguards";
import { buildNewbornContinuityTasks, canCompleteFollowUpTask, canSkipFollowUpTask } from "@/lib/referral/newbornContinuity";
import { RESCUE_ACTIONS, type RescueActionId } from "@/lib/referral/rescueEngine";
import { evaluateBenefit } from "@/lib/benefits/ruleEngine";
import { ConflictError, NotFoundError } from "@/lib/apiError";
import { ForbiddenError } from "@/lib/auth";
import { canActOnReceivingFacility, canActOnReferringFacility } from "@/lib/referral/access";
import { getMaternalFollowUpDueDays } from "@/lib/config";
import type { User } from "@prisma/client";

/** SQLite stores status as a plain string column; this narrows it back to
 * the state machine's literal union at the boundary where we trust it was
 * only ever written by our own service functions. */
function asStatus(status: string): ReferralStatus {
  return status as ReferralStatus;
}

export const referralInclude = {
  patient: { include: { familyCase: { include: { motherCase: true, newbornCase: true } } } },
  referringFacility: true,
  receivingFacility: true,
  referringDoctor: true,
  events: { orderBy: { createdAt: "asc" as const }, include: { actor: true } },
  transportRequests: { orderBy: { requestedAt: "desc" as const } },
  documents: { include: { extraction: true } },
  benefitEvaluations: { include: { benefitRule: true } },
  adminTasks: true,
  followUpTasks: { include: { assignedTo: true, resolvedBy: true } },
  backReferral: true,
};

async function logEvent(
  referralId: string,
  actor: User | null,
  action: string,
  fromStatus: string | null,
  toStatus: string | null,
  note?: string
) {
  await db.referralEvent.create({
    data: {
      referralId,
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? null,
      action,
      fromStatus,
      toStatus,
      note,
    },
  });
}

async function findReceivingCoordinators(facilityId: string) {
  return db.user.findMany({ where: { facilityId, role: "COORDINATOR", deactivatedAt: null } });
}

export interface CreateReferralInput {
  doctor: User;
  patient: { name: string; sex: string; dateOfBirth?: string };
  includeNewborn?: { name: string; sex?: string; birthDate?: string };
  receivingFacilityId: string;
  priority: "ROUTINE" | "URGENT" | "EMERGENCY";
  transportRequired: boolean;
  doctorNote: string;
  adminNotes?: string;
}

export async function createReferral(input: CreateReferralInput) {
  if (!input.doctor.facilityId) {
    throw new ConflictError("Doctor must belong to a facility to create a referral.");
  }
  const receivingFacility = await db.facility.findUnique({ where: { id: input.receivingFacilityId } });
  if (!receivingFacility) throw new NotFoundError("Receiving facility not found.");

  const pseudonymSeq = Math.floor(1000 + Math.random() * 8999);

  const referral = await db.$transaction(async (tx) => {
    const patient = await tx.patient.create({
      data: {
        pseudonym: `Patient-${pseudonymSeq}`,
        name: input.patient.name,
        sex: input.patient.sex,
        dateOfBirth: input.patient.dateOfBirth ? new Date(input.patient.dateOfBirth) : null,
        facilityId: input.doctor.facilityId!,
        createdById: input.doctor.id,
      },
    });

    if (input.includeNewborn) {
      const familyCase = await tx.familyCase.create({ data: { patientId: patient.id } });
      await tx.motherCase.create({ data: { familyCaseId: familyCase.id } });
      await tx.newbornCase.create({
        data: {
          familyCaseId: familyCase.id,
          name: input.includeNewborn.name,
          sex: input.includeNewborn.sex,
          birthDate: input.includeNewborn.birthDate ? new Date(input.includeNewborn.birthDate) : null,
        },
      });
    }

    const now = new Date();
    const created = await tx.referralCase.create({
      data: {
        referralCode: generateReferralCode(now),
        passportToken: generatePassportToken(),
        patientId: patient.id,
        referringFacilityId: input.doctor.facilityId!,
        receivingFacilityId: input.receivingFacilityId,
        referringDoctorId: input.doctor.id,
        status: "SENT",
        operationalStatus: "ON_TRACK",
        priority: input.priority,
        transportRequired: input.transportRequired,
        doctorNote: input.doctorNote,
        adminNotes: input.adminNotes,
        sentAt: now,
      },
    });

    const tasks = buildDefaultAdminTasks({
      transportRequired: input.transportRequired,
      hasNewbornCase: Boolean(input.includeNewborn),
    });
    await tx.administrativeTask.createMany({
      data: tasks.map((t) => ({ ...t, referralId: created.id })),
    });

    // Auto-run the deterministic benefit rule engine against active rules.
    const rules = await tx.benefitRule.findMany({ where: { status: "ACTIVE" } });
    for (const rule of rules) {
      const evalResult = evaluateBenefit(
        {
          state: receivingFacility.state,
          transportRequired: input.transportRequired,
          hasNewbornCase: Boolean(input.includeNewborn),
          confirmedDocumentTypes: [],
        },
        rule.status as "ACTIVE" | "INACTIVE",
        JSON.parse(rule.conditions),
        JSON.parse(rule.documentRequirements)
      );
      await tx.benefitEvaluation.create({
        data: {
          referralId: created.id,
          benefitRuleId: rule.id,
          result: evalResult.result,
          reason: evalResult.reason,
          requiredDocuments: JSON.stringify(evalResult.requiredDocuments),
          nextActions: JSON.stringify(evalResult.nextActions),
        },
      });
    }

    return created;
  });

  await logEvent(referral.id, input.doctor, "REFERRAL_CREATED", null, "CREATED", "Referral created and sent.");
  await logEvent(referral.id, input.doctor, "REFERRAL_SENT", "CREATED", "SENT");
  await recordAuditEvent({
    actorId: input.doctor.id,
    actorRole: input.doctor.role,
    entityType: "ReferralCase",
    entityId: referral.id,
    action: "REFERRAL_CREATED",
    newValue: { status: "SENT", referralCode: referral.referralCode },
  });

  const coordinators = await findReceivingCoordinators(input.receivingFacilityId);
  await notifyManyFromTemplate(
    coordinators.map((c) => ({
      userId: c.id,
      templateKey: "REFERRAL_CREATED_COORDINATOR",
      vars: { referralCode: referral.referralCode },
      referralId: referral.id,
    }))
  );

  return getReferralOrThrow(referral.id);
}

export async function getReferralOrThrow(id: string) {
  const referral = await db.referralCase.findUnique({ where: { id }, include: referralInclude });
  if (!referral) throw new NotFoundError("Referral not found.");
  return referral;
}

export type ReferralWithRelations = Awaited<ReturnType<typeof getReferralOrThrow>>;

export async function getReferralByCodeOrToken(codeOrToken: string) {
  const referral = await db.referralCase.findFirst({
    where: { OR: [{ referralCode: codeOrToken }, { passportToken: codeOrToken }] },
    include: referralInclude,
  });
  if (!referral) throw new NotFoundError("Referral not found.");
  return referral;
}

export async function acceptReferral(referralId: string, actor: User) {
  const referral = await getReferralOrThrow(referralId);
  if (!canActOnReceivingFacility(actor, referral)) throw new ForbiddenError();
  const toStatus = transition(asStatus(referral.status), "ACKNOWLEDGED");
  const now = new Date();
  await db.referralCase.update({
    where: { id: referralId },
    data: { status: toStatus, acknowledgedAt: now, operationalStatus: "ON_TRACK" },
  });
  await db.administrativeTask.updateMany({
    where: { referralId, title: "Receiving facility acknowledgment" },
    data: { status: "COMPLETE" },
  });
  await logEvent(referralId, actor, "REFERRAL_ACCEPTED", referral.status, toStatus);
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "ReferralCase",
    entityId: referralId,
    action: "REFERRAL_ACCEPTED",
    oldValue: { status: referral.status },
    newValue: { status: toStatus },
  });
  await notifyFromTemplate({
    userId: referral.referringDoctorId,
    templateKey: "REFERRAL_ACCEPTED_DOCTOR",
    vars: { facilityName: referral.receivingFacility.name, referralCode: referral.referralCode },
    referralId,
  });
  return getReferralOrThrow(referralId);
}

export async function requestClarification(referralId: string, actor: User, note: string) {
  const referral = await getReferralOrThrow(referralId);
  if (!canActOnReceivingFacility(actor, referral)) throw new ForbiddenError();
  await db.administrativeTask.create({
    data: { referralId, title: "Clarification requested", category: "clarification", status: "NEEDS_REVIEW" },
  });
  await logEvent(referralId, actor, "CLARIFICATION_REQUESTED", referral.status, referral.status, note);
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "ReferralCase",
    entityId: referralId,
    action: "CLARIFICATION_REQUESTED",
    newValue: { note },
  });
  await notifyFromTemplate({
    userId: referral.referringDoctorId,
    templateKey: "CLARIFICATION_REQUESTED_DOCTOR",
    vars: { facilityName: referral.receivingFacility.name, referralCode: referral.referralCode, note },
    referralId,
  });
  return getReferralOrThrow(referralId);
}

export async function declineReferral(referralId: string, actor: User, reason: string) {
  const referral = await getReferralOrThrow(referralId);
  if (!canActOnReceivingFacility(actor, referral)) throw new ForbiddenError();
  const toStatus = overrideTransition(asStatus(referral.status), "CANCELLED", reason);
  await db.referralCase.update({
    where: { id: referralId },
    data: { status: toStatus, cancelledAt: new Date(), operationalStatus: "CLOSED" },
  });
  await logEvent(referralId, actor, "REFERRAL_DECLINED", referral.status, toStatus, reason);
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "ReferralCase",
    entityId: referralId,
    action: "REFERRAL_DECLINED",
    oldValue: { status: referral.status },
    newValue: { status: toStatus, reason },
  });
  await notifyFromTemplate({
    userId: referral.referringDoctorId,
    templateKey: "REFERRAL_DECLINED_DOCTOR",
    vars: { facilityName: referral.receivingFacility.name, referralCode: referral.referralCode, reason },
    referralId,
  });
  return getReferralOrThrow(referralId);
}

export async function requestTransport(referralId: string, actor: User) {
  const referral = await getReferralOrThrow(referralId);
  if (!canActOnReceivingFacility(actor, referral) && !canActOnReferringFacility(actor, referral)) {
    throw new ForbiddenError();
  }
  const toStatus = transition(asStatus(referral.status), "TRANSPORT_REQUESTED");
  await db.$transaction([
    db.referralCase.update({ where: { id: referralId }, data: { status: toStatus, operationalStatus: "ON_TRACK" } }),
    db.transportRequest.create({
      data: {
        referralId,
        status: "REQUESTED",
        pickupFacilityId: referral.referringFacilityId,
        destinationFacilityId: referral.receivingFacilityId,
      },
    }),
  ]);
  await logEvent(referralId, actor, "TRANSPORT_REQUESTED", referral.status, toStatus);
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "ReferralCase",
    entityId: referralId,
    action: "TRANSPORT_REQUESTED",
  });
  return getReferralOrThrow(referralId);
}

export async function assignTransport(
  referralId: string,
  actor: User,
  vehiclePseudo: string,
  etaMinutes: number
) {
  const referral = await getReferralOrThrow(referralId);
  if (!canActOnReceivingFacility(actor, referral) && !canActOnReferringFacility(actor, referral)) {
    throw new ForbiddenError();
  }
  const transportRequest = referral.transportRequests[0];
  if (!transportRequest) throw new ConflictError("No transport request exists for this referral.");
  const toStatus = transition(asStatus(referral.status), "TRANSPORT_ASSIGNED");
  await db.$transaction([
    db.referralCase.update({ where: { id: referralId }, data: { status: toStatus, operationalStatus: "ON_TRACK" } }),
    db.transportRequest.update({
      where: { id: transportRequest.id },
      data: { status: "ASSIGNED", assignedVehiclePseudo: vehiclePseudo, etaMinutes },
    }),
    db.administrativeTask.updateMany({
      where: { referralId, title: "Transport documentation" },
      data: { status: "COMPLETE" },
    }),
  ]);
  await logEvent(referralId, actor, "TRANSPORT_ASSIGNED", referral.status, toStatus, `Vehicle ${vehiclePseudo}, ETA ${etaMinutes}m (demo mode)`);
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "TransportRequest",
    entityId: transportRequest.id,
    action: "TRANSPORT_ASSIGNED",
  });
  const patient = await db.patient.findUnique({ where: { id: referral.patientId } });
  await notifyFromTemplate({
    userId: referral.referringDoctorId,
    templateKey: "TRANSPORT_ASSIGNED_DOCTOR",
    vars: { patientPseudonym: patient?.pseudonym ?? "the patient", referralCode: referral.referralCode },
    referralId,
  });
  return getReferralOrThrow(referralId);
}

export async function updateTransportProgress(
  referralId: string,
  actor: User,
  transportStatus: "EN_ROUTE_TO_PICKUP" | "PICKED_UP" | "IN_TRANSIT"
) {
  const referral = await getReferralOrThrow(referralId);
  if (!canActOnReceivingFacility(actor, referral) && !canActOnReferringFacility(actor, referral)) {
    throw new ForbiddenError();
  }
  const transportRequest = referral.transportRequests[0];
  if (!transportRequest) throw new ConflictError("No transport request exists for this referral.");

  await db.transportRequest.update({ where: { id: transportRequest.id }, data: { status: transportStatus } });

  if (transportStatus === "IN_TRANSIT" && canTransition(asStatus(referral.status), "IN_TRANSIT")) {
    const toStatus = transition(asStatus(referral.status), "IN_TRANSIT");
    await db.referralCase.update({ where: { id: referralId }, data: { status: toStatus, operationalStatus: "ON_TRACK" } });
    await logEvent(referralId, actor, "PATIENT_IN_TRANSIT", referral.status, toStatus);
  } else {
    await logEvent(referralId, actor, `TRANSPORT_${transportStatus}`, referral.status, referral.status);
  }
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "TransportRequest",
    entityId: transportRequest.id,
    action: `TRANSPORT_${transportStatus}`,
  });
  return getReferralOrThrow(referralId);
}

export async function confirmArrival(referralId: string, actor: User) {
  const referral = await getReferralOrThrow(referralId);
  if (!canActOnReceivingFacility(actor, referral)) throw new ForbiddenError();
  const arrivedStatus = transition(asStatus(referral.status), "ARRIVED");
  const now = new Date();
  await db.referralCase.update({
    where: { id: referralId },
    data: { status: "UNDER_CARE", arrivedAt: now, operationalStatus: "ON_TRACK" },
  });
  if (referral.transportRequests[0]) {
    await db.transportRequest.update({ where: { id: referral.transportRequests[0].id }, data: { status: "ARRIVED" } });
  }
  await logEvent(referralId, actor, "PATIENT_ARRIVED", referral.status, arrivedStatus, "Arrival confirmed.");
  await logEvent(referralId, actor, "UNDER_CARE", arrivedStatus, "UNDER_CARE", "Patient is now under the receiving facility's care.");
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "ReferralCase",
    entityId: referralId,
    action: "ARRIVAL_CONFIRMED",
  });
  await notifyFromTemplate({
    userId: referral.referringDoctorId,
    templateKey: "PATIENT_ARRIVED_DOCTOR",
    vars: { facilityName: referral.receivingFacility.name, referralCode: referral.referralCode },
    referralId,
  });
  return getReferralOrThrow(referralId);
}

/** Records discharge *coordination* -- administrative handoff bookkeeping
 * only. This never represents, checks, or implies medical fitness for
 * discharge; that decision is made by clinical staff outside this system
 * and is simply recorded here as having happened, via `note`. `destination`
 * is required (spec: discharge destination / next-care location) so the
 * receiving facility always records where the patient is going next. */
export async function dischargeCase(referralId: string, actor: User, input: { destination: string; note?: string }) {
  const referral = await getReferralOrThrow(referralId);
  if (!canActOnReceivingFacility(actor, referral)) throw new ForbiddenError();
  const toStatus = transition(asStatus(referral.status), "DISCHARGED");
  const now = new Date();
  await db.$transaction([
    db.referralCase.update({
      where: { id: referralId },
      data: { status: toStatus, dischargedAt: now, dischargeDestination: input.destination, operationalStatus: "ON_TRACK" },
    }),
    db.administrativeTask.updateMany({
      where: { referralId, title: "Discharge documentation" },
      data: { status: "COMPLETE" },
    }),
  ]);
  const incompleteTasks = getIncompleteAdminTasks(referral.adminTasks);
  await logEvent(
    referralId,
    actor,
    "DISCHARGE_CREATED",
    referral.status,
    toStatus,
    input.note ? `Discharge coordination recorded -- destination: ${input.destination}. ${input.note}` : `Discharge coordination recorded -- destination: ${input.destination}`
  );
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "ReferralCase",
    entityId: referralId,
    action: "DISCHARGE_CREATED",
    newValue: { destination: input.destination },
    metadata: incompleteTasks.length > 0 ? { incompleteAdminTaskTitles: incompleteTasks.map((t) => t.title) } : undefined,
  });
  await notifyFromTemplate({
    userId: referral.referringDoctorId,
    templateKey: "PATIENT_DISCHARGED_DOCTOR",
    vars: { referralCode: referral.referralCode, facilityName: referral.receivingFacility.name, destination: input.destination },
    referralId,
  });
  return getReferralOrThrow(referralId);
}

/** Creates and sends a back-referral to the origin (referring) facility.
 * This is the "notified" step of the closed loop
 * (created -> notified -> acknowledged -> follow-up assigned) -- it
 * deliberately stops here and does NOT create follow-up tasks or move the
 * referral to FOLLOW_UP_PENDING; that only happens once the origin
 * facility acknowledges receipt (see acknowledgeBackReferral below). If a
 * patient portal account or an active caregiver is linked to this case,
 * they're notified directly and `familyNotified` reflects that a
 * family-facing notification actually went out -- previously this field
 * was hardcoded `true` regardless of whether anyone who could plausibly
 * be "the family" was ever notified. */
export async function generateAndSendBackReferral(
  referralId: string,
  actor: User,
  input: { dischargeSummary: string }
) {
  const referral = await getReferralOrThrow(referralId);
  if (!canActOnReceivingFacility(actor, referral)) throw new ForbiddenError();
  const toStatus = transition(asStatus(referral.status), "BACK_REFERRED");
  const pendingAdminItems = referral.adminTasks.filter((t) => t.status === "PENDING" || t.status === "NEEDS_REVIEW").map((t) => t.title);
  const documentPackage = referral.documents.filter((d) => d.status === "CONFIRMED").map((d) => d.type);
  const now = new Date();

  const familyUserIds = new Set<string>();
  if (referral.patient.userId) familyUserIds.add(referral.patient.userId);
  const caregivers = await db.caregiverAccess.findMany({ where: { patientId: referral.patientId, revokedAt: null } });
  for (const c of caregivers) familyUserIds.add(c.userId);
  const familyNotified = familyUserIds.size > 0;

  await db.$transaction(async (tx) => {
    await tx.referralCase.update({ where: { id: referralId }, data: { status: toStatus, backReferredAt: now, operationalStatus: "ON_TRACK" } });
    await tx.backReferral.create({
      data: {
        referralId,
        sentAt: now,
        dischargeSummary: input.dischargeSummary,
        pendingAdminItems: JSON.stringify(pendingAdminItems),
        documentPackage: JSON.stringify(documentPackage),
        familyNotified,
      },
    });
  });

  await logEvent(referralId, actor, "BACK_REFERRAL_CREATED", "DISCHARGED", "BACK_REFERRED", input.dischargeSummary);
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "ReferralCase",
    entityId: referralId,
    action: "BACK_REFERRAL_CREATED",
    metadata: { familyNotified },
  });

  const notifications: Parameters<typeof notifyManyFromTemplate>[0] = [
    {
      userId: referral.referringDoctorId,
      templateKey: "BACK_REFERRAL_COMPLETED_DOCTOR",
      vars: { referralCode: referral.referralCode },
      referralId,
    },
  ];
  for (const userId of familyUserIds) {
    notifications.push({
      userId,
      templateKey: "BACK_REFERRAL_FAMILY_NOTICE",
      vars: { referralCode: referral.referralCode },
      referralId,
    });
  }
  await notifyManyFromTemplate(notifications);

  return getReferralOrThrow(referralId);
}

/** Closes the "acknowledged" gap in the back-referral loop: someone at the
 * *origin* (referring) facility confirms they've received the
 * back-referral, at which point follow-up tasks (near-term handoffs, plus
 * the newborn continuity schedule if this case has a linked newborn) are
 * created and the referral moves to FOLLOW_UP_PENDING. Idempotent --
 * calling this twice on an already-acknowledged back-referral is a
 * ConflictError, not a silent no-op or a duplicate task set. */
export async function acknowledgeBackReferral(referralId: string, actor: User, input: { followUpAssigneeId?: string }) {
  const referral = await getReferralOrThrow(referralId);
  if (!canActOnReferringFacility(actor, referral)) throw new ForbiddenError();
  if (!referral.backReferral) throw new NotFoundError("No back-referral exists for this case yet.");
  if (referral.backReferral.acknowledgedAt) throw new ConflictError("This back-referral has already been acknowledged.");

  const now = new Date();
  const followUpStatus = transition(asStatus(referral.status), "FOLLOW_UP_PENDING");
  const activeMilestoneTemplates = referral.patient.familyCase?.newbornCase
    ? await db.newbornMilestoneTemplate.findMany({ where: { active: true }, orderBy: { offsetDays: "asc" } })
    : [];
  const pendingAdminItems: string[] = JSON.parse(referral.backReferral.pendingAdminItems || "[]");
  const maternalFollowUpDueDays = await getMaternalFollowUpDueDays();

  await db.$transaction(async (tx) => {
    await tx.referralCase.update({ where: { id: referralId }, data: { status: followUpStatus } });
    await tx.backReferral.update({
      where: { id: referral.backReferral!.id },
      data: { acknowledgedAt: now, acknowledgedById: actor.id, assignedFollowUpId: input.followUpAssigneeId },
    });

    const dueDate = new Date(now.getTime() + maternalFollowUpDueDays * 24 * 60 * 60 * 1000);
    await tx.followUpTask.create({
      data: {
        referralId,
        title: "Discharge handoff acknowledgement",
        description: "Confirm the family has received discharge and follow-up information.",
        category: "DISCHARGE_HANDOFF",
        assignedToId: input.followUpAssigneeId,
        dueDate,
        status: "PENDING",
        source: "back_referral",
        createdById: actor.id,
      },
    });
    if (pendingAdminItems.length > 0) {
      await tx.followUpTask.create({
        data: {
          referralId,
          title: "Administrative application follow-up",
          description: `Follow up on: ${pendingAdminItems.join(", ")}`,
          category: "ADMIN_FOLLOW_UP",
          assignedToId: input.followUpAssigneeId,
          dueDate,
          status: "PENDING",
          source: "back_referral",
          createdById: actor.id,
        },
      });
    }

    // Newborn six-to-eight-month continuity journey (spec section 30): only
    // scheduled when this referral has a linked newborn case. Purely
    // administrative reminders/check-ins -- see newbornContinuity.ts.
    if (referral.patient.familyCase?.newbornCase && activeMilestoneTemplates.length > 0) {
      const milestones = buildNewbornContinuityTasks(now, activeMilestoneTemplates);
      for (const milestone of milestones) {
        await tx.followUpTask.create({
          data: {
            referralId,
            title: milestone.title,
            description: milestone.description,
            category: milestone.category,
            assignedToId: input.followUpAssigneeId,
            dueDate: milestone.dueDate,
            status: "PENDING",
            source: "newborn_continuity",
            createdById: actor.id,
          },
        });
      }
    }
  });

  await logEvent(referralId, actor, "BACK_REFERRAL_ACKNOWLEDGED", "BACK_REFERRED", "BACK_REFERRED", "Origin facility acknowledged the back-referral.");
  await logEvent(referralId, actor, "FOLLOW_UP_ASSIGNED", "BACK_REFERRED", "FOLLOW_UP_PENDING");
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "BackReferral",
    entityId: referral.backReferral.id,
    action: "BACK_REFERRAL_ACKNOWLEDGED",
  });

  const notifications: Parameters<typeof notifyManyFromTemplate>[0] = [];
  const receivingCoordinators = await findReceivingCoordinators(referral.receivingFacilityId);
  for (const c of receivingCoordinators) {
    notifications.push({
      userId: c.id,
      templateKey: "BACK_REFERRAL_ACKNOWLEDGED_COORDINATOR",
      vars: { referralCode: referral.referralCode },
      referralId,
    });
  }
  if (input.followUpAssigneeId) {
    notifications.push({
      userId: input.followUpAssigneeId,
      templateKey: "FOLLOW_UP_ASSIGNED_WORKER",
      vars: { referralCode: referral.referralCode },
      referralId,
    });
  }
  if (notifications.length > 0) await notifyManyFromTemplate(notifications);

  return getReferralOrThrow(referralId);
}

/** Shared by completeFollowUpTask and skipFollowUpTask: once a follow-up
 * task leaves referralId's open set (COMPLETED or CANCELLED/skipped are
 * both fine -- only PENDING/DUE/OVERDUE block closure), check whether that
 * was the last one and, if so, close the referral. */
async function closeReferralIfFollowUpComplete(referralId: string, actor: User, completionAction: string, note?: string) {
  const remaining = await db.followUpTask.count({
    where: { referralId, status: { in: OPEN_FOLLOW_UP_STATUSES } },
  });
  const referral = await getReferralOrThrow(referralId);
  if (remaining === 0 && referral.status === "FOLLOW_UP_PENDING") {
    const now = new Date();
    const confirmedStatus = transition(asStatus(referral.status), "FOLLOW_UP_CONFIRMED");
    const closedStatus = transition(confirmedStatus, "CLOSED");
    await db.referralCase.update({
      where: { id: referral.id },
      data: { status: closedStatus, closedAt: now, operationalStatus: "CLOSED" },
    });
    await logEvent(referral.id, actor, completionAction, "FOLLOW_UP_PENDING", confirmedStatus, note);
    await logEvent(referral.id, actor, "REFERRAL_CLOSED", confirmedStatus, closedStatus, "All follow-up tasks completed or skipped.");
    await recordAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "ReferralCase",
      entityId: referral.id,
      action: "REFERRAL_CLOSED",
    });
    await notifyFromTemplate({
      userId: referral.referringDoctorId,
      templateKey: "REFERRAL_CLOSED_DOCTOR",
      vars: { referralCode: referral.referralCode },
      referralId: referral.id,
    });
  }
}

export async function completeFollowUpTask(taskId: string, actor: User, note?: string) {
  const task = await db.followUpTask.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError("Follow-up task not found.");
  // canCompleteFollowUpTask is also what the UI uses to decide whether to
  // show the "Mark complete" button -- enforcing it here too (not only in
  // the route) means a FOLLOWUP worker can never complete a task assigned
  // to someone else by calling the API directly, regardless of what the
  // client sends.
  if (!canCompleteFollowUpTask(task, actor.role, actor.id)) {
    throw new ForbiddenError("You are not authorized to complete this follow-up task.");
  }
  // canCompleteFollowUpTask scopes a FOLLOWUP worker correctly via
  // assignedToId, but for COORDINATOR/ADMIN it only checks role -- without
  // this, a coordinator at an unrelated facility could complete a task on a
  // referral they could never even view via GET /api/referrals/[id]
  // (which enforces canAccessReferral). ADMIN still bypasses via
  // canActOnReceivingFacility's own ADMIN check.
  if (actor.role !== "FOLLOWUP") {
    const referral = await getReferralOrThrow(task.referralId);
    if (!canActOnReceivingFacility(actor, referral) && !canActOnReferringFacility(actor, referral)) {
      throw new ForbiddenError("You are not authorized to complete this follow-up task.");
    }
  }
  await db.followUpTask.update({
    where: { id: taskId },
    data: { status: "COMPLETED", completedAt: new Date(), resolvedById: actor.id, resolutionNote: note },
  });
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "FollowUpTask",
    entityId: taskId,
    action: "FOLLOW_UP_COMPLETED",
    metadata: note ? { note } : undefined,
  });
  await closeReferralIfFollowUpComplete(task.referralId, actor, "FOLLOW_UP_COMPLETED", note);
  return getReferralOrThrow(task.referralId);
}

/** Marks a follow-up task "skipped" (status CANCELLED) instead of
 * completed -- e.g. the family relocated, or a milestone no longer
 * applies. Deliberately narrower than completion: see canSkipFollowUpTask.
 * A reason is required and always audit-logged, same convention as
 * adminOverrideStatus. */
export async function skipFollowUpTask(taskId: string, actor: User, reason: string) {
  const task = await db.followUpTask.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError("Follow-up task not found.");
  if (!canSkipFollowUpTask(task, actor.role)) {
    throw new ForbiddenError("You are not authorized to skip this follow-up task.");
  }
  // Only COORDINATOR/ADMIN can ever reach this point (canSkipFollowUpTask
  // excludes FOLLOWUP entirely) -- same cross-facility gap as
  // completeFollowUpTask above, so always facility-check here.
  const referral = await getReferralOrThrow(task.referralId);
  if (!canActOnReceivingFacility(actor, referral) && !canActOnReferringFacility(actor, referral)) {
    throw new ForbiddenError("You are not authorized to skip this follow-up task.");
  }
  await db.followUpTask.update({
    where: { id: taskId },
    data: { status: "CANCELLED", resolvedById: actor.id, resolutionNote: reason },
  });
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "FollowUpTask",
    entityId: taskId,
    action: "FOLLOW_UP_SKIPPED",
    metadata: { reason },
  });
  await closeReferralIfFollowUpComplete(task.referralId, actor, "FOLLOW_UP_SKIPPED", reason);
  return getReferralOrThrow(task.referralId);
}

/** Applies one of the Referral Rescue Engine's suggested actions (spec
 * section 13) to a STUCK referral. This is deliberately a coordination
 * nudge, not a workflow transition -- it never changes `status` itself,
 * only records what the care team did and (for RETRY_NOTIFICATION /
 * ESCALATE_COORDINATOR) re-notifies the receiving facility's coordinators.
 * CONTACT_FACILITY and ALTERNATE_FACILITY are logged the same way but
 * don't have anything to automate: contacting a facility is an
 * out-of-band phone call, and switching facilities is a bigger workflow
 * decision this doesn't make unilaterally. */
export async function applyRescueAction(referralId: string, actor: User, action: RescueActionId, note?: string) {
  const referral = await getReferralOrThrow(referralId);
  if (!canActOnReceivingFacility(actor, referral) && !canActOnReferringFacility(actor, referral)) {
    throw new ForbiddenError();
  }
  const label = RESCUE_ACTIONS.find((a) => a.id === action)?.label ?? action;

  await logEvent(referralId, actor, "RESCUE_ACTION_APPLIED", referral.status, referral.status, note ? `${label} -- ${note}` : label);
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "ReferralCase",
    entityId: referralId,
    action: "RESCUE_ACTION_APPLIED",
    metadata: { rescueAction: action, note },
  });

  if (action === "RETRY_NOTIFICATION" || action === "ESCALATE_COORDINATOR") {
    const coordinators = await findReceivingCoordinators(referral.receivingFacilityId);
    await notifyManyFromTemplate(
      coordinators.map((c) => ({
        userId: c.id,
        templateKey: "RESCUE_ESCALATION_COORDINATOR",
        vars: { referralCode: referral.referralCode, reason: note || label },
        referralId,
      }))
    );
  }

  return getReferralOrThrow(referralId);
}

/** ADMIN-only escape hatch for correcting a referral's status outside the
 * normal workflow graph (spec section 52). Two safeguards on top of the
 * base `overrideTransition` check:
 *
 * 1. Forcing straight to CLOSED goes through the same closure-completeness
 *    check the normal auto-close path (`closeReferralIfFollowUpComplete`)
 *    enforces -- outstanding follow-up tasks, admin/document tasks, or an
 *    unacknowledged back-referral all block the override unless the actor
 *    explicitly passes `confirmOutstanding: true` after seeing them (the
 *    UI surfaces `getClosureBlockers` before letting them confirm). This
 *    closes the gap flagged in the Stage 9 audit: previously this path
 *    could silently force-close a referral with nothing else checked.
 * 2. Moving away from a terminal status (CLOSED/CANCELLED) is logged and
 *    audited as an explicit "REFERRAL_REOPENED" action, distinct from a
 *    normal override, so reopening a closed case is always visible as
 *    exactly that in the timeline and audit trail. */
export async function adminOverrideStatus(
  referralId: string,
  actor: User,
  toStatus: string,
  reason: string,
  confirmOutstanding = false
) {
  const referral = await getReferralOrThrow(referralId);
  const fromStatus = asStatus(referral.status);
  const newStatus = overrideTransition(fromStatus, toStatus as ReferralStatus, reason);

  if (newStatus === "CLOSED") {
    const blockers = getClosureBlockers(referral);
    if (blockers.length > 0 && !confirmOutstanding) {
      throw new ConflictError(
        `This referral has unresolved items: ${blockers.map((b) => b.message).join(" ")} Pass confirmOutstanding to close anyway.`,
        { blockers }
      );
    }
  }

  const isReopening = isTerminalStatus(fromStatus);
  const action = isReopening ? "REFERRAL_REOPENED" : "ADMIN_OVERRIDE";

  await db.referralCase.update({
    where: { id: referralId },
    data: { status: newStatus, ...(newStatus === "CLOSED" ? { closedAt: new Date(), operationalStatus: "CLOSED" } : {}) },
  });
  await logEvent(referralId, actor, action, referral.status, newStatus, reason);
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "ReferralCase",
    entityId: referralId,
    action,
    oldValue: { status: referral.status },
    newValue: { status: newStatus, reason },
  });
  return getReferralOrThrow(referralId);
}

/** Explicit, human-initiated case closure -- distinct from the automatic
 * closure that fires the moment the last follow-up task is completed or
 * skipped (`closeReferralIfFollowUpComplete`), and from the ADMIN-only
 * `adminOverrideStatus` escape hatch. This is the ordinary path a
 * coordinator or referring doctor uses to close a case that either side
 * of the referral considers done: it can be called at any non-terminal
 * status, always requires a reason, and always runs the same
 * `getClosureBlockers` check -- unresolved follow-ups, incomplete
 * admin/document tasks, or an unacknowledged back-referral all require an
 * explicit `confirmOutstanding: true` to close over, so nothing is ever
 * closed with outstanding items by accident. Refuses outright if the
 * referral is already CLOSED or CANCELLED (no duplicate closure). */
export async function closeCase(referralId: string, actor: User, reason: string, confirmOutstanding = false) {
  const referral = await getReferralOrThrow(referralId);
  if (!canActOnReceivingFacility(actor, referral) && !canActOnReferringFacility(actor, referral)) {
    throw new ForbiddenError("You are not authorized to close this referral.");
  }
  if (!reason || reason.trim().length === 0) {
    throw new Error("Closing a case requires a non-empty reason.");
  }
  const fromStatus = asStatus(referral.status);
  if (isTerminalStatus(fromStatus)) {
    throw new ConflictError("This referral is already closed or cancelled.");
  }

  const blockers = getClosureBlockers(referral);
  if (blockers.length > 0 && !confirmOutstanding) {
    throw new ConflictError(
      `This referral has unresolved items: ${blockers.map((b) => b.message).join(" ")} Pass confirmOutstanding to close anyway.`,
      { blockers }
    );
  }

  const newStatus = overrideTransition(fromStatus, "CLOSED", reason);
  const now = new Date();
  await db.referralCase.update({
    where: { id: referralId },
    data: { status: newStatus, closedAt: now, operationalStatus: "CLOSED" },
  });
  await logEvent(referralId, actor, "REFERRAL_CLOSED", referral.status, newStatus, reason);
  await recordAuditEvent({
    actorId: actor.id,
    actorRole: actor.role,
    entityType: "ReferralCase",
    entityId: referralId,
    action: "REFERRAL_CLOSED",
    oldValue: { status: referral.status },
    newValue: { status: newStatus, reason, closedWithOutstandingItems: blockers.length > 0 ? blockers : undefined },
  });
  await notifyFromTemplate({
    userId: referral.referringDoctorId,
    templateKey: "REFERRAL_CLOSED_DOCTOR",
    vars: { referralCode: referral.referralCode },
    referralId: referral.id,
  });
  return getReferralOrThrow(referralId);
}
